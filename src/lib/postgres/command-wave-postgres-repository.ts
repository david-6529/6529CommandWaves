import { createHash } from "node:crypto";
import { Pool, type QueryResult, type QueryResultRow } from "pg";
import type {
  CommandProposal,
  CommandWave,
  CommandWaveRules,
  ExecutionRecord,
  GuardianReview,
  LedgerEvent,
  PollState,
} from "../command-waves";
import type { CommandWaveRepository } from "../command-wave-repository";

export type PostgresQueryClient = {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, values?: unknown[]): Promise<QueryResult<T>>;
};

let pool: Pool | null = null;

function getPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw Object.assign(new Error("DATABASE_URL is required for Postgres command-wave storage."), { status: 503 });
  }

  pool ??= new Pool({ connectionString });

  return pool;
}

function normalizeWaveId(value: string) {
  const urlMatch = value.match(/\/waves\/([^/?#\s]+)/);

  return (urlMatch?.[1] ?? value).trim();
}

function stableJsonHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function executionId(proposalId: string) {
  return `execution-${proposalId}`;
}

function reviewId(proposalId: string) {
  return `review-${proposalId}`;
}

function pollId(proposalId: string) {
  return `poll-${proposalId}`;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function withTransaction<T>(client: PostgresQueryClient, work: () => Promise<T>) {
  await client.query("begin");

  try {
    const result = await work();

    await client.query("commit");

    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function upsertCommandWave(client: PostgresQueryClient, wave: CommandWave) {
  await client.query(
    `
      insert into command_waves (id, name, wave_id, wave_url, repo_url, gates_json, active_rules_version, updated_at)
      values ($1, $2, $3, $4, $5, $6::jsonb, $7, now())
      on conflict (id) do update set
        name = excluded.name,
        wave_id = excluded.wave_id,
        wave_url = excluded.wave_url,
        repo_url = excluded.repo_url,
        gates_json = excluded.gates_json,
        active_rules_version = excluded.active_rules_version,
        updated_at = now()
    `,
    [
      wave.id,
      wave.name,
      normalizeWaveId(wave.waveUrl),
      wave.waveUrl,
      wave.repoUrl,
      JSON.stringify(wave.gates),
      wave.rules.version,
    ],
  );
}

async function upsertRules(client: PostgresQueryClient, wave: CommandWave) {
  const rulesHash = stableJsonHash(wave.rules);

  await client.query(
    `
      insert into command_wave_rules (id, command_wave_id, version, rules_json, rules_hash, created_by)
      values ($1, $2, $3, $4::jsonb, $5, $6)
      on conflict (command_wave_id, version) do nothing
    `,
    [`rules-${wave.id}-${wave.rules.version}`, wave.id, wave.rules.version, JSON.stringify(wave.rules), rulesHash, "system"],
  );
}

async function upsertProposal(client: PostgresQueryClient, wave: CommandWave, proposal: CommandProposal) {
  await client.query(
    `
      insert into command_proposals (
        id, command_wave_id, title, proposer, kind, risk, prompt, spec, budget_usd, status, rules_version, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
      on conflict (id) do update set
        title = excluded.title,
        proposer = excluded.proposer,
        kind = excluded.kind,
        risk = excluded.risk,
        prompt = excluded.prompt,
        spec = excluded.spec,
        budget_usd = excluded.budget_usd,
        status = excluded.status,
        rules_version = excluded.rules_version,
        updated_at = now()
    `,
    [
      proposal.id,
      wave.id,
      proposal.title,
      proposal.proposer,
      proposal.kind,
      proposal.risk,
      proposal.prompt,
      proposal.spec,
      proposal.budgetUsd,
      proposal.status,
      wave.rules.version,
    ],
  );
}

async function upsertPoll(client: PostgresQueryClient, poll: PollState) {
  await client.query(
    `
      insert into command_polls (
        id, proposal_id, yes_votes, no_votes, quorum_required, yes_percent_required, status, closed_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, case when $7 in ('passed', 'failed') then now() else null end)
      on conflict (proposal_id) do update set
        yes_votes = excluded.yes_votes,
        no_votes = excluded.no_votes,
        quorum_required = excluded.quorum_required,
        yes_percent_required = excluded.yes_percent_required,
        status = excluded.status,
        closed_at = excluded.closed_at
    `,
    [
      pollId(poll.proposalId),
      poll.proposalId,
      poll.yesVotes,
      poll.noVotes,
      poll.quorumRequired,
      poll.yesPercentRequired,
      poll.status,
    ],
  );

  await client.query("delete from command_votes where poll_id = $1", [pollId(poll.proposalId)]);

  for (const vote of poll.votes ?? []) {
    await client.query(
      `
        insert into command_votes (id, poll_id, voter_identity, vote, weight, source, created_at)
        values ($1, $2, $3, $4, $5, $6, $7::timestamptz)
        on conflict (poll_id, voter_identity) do update set
          vote = excluded.vote,
          weight = excluded.weight,
          source = excluded.source,
          created_at = excluded.created_at
      `,
      [
        `vote-${poll.proposalId}-${vote.voterIdentity}`,
        pollId(poll.proposalId),
        vote.voterIdentity,
        vote.vote,
        vote.weight,
        vote.source,
        vote.at,
      ],
    );
  }
}

async function upsertExecution(client: PostgresQueryClient, execution: ExecutionRecord) {
  await client.query(
    `
      insert into command_executions (id, proposal_id, harness, status, summary, artifacts_json, finished_at)
      values ($1, $2, $3, $4, $5, $6::jsonb, case when $4 = 'complete' then now() else null end)
      on conflict (id) do update set
        harness = excluded.harness,
        status = excluded.status,
        summary = excluded.summary,
        artifacts_json = excluded.artifacts_json,
        finished_at = excluded.finished_at
    `,
    [
      executionId(execution.proposalId),
      execution.proposalId,
      execution.harness,
      execution.status,
      execution.summary,
      JSON.stringify(execution.artifacts),
    ],
  );
}

async function upsertReview(client: PostgresQueryClient, review: GuardianReview) {
  await client.query(
    `
      insert into guardian_reviews (id, proposal_id, execution_id, status, checks_json, summary, reviewer)
      values ($1, $2, $3, $4, $5::jsonb, $6, $7)
      on conflict (id) do update set
        execution_id = excluded.execution_id,
        status = excluded.status,
        checks_json = excluded.checks_json,
        summary = excluded.summary,
        reviewer = excluded.reviewer
    `,
    [
      reviewId(review.proposalId),
      review.proposalId,
      executionId(review.proposalId),
      review.status,
      JSON.stringify(review.checks),
      review.summary,
      "reviewer-agent",
    ],
  );
}

async function upsertLedgerEvent(client: PostgresQueryClient, waveId: string, event: LedgerEvent) {
  await client.query(
    `
      insert into command_ledger_events (id, command_wave_id, actor, type, message, created_at)
      values ($1, $2, $3, $4, $5, $6::timestamptz)
      on conflict (id) do nothing
    `,
    [event.id, waveId, event.actor, event.type, event.message, event.at],
  );
}

function rowJsonArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function commandWaveFromRows(params: {
  waveRow: QueryResultRow;
  rulesRow: QueryResultRow | undefined;
  proposalRows: QueryResultRow[];
  pollRows: QueryResultRow[];
  voteRows: QueryResultRow[];
  executionRows: QueryResultRow[];
  reviewRows: QueryResultRow[];
  ledgerRows: QueryResultRow[];
}): CommandWave {
  const rulesJson = asRecord(params.rulesRow?.rules_json);
  const pollByProposal = new Map(params.pollRows.map((row) => [String(row.proposal_id), row]));
  const votesByPoll = new Map<string, QueryResultRow[]>();

  for (const row of params.voteRows) {
    const pollIdValue = String(row.poll_id);
    const votes = votesByPoll.get(pollIdValue) ?? [];

    votes.push(row);
    votesByPoll.set(pollIdValue, votes);
  }

  return {
    id: String(params.waveRow.id),
    name: String(params.waveRow.name),
    waveUrl: String(params.waveRow.wave_url),
    repoUrl: String(params.waveRow.repo_url),
    gates: rowJsonArray(params.waveRow.gates_json).map(String),
    rules: rulesJson as CommandWaveRules,
    proposals: params.proposalRows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      proposer: String(row.proposer),
      kind: row.kind as CommandProposal["kind"],
      risk: row.risk as CommandProposal["risk"],
      prompt: String(row.prompt),
      spec: String(row.spec),
      budgetUsd: Number(row.budget_usd),
      status: row.status as CommandProposal["status"],
    })),
    polls: [...pollByProposal.values()].map((row) => ({
      proposalId: String(row.proposal_id),
      yesVotes: Number(row.yes_votes),
      noVotes: Number(row.no_votes),
      quorumRequired: Number(row.quorum_required),
      yesPercentRequired: Number(row.yes_percent_required),
      status: row.status as PollState["status"],
      votes: (votesByPoll.get(String(row.id)) ?? []).map((voteRow) => ({
        voterIdentity: String(voteRow.voter_identity),
        vote: voteRow.vote === "no" ? "no" : "yes",
        weight: Number(voteRow.weight),
        source: voteRow.source === "6529" || voteRow.source === "manual" ? voteRow.source : "local",
        at: new Date(voteRow.created_at as string | number | Date).toISOString(),
      })),
    })),
    executions: params.executionRows.map((row) => ({
      proposalId: String(row.proposal_id),
      harness: row.harness as ExecutionRecord["harness"],
      status: row.status as ExecutionRecord["status"],
      summary: String(row.summary),
      artifacts: rowJsonArray(row.artifacts_json).map(String),
    })),
    reviews: params.reviewRows.map((row) => ({
      proposalId: String(row.proposal_id),
      status: row.status as GuardianReview["status"],
      checks: rowJsonArray(row.checks_json).map(String),
      summary: String(row.summary),
    })),
    ledger: params.ledgerRows.map((row) => ({
      id: String(row.id),
      at: new Date(row.created_at as string | number | Date).toISOString(),
      actor: String(row.actor),
      type: row.type as LedgerEvent["type"],
      message: String(row.message),
    })),
  };
}

export async function saveCommandWaveToPostgres(client: PostgresQueryClient, wave: CommandWave) {
  await withTransaction(client, async () => {
    await upsertCommandWave(client, wave);
    await upsertRules(client, wave);

    for (const proposal of wave.proposals) {
      await upsertProposal(client, wave, proposal);
    }

    for (const poll of wave.polls) {
      await upsertPoll(client, poll);
    }

    for (const execution of wave.executions) {
      await upsertExecution(client, execution);
    }

    for (const review of wave.reviews) {
      await upsertReview(client, review);
    }

    for (const event of wave.ledger) {
      await upsertLedgerEvent(client, wave.id, event);
    }
  });
}

export async function loadCommandWaveFromPostgres(client: PostgresQueryClient) {
  const waveResult = await client.query("select * from command_waves order by updated_at desc limit 1");
  const waveRow = waveResult.rows[0];

  if (!waveRow) {
    return null;
  }

  const rulesResult = await client.query(
    "select * from command_wave_rules where command_wave_id = $1 and version = $2 limit 1",
    [waveRow.id, waveRow.active_rules_version],
  );
  const proposalResult = await client.query(
    "select * from command_proposals where command_wave_id = $1 order by created_at desc, id desc",
    [waveRow.id],
  );
  const proposalIds = proposalResult.rows.map((row) => String(row.id));
  const pollResult = proposalIds.length
    ? await client.query("select * from command_polls where proposal_id = any($1::text[])", [proposalIds])
    : { rows: [] };
  const pollIds = pollResult.rows.map((row) => String(row.id));
  const voteResult = pollIds.length
    ? await client.query("select * from command_votes where poll_id = any($1::text[]) order by created_at desc", [pollIds])
    : { rows: [] };
  const executionResult = proposalIds.length
    ? await client.query("select * from command_executions where proposal_id = any($1::text[])", [proposalIds])
    : { rows: [] };
  const reviewResult = proposalIds.length
    ? await client.query("select * from guardian_reviews where proposal_id = any($1::text[]) order by created_at desc", [proposalIds])
    : { rows: [] };
  const ledgerResult = await client.query(
    "select * from command_ledger_events where command_wave_id = $1 order by created_at desc",
    [waveRow.id],
  );

  return commandWaveFromRows({
    waveRow,
    rulesRow: rulesResult.rows[0],
    proposalRows: proposalResult.rows,
    pollRows: pollResult.rows,
    voteRows: voteResult.rows,
    executionRows: executionResult.rows,
    reviewRows: reviewResult.rows,
    ledgerRows: ledgerResult.rows,
  });
}

export async function deleteCommandWaveFromPostgres(client: PostgresQueryClient) {
  await client.query("delete from command_waves");
}

export function postgresCommandWaveRepository(client: PostgresQueryClient = getPool()): CommandWaveRepository {
  return {
    mode: "postgres",
    load: () => loadCommandWaveFromPostgres(client),
    save: (wave) => saveCommandWaveToPostgres(client, wave),
    delete: () => deleteCommandWaveFromPostgres(client),
  };
}
