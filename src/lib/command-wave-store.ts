import { getConfiguredGuardianAdapter, getConfiguredOrchestratorAdapter } from "./configured-adapters";
import { getCommandWavePersistencePath, loadPersistedCommandWave, savePersistedCommandWave } from "./command-wave-persistence";
import { demoWave } from "./demo-wave";
import { createHookProposalPreflight } from "./hook-proposal-preflight";
import { validateSetupShape } from "./setup-validation";
import {
  classifyRisk,
  createWaveDecisionReceipt,
  evaluateGate,
  evaluatePoll,
  type CommandKind,
  type CommandProposal,
  type CommandVote,
  type CommandWave,
  type LedgerEvent,
  type PollState,
} from "./command-waves";

type Store = {
  wave: CommandWave;
  persistencePath: string | null;
};

const globalStore = globalThis as typeof globalThis & {
  __commandWaveStore?: Store;
};

const previousHookDemoExecutionSummary =
  "Mock execution opened a PR with the hook scaffold and parameter-bound tests bound to the approved spec.";
const previousHookDemoReviewSummary =
  "Review passed. The work matched the vote and stayed inside the approved non-upgradeable hook scope.";

const commandKinds = new Set<CommandKind>([
  "read_context",
  "draft_response",
  "post_to_wave",
  "open_pr",
  "run_script",
  "deploy",
  "spend_money",
  "change_rules",
]);

function cloneDemoWave(): CommandWave {
  return JSON.parse(JSON.stringify(demoWave)) as CommandWave;
}

function isStaleBuiltInHookDemo(wave: CommandWave) {
  const proposal = wave.proposals[0] ?? null;
  const poll = wave.polls[0] ?? null;
  const execution = wave.executions[0] ?? null;
  const review = wave.reviews[0] ?? null;
  const oldHookPrompt = Boolean(
    proposal &&
      proposal.id === "cmd-001" &&
      (proposal.prompt.includes("bounded fee parameters") || proposal.spec.includes("parameter bounds")),
  );
  const missingDecisionReceipt = Boolean(poll && poll.proposalId === "cmd-001" && !poll.decision);
  const missingDeterministicEvidence = Boolean(
    execution &&
      review &&
      (!execution.artifacts.some((artifact) => artifact.startsWith("run-manifest:")) ||
        !execution.artifacts.some((artifact) => artifact.startsWith("agent-handoff:")) ||
        !review.proof),
  );

  const looksLikeBuiltInHookDemo = Boolean(
    wave.proposals.length === 1 &&
      proposal?.id === "cmd-001" &&
      wave.executions.length === 1 &&
      wave.reviews.length === 1 &&
      (execution?.summary === demoWave.executions[0]?.summary || execution?.summary === previousHookDemoExecutionSummary) &&
      (review?.summary === demoWave.reviews[0]?.summary || review?.summary === previousHookDemoReviewSummary),
  );

  return Boolean(looksLikeBuiltInHookDemo && (missingDeterministicEvidence || oldHookPrompt || missingDecisionReceipt));
}

function migrateLegacyDemoWave(wave: CommandWave | null) {
  if (
    wave &&
    (wave.id === "cw-6529-shipyard" ||
      wave.waveUrl.includes("/waves/demo-command-wave") ||
      wave.repoUrl.includes("/example-command-wave") ||
      (wave.id === demoWave.id &&
        wave.proposals.length === 1 &&
        wave.proposals[0]?.id === "cmd-001" &&
        (isStaleBuiltInHookDemo(wave) ||
          wave.executions.some((execution) => execution.summary.includes("copy-only")) ||
          wave.ledger.some((event) => event.message.includes("Command Waves Demo")))))
  ) {
    return cloneDemoWave();
  }

  return wave;
}

