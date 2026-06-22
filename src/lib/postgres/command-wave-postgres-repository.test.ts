import { describe, expect, it } from "vitest";
import type { QueryResult, QueryResultRow } from "pg";
import { demoWave } from "../command-waves";
import {
  loadCommandWaveFromPostgres,
  saveCommandWaveToPostgres,
  type PostgresQueryClient,
} from "./command-wave-postgres-repository";

type RecordedQuery = {
  sql: string;
  values?: unknown[];
};

function result<T extends QueryResultRow = QueryResultRow>(rows: T[]): QueryResult<T> {
  return {
    command: "SELECT",
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  };
}

function fakeClient(resolver?: (query: RecordedQuery) => QueryResultRow[]) {
  const queries: RecordedQuery[] = [];
  const client: PostgresQueryClient = {
    async query<T extends QueryResultRow = QueryResultRow>(sql: string, values?: unknown[]) {
      const query = { sql: sql.trim().replace(/\s+/g, " "), values };

      queries.push(query);

      return result<T>((resolver?.(query) ?? []) as T[]);
    },
  };

  return { client, queries };
}

describe("Postgres command wave repository", () => {
  it("saves a command wave through a transaction and normalized table upserts", async () => {
    const { client, queries } = fakeClient();

    await saveCommandWaveToPostgres(client, demoWave);

    expect(queries[0]?.sql).toBe("begin");
    expect(queries.at(-1)?.sql).toBe("commit");
    expect(queries.some((query) => query.sql.includes("insert into command_waves"))).toBe(true);
    expect(queries.some((query) => query.sql.includes("insert into command_wave_rules"))).toBe(true);
    expect(queries.some((query) => query.sql.includes("insert into command_proposals"))).toBe(true);
    expect(queries.some((query) => query.sql.includes("insert into command_polls"))).toBe(true);
    expect(queries.some((query) => query.sql.includes("insert into command_votes"))).toBe(true);
    expect(queries.some((query) => query.sql.includes("insert into command_executions"))).toBe(true);
    expect(queries.some((query) => query.sql.includes("insert into guardian_reviews"))).toBe(true);
    expect(queries.some((query) => query.sql.includes("insert into command_ledger_events"))).toBe(true);
  });

  it("rolls back when a Postgres write fails", async () => {
    const client: PostgresQueryClient = {
      async query<T extends QueryResultRow = QueryResultRow>(sql: string) {
        if (sql.includes("command_waves")) {
          throw new Error("write failed");
        }

        return result<T>([]);
      },
    };

    await expect(saveCommandWaveToPostgres(client, demoWave)).rejects.toThrow("write failed");
  });

  it("loads a command wave from normalized rows", async () => {
    const { client } = fakeClient((query) => {
      if (query.sql.startsWith("select * from command_waves")) {
        return [
          {
            id: demoWave.id,
            name: demoWave.name,
            wave_url: demoWave.waveUrl,
            repo_url: demoWave.repoUrl,
            gates_json: demoWave.gates,
            active_rules_version: demoWave.rules.version,
          },
        ];
      }

      if (query.sql.startsWith("select * from command_wave_rules")) {
        return [{ rules_json: demoWave.rules }];
      }

      if (query.sql.startsWith("select * from command_proposals")) {
        return [
          {
            id: "cmd-001",
            title: "Demo command",
            proposer: "david",
            kind: "open_pr",
            risk: "medium",
            prompt: "Build it.",
            spec: "Stay in scope.",
            budget_usd: "2",
            status: "approved",
          },
        ];
      }

      if (query.sql.startsWith("select * from command_polls")) {
        return [
          {
            proposal_id: "cmd-001",
            id: "poll-cmd-001",
            yes_votes: 5,
            no_votes: 1,
            quorum_required: 3,
            yes_percent_required: 60,
            status: "passed",
          },
        ];
      }

      if (query.sql.startsWith("select * from command_votes")) {
        return [
          {
            poll_id: "poll-cmd-001",
            voter_identity: "david",
            vote: "yes",
            weight: "1",
            source: "local",
            created_at: "2026-06-20T12:10:00.000Z",
          },
        ];
      }

      if (query.sql.startsWith("select * from command_executions")) {
        return [
          {
            proposal_id: "cmd-001",
            harness: "codex",
            status: "complete",
            summary: "Done.",
            artifacts_json: ["PR #1"],
          },
        ];
      }

      if (query.sql.startsWith("select * from guardian_reviews")) {
        return [
          {
            proposal_id: "cmd-001",
            status: "pass",
            checks_json: ["Matched scope"],
            proof_json: {
              version: "guardian-attestation-v0.1",
              verifier: "Command Waves Guardian",
              verifierVersion: "command-wave-reviewer-gate-v0.1",
              mode: "deterministic",
              inputs: {
                waveId: "demo-command-wave",
                proposalId: "cmd-001",
                waveStateHash: "f".repeat(64),
                proposalHash: "1".repeat(64),
                pollHash: "2".repeat(64),
                manifestHash: "a".repeat(64),
                changedPathsHash: "b".repeat(64),
                rulesHash: "c".repeat(64),
              },
              resultHash: "d".repeat(64),
              attestationHash: "e".repeat(64),
            },
            summary: "Passed.",
          },
        ];
      }

      if (query.sql.startsWith("select * from command_ledger_events")) {
        return [
          {
            id: "evt-001",
            created_at: "2026-06-20T12:00:00.000Z",
            actor: "Setup",
            type: "wave_created",
            message: "Created.",
          },
        ];
      }

      return [];
    });

    const wave = await loadCommandWaveFromPostgres(client);

    expect(wave).toMatchObject({
      id: demoWave.id,
      name: demoWave.name,
      proposals: [{ id: "cmd-001", title: "Demo command" }],
      polls: [{ proposalId: "cmd-001", status: "passed", votes: [{ voterIdentity: "david", vote: "yes" }] }],
      executions: [{ proposalId: "cmd-001", artifacts: ["PR #1"] }],
      reviews: [{ proposalId: "cmd-001", checks: ["Matched scope"], proof: { attestationHash: "e".repeat(64) } }],
      ledger: [{ id: "evt-001", actor: "Setup" }],
    });
  });
});