async function store() {
  const persistencePath = getCommandWavePersistencePath();

  if (!globalStore.__commandWaveStore || globalStore.__commandWaveStore.persistencePath !== persistencePath) {
    const persisted = await loadPersistedCommandWave();
    const wave = migrateLegacyDemoWave(persisted) ?? cloneDemoWave();

    if (persisted && wave !== persisted) {
      await savePersistedCommandWave(wave);
    }

    globalStore.__commandWaveStore = {
      wave,
      persistencePath,
    };
  }

  return globalStore.__commandWaveStore;
}

function nextId(prefix: string, count: number) {
  return `${prefix}-${String(count + 1).padStart(3, "0")}`;
}

function appendLedger(wave: CommandWave, event: Omit<LedgerEvent, "id" | "at">): CommandWave {
  return {
    ...wave,
    ledger: [
      {
        ...event,
        id: nextId("evt", wave.ledger.length),
        at: new Date().toISOString(),
      },
      ...wave.ledger,
    ],
  };
}

function isCommandKind(value: unknown): value is CommandKind {
  return typeof value === "string" && commandKinds.has(value as CommandKind);
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asBudget(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;

  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function initialProposalStatus(ruleMode: CommandWave["rules"]["rulesByKind"][CommandKind]["mode"]): CommandProposal["status"] {
  if (ruleMode === "auto") {
    return "approved";
  }

  if (ruleMode === "blocked") {
    return "rejected";
  }

  return "ready_for_vote";
}

export async function getCommandWave() {
  return (await store()).wave;
}

export function clearCommandWaveStoreForTests() {
  delete globalStore.__commandWaveStore;
}

export async function replaceCommandWave(wave: CommandWave) {
  await savePersistedCommandWave(wave);
  (await store()).wave = wave;

  return (await store()).wave;
}

export async function resetCommandWave() {
  const wave = cloneDemoWave();

  return replaceCommandWave(wave);
}

export async function updateCommandWaveSetup(input: unknown) {
  const body = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const wave = await getCommandWave();
  const validation = validateSetupShape({
    waveUrl: body.waveUrl,
    repoUrl: body.repoUrl,
  });

  if (!validation.canSave) {
    throw Object.assign(new Error("Fix the 6529 wave and GitHub repo before saving setup."), { status: 400 });
  }

  const nextWave = appendLedger(
    {
      ...wave,
      waveUrl: `https://6529.io/waves/${validation.waveId}`,
      repoUrl: validation.repo?.htmlUrl ?? wave.repoUrl,
    },
    {
      actor: "Setup",
      type: "rules_defined",
      message: `Updated setup to wave ${validation.waveId} and repo ${validation.repo?.owner}/${validation.repo?.repo}.`,
    },
  );

  return replaceCommandWave(nextWave);
}

export async function submitCommandProposal(input: unknown) {
  const body = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const wave = await getCommandWave();
  const kind = isCommandKind(body.kind) ? body.kind : "open_pr";
  const prompt = asText(body.prompt, "No prompt supplied.");
  const spec = asText(body.spec, "No execution spec supplied.");
  const hookPreflight = createHookProposalPreflight({ command: prompt, criteria: spec });

  if (kind === "open_pr" && hookPreflight.status === "fail") {
    const firstFailure = hookPreflight.checks.find((check) => check.status === "fail");

    throw Object.assign(
      new Error(`Fix hook proposal preflight before submitting PR work: ${firstFailure?.message ?? hookPreflight.summary}`),
      { status: 400 },
    );
  }

  const proposalId = nextId("cmd", wave.proposals.length);
  const ruleMode = wave.rules.rulesByKind[kind].mode;
  const proposal: CommandProposal = {
    id: proposalId,
    title: asText(body.title, "Untitled command"),
    proposer: asText(body.proposer, "unknown"),
    kind,
    risk: classifyRisk(kind, prompt),
    prompt,
    spec,
    budgetUsd: asBudget(body.budgetUsd),
    status: initialProposalStatus(ruleMode),
  };
  const gate = evaluateGate(proposal, wave.rules);
  const poll: PollState | null = gate.needsPoll
    ? {
        proposalId,
        yesVotes: 0,
        noVotes: 0,
        quorumRequired: gate.rule.quorum,
        yesPercentRequired: gate.rule.yesPercent,
        status: "open",
        votes: [],
      }
    : null;
  let nextWave: CommandWave = {
    ...wave,
    proposals: [proposal, ...wave.proposals],
    polls: poll ? [poll, ...wave.polls] : wave.polls,
  };

  nextWave = appendLedger(nextWave, {
    actor: proposal.proposer,
    type: "proposal_submitted",
    message: `Submitted ${proposal.id}: ${proposal.title}.`,
  });
  nextWave = appendLedger(nextWave, {
    actor: "Rule Engine",
    type: gate.needsPoll ? "poll_opened" : "rule_check",
    message: gate.blocked
      ? `${proposal.id} is blocked by current rules: ${gate.rule.reason}`
      : gate.needsPoll
        ? `${proposal.id} is ${proposal.risk} risk. Poll required: quorum ${gate.rule.quorum}, yes ${gate.rule.yesPercent}%.`
        : `${proposal.id} is ${proposal.risk} risk and can run without a vote.`,
  });

  return replaceCommandWave(nextWave);
}

export async function recordVote(input: unknown) {
  const body = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const proposalId = asText(body.proposalId);
  const voterIdentity = asText(body.voterIdentity);
  const vote = body.vote === "no" ? "no" : "yes";
  const wave = await getCommandWave();
  const proposal = wave.proposals.find((item) => item.id === proposalId);
  const poll = wave.polls.find((item) => item.proposalId === proposalId);

  if (!voterIdentity) {
    throw Object.assign(new Error("Voter identity is required."), { status: 400 });
  }

  if (!proposal || !poll) {
    throw Object.assign(new Error("Proposal poll not found."), { status: 404 });
  }

  if (poll.status !== "open") {
    throw Object.assign(new Error("Poll is not open."), { status: 409 });
  }

  if ((poll.votes ?? []).some((item) => item.voterIdentity === voterIdentity)) {
    throw Object.assign(new Error("Voter has already voted on this proposal."), { status: 409 });
  }

  const updatedPolls = wave.polls.map((item) => {
    if (item.proposalId !== proposalId) {
      return item;
    }

    const voteRecord: CommandVote = {
      voterIdentity,
      vote,
      weight: 1,
      source: "local" as const,
      at: new Date().toISOString(),
    };
    const nextPoll = {
      ...item,
      yesVotes: item.yesVotes + (vote === "yes" ? 1 : 0),
      noVotes: item.noVotes + (vote === "no" ? 1 : 0),
      votes: [voteRecord, ...(item.votes ?? [])],
    };
    const result = evaluatePoll(nextPoll);

    return {
      ...nextPoll,
      status: result.passed ? "passed" as const : nextPoll.status,
    };
  });
  const updatedPoll = updatedPolls.find((item) => item.proposalId === proposalId);
  const passed = updatedPoll ? evaluatePoll(updatedPoll).passed : false;
  const updatedProposals = wave.proposals.map((item) =>
    item.id === proposalId && passed ? { ...item, status: "approved" as const } : item,
  );
  const nextWave = appendLedger(
    {
      ...wave,
      polls: updatedPolls,
      proposals: updatedProposals,
    },
    {
      actor: voterIdentity,
      type: passed ? "poll_passed" : "rule_check",
      message: passed
        ? `${proposal.id} passed and is approved to run.`
        : `Recorded ${vote} vote from ${voterIdentity} for ${proposal.id}.`,
    },
  );

  return replaceCommandWave(nextWave);
}

export async function recordDecisionReceipt(input: unknown) {
  const body = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const proposalId = asText(body.proposalId);
  const reference = asText(body.reference);
  const recordedBy = asText(body.recordedBy, "manual reviewer");
  const summary = asText(body.summary);
  const wave = await getCommandWave();
  const proposal = wave.proposals.find((item) => item.id === proposalId);
  const poll = wave.polls.find((item) => item.proposalId === proposalId);

  if (!proposal || !poll) {
    throw Object.assign(new Error("Proposal poll not found."), { status: 404 });
  }

  if (!reference) {
    throw Object.assign(new Error("Wave decision URL or drop id is required."), { status: 400 });
  }

  const decision = createWaveDecisionReceipt({
    proposalId,
    reference,
    waveUrl: wave.waveUrl,
    recordedBy,
    summary,
  });
  const nextWave = appendLedger(
    {
      ...wave,
      polls: wave.polls.map((item) => (item.proposalId === proposalId ? { ...item, status: "passed" as const, decision } : item)),
      proposals: wave.proposals.map((item) =>
        item.id === proposalId && item.status !== "complete" ? { ...item, status: "approved" as const } : item,
      ),
    },
    {
      actor: recordedBy,
      type: "poll_passed",
      message: `Recorded wave decision receipt for ${proposal.id}.`,
    },
  );

  return replaceCommandWave(nextWave);
}

export async function executeProposal(input: unknown) {
  const body = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const proposalId = asText(body.proposalId);
  const wave = await getCommandWave();
  const proposal = wave.proposals.find((item) => item.id === proposalId);

  if (!proposal) {
    throw Object.assign(new Error("Proposal not found."), { status: 404 });
  }

  if (proposal.status !== "approved") {
    throw Object.assign(new Error("Proposal is not approved for execution."), { status: 409 });
  }

  if (proposal.kind !== "open_pr") {
    throw Object.assign(new Error("Only approved PR commands can use the agent build step in phase 1."), { status: 409 });
  }

  if (!validateSetupShape({ waveUrl: wave.waveUrl, repoUrl: wave.repoUrl }).canRunCode) {
    throw Object.assign(new Error("A valid GitHub repo is required before opening PR commands can run."), { status: 409 });
  }

  const execution = await getConfiguredOrchestratorAdapter().execute({
    wave,
    proposal,
    poll: wave.polls.find((item) => item.proposalId === proposalId) ?? null,
  });
  const nextWave = appendLedger(
    {
      ...wave,
      proposals: wave.proposals.map((item) => (item.id === proposalId ? { ...item, status: "reviewing" as const } : item)),
      executions: [execution, ...wave.executions.filter((item) => item.proposalId !== proposalId)],
    },
    {
      actor: "Agent",
      type: "execution_logged",
      message: `Ran ${proposal.id} through ${execution.harness}. Review is required before completion.`,
    },
  );

  return replaceCommandWave(nextWave);
}

export async function reviewProposal(input: unknown) {
  const body = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const proposalId = asText(body.proposalId);
  const wave = await getCommandWave();
  const proposal = wave.proposals.find((item) => item.id === proposalId);
  const execution = wave.executions.find((item) => item.proposalId === proposalId);

  if (!proposal || !execution) {
    throw Object.assign(new Error("Proposal execution not found."), { status: 404 });
  }

  if (proposal.status !== "reviewing") {
    throw Object.assign(new Error("Proposal is not ready for review."), { status: 409 });
  }

  if (execution.status !== "complete") {
    throw Object.assign(new Error("Proposal execution is not complete."), { status: 409 });
  }

  const review = await getConfiguredGuardianAdapter().review({ wave, proposal, execution });
  const nextWave = appendLedger(
    {
      ...wave,
      proposals: wave.proposals.map((item) =>
        item.id === proposalId && review.status === "pass" ? { ...item, status: "complete" as const } : item,
      ),
      reviews: [review, ...wave.reviews.filter((item) => item.proposalId !== proposalId)],
    },
    {
      actor: "Reviewer",
      type: "guardian_reviewed",
      message:
        review.status === "pass"
          ? `Review passed ${proposal.id}. Command is complete.`
          : `Review marked ${proposal.id} as ${review.status.replaceAll("_", " ")}.`,
    },
  );

  return replaceCommandWave(nextWave);
}
