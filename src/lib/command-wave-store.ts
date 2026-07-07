import { getConfiguredGuardianAdapter, getConfiguredOrchestratorAdapter, getConfiguredRepoAdapter } from "./configured-adapters";
import { getCommandWavePersistencePath, loadPersistedCommandWave, savePersistedCommandWave } from "./command-wave-persistence";
import { withPlaceholderRepoSetupState } from "./command-wave-sanitize";
import { applyInitialCommandWaveProject, hasInitialCommandWaveProject } from "./command-wave-seed";
import { demoWave } from "./demo-wave";
import { parseExecutionFiles } from "./execution-files";
import { gitHubPullRequestUrlsForRepo } from "./github/pr-evidence";
import { createHookProposalPreflight } from "./hook-proposal-preflight";
import { humanizeLegacyCommandCopy } from "./legacy-copy";
import { defaultParticipationGates, normalizeParticipationGates } from "./participation-gates";
import { validateSetupShape } from "./setup-validation";
import {
  classifyRisk,
  createWaveDecisionReceipt,
  defaultRules,
  evaluateGate,
  evaluatePoll,
  pollApprovalPassedForWave,
  validateWaveDecisionReference,
  type CommandKind,
  type CommandProposal,
  type CommandVote,
  type CommandWave,
  type GuardianReview,
  type LedgerEvent,
  type PollState,
} from "./command-waves";

const guardianCheckRunName = "Command Waves Guardian";
const maxReviewCommentLength = 8000;

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
const firstPhaseCommandKinds = new Set<CommandKind>(["read_context", "draft_response", "post_to_wave", "open_pr"]);
const parkedCommandKinds: CommandKind[] = ["run_script", "deploy", "spend_money", "change_rules"];

function cloneDemoWave(): CommandWave {
  return JSON.parse(JSON.stringify(demoWave)) as CommandWave;
}

function initialCommandWave() {
  return applyInitialCommandWaveProject(cloneDemoWave());
}

function pullRequestNumberFromUrl(value: string) {
  const match = value.match(/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/(\d+)(?:[?#][^\s]*)?$/);
  const prNumber = Number(match?.[1]);

  return Number.isInteger(prNumber) && prNumber > 0 ? prNumber : null;
}

function headShaFromExecution(execution: { artifacts: string[] }) {
  const value = execution.artifacts.find((artifact) => artifact.startsWith("head "))?.slice("head ".length).trim();

  return value || null;
}

function boundedReviewComment(review: GuardianReview) {
  const proofLine = review.proof ? `Proof: ${review.proof.attestationHash}` : "Proof: not recorded";
  const lines = [
    `Command Waves review for ${review.proposalId}: ${review.status}`,
    "",
    review.summary,
    "",
    proofLine,
    "",
    "Checks:",
    ...review.checks.map((check) => `- ${check}`),
  ];
  const body = lines.join("\n");

  return body.length <= maxReviewCommentLength ? body : `${body.slice(0, maxReviewCommentLength - 24)}\n\nTruncated for length.`;
}

function checkRunConclusion(status: GuardianReview["status"]) {
  if (status === "pass") {
    return "success" as const;
  }

  if (status === "changes_requested") {
    return "action_required" as const;
  }

  return "failure" as const;
}

function checkRunSummary(review: GuardianReview) {
  return [
    review.summary,
    review.proof ? `Proof: ${review.proof.attestationHash}` : "Proof: not recorded",
    "",
    ...review.checks.slice(0, 12).map((check) => `- ${check}`),
  ].join("\n");
}

async function annotatePullRequestReview({
  execution,
  review,
  wave,
}: {
  execution: { artifacts: string[] };
  review: GuardianReview;
  wave: CommandWave;
}) {
  const prUrl = gitHubPullRequestUrlsForRepo(execution.artifacts, wave.repoUrl)[0] ?? null;
  const prNumber = prUrl ? pullRequestNumberFromUrl(prUrl) : null;
  const headSha = headShaFromExecution(execution);

  if (!prUrl || !prNumber) {
    throw Object.assign(new Error("A GitHub PR link for the configured repo is required before recording review evidence."), {
      status: 409,
    });
  }

  if (!headSha) {
    throw Object.assign(new Error("A PR head SHA is required before recording review evidence."), { status: 409 });
  }

  const repoAdapter = getConfiguredRepoAdapter();

  if (!repoAdapter.commentOnPullRequest) {
    throw Object.assign(new Error("Repo adapter must support commentOnPullRequest for review evidence."), { status: 503 });
  }

  if (!repoAdapter.createCheckRun) {
    throw Object.assign(new Error("Repo adapter must support createCheckRun for review evidence."), { status: 503 });
  }

  const comment = await repoAdapter.commentOnPullRequest({
    repoUrl: wave.repoUrl,
    prNumber,
    body: boundedReviewComment(review),
  });
  const checkRun = await repoAdapter.createCheckRun({
    repoUrl: wave.repoUrl,
    name: guardianCheckRunName,
    headSha,
    status: "completed",
    conclusion: checkRunConclusion(review.status),
    summary: checkRunSummary(review),
    detailsUrl: prUrl,
    externalId: review.proof?.attestationHash ?? `${review.proposalId}:${review.status}`,
  });

  return {
    ...review,
    checks: [...review.checks, `PR review comment recorded: ${comment.url}.`, `Review check run recorded: ${checkRun.url}.`],
  };
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

function isBuiltInHookProject(wave: CommandWave) {
  return (
    wave.id === demoWave.id &&
    wave.waveUrl.includes("/waves/6529-hook-builder") &&
    (wave.repoUrl.includes("/6529-hook") || wave.repoUrl.includes("/your-hook-repo"))
  );
}

function normalizeBuiltInHookGate(gate: string) {
  if (/^Builder wave allowlist for phase 1/i.test(gate)) {
    return defaultParticipationGates[0];
  }

  if (/^AI contribution scores are reports/i.test(gate)) {
    return defaultParticipationGates[2];
  }

  return humanizeLegacyCommandCopy(gate);
}

function withCurrentHookChatCopy(wave: CommandWave) {
  if (!isBuiltInHookProject(wave)) {
    return wave;
  }

  const nextWave: CommandWave = {
    ...wave,
    name: wave.name === "6529 Hook Builder" || wave.name === "6529 Hook Project" ? demoWave.name : wave.name,
    gates: wave.gates.map(normalizeBuiltInHookGate),
    polls: wave.polls.map((poll) => ({
      ...poll,
      decision: poll.decision
        ? {
            ...poll.decision,
            summary: humanizeLegacyCommandCopy(poll.decision.summary),
          }
        : poll.decision,
    })),
    executions: wave.executions.map((execution) => ({
      ...execution,
      summary: humanizeLegacyCommandCopy(execution.summary),
    })),
    reviews: wave.reviews.map((review) => ({
      ...review,
      summary: humanizeLegacyCommandCopy(review.summary),
      checks: review.checks.map(humanizeLegacyCommandCopy),
    })),
    ledger: wave.ledger.map((event) => ({
      ...event,
      actor: humanizeLegacyCommandCopy(event.actor),
      message: humanizeLegacyCommandCopy(event.message),
    })),
  };

  return JSON.stringify(nextWave) === JSON.stringify(wave) ? wave : nextWave;
}

function sameRule(left: CommandWave["rules"]["rulesByKind"][CommandKind], right: CommandWave["rules"]["rulesByKind"][CommandKind]) {
  return (
    left.mode === right.mode &&
    left.quorum === right.quorum &&
    left.yesPercent === right.yesPercent &&
    left.expiresHours === right.expiresHours &&
    left.reason === right.reason
  );
}

function withFirstPhaseRules(wave: CommandWave) {
  const rulesByKind = {
    ...defaultRules.rulesByKind,
    ...wave.rules.rulesByKind,
  };
  let changed = Object.keys(defaultRules.rulesByKind).some(
    (kind) => !wave.rules.rulesByKind[kind as CommandKind],
  );

  for (const kind of parkedCommandKinds) {
    if (!sameRule(rulesByKind[kind], defaultRules.rulesByKind[kind])) {
      changed = true;
    }

    rulesByKind[kind] = defaultRules.rulesByKind[kind];
  }

  const gates = normalizeParticipationGates(wave.gates, []);
  const gatesChanged =
    gates.length !== wave.gates.length || gates.some((gate: string, index: number) => gate !== wave.gates[index]);

  if (!changed && !gatesChanged) {
    return wave;
  }

  return {
    ...wave,
    gates,
    rules: {
      ...wave.rules,
      rulesByKind,
    },
  };
}

async function store() {
  const persistencePath = getCommandWavePersistencePath();

  if (!globalStore.__commandWaveStore || globalStore.__commandWaveStore.persistencePath !== persistencePath) {
    const persisted = await loadPersistedCommandWave();
    const migrated = migrateLegacyDemoWave(persisted);
    const baseWave = migrated ?? initialCommandWave();
    const seededWave = migrated && hasInitialCommandWaveProject() && isBuiltInHookProject(migrated)
      ? applyInitialCommandWaveProject(migrated)
      : baseWave;
    const wave = withPlaceholderRepoSetupState(withCurrentHookChatCopy(withFirstPhaseRules(seededWave)));

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

function assertFirstPhaseCommandKind(kind: CommandKind) {
  if (!firstPhaseCommandKinds.has(kind)) {
    throw Object.assign(
      new Error("This phase accepts only context reads, drafts, discussion updates, and PR commands."),
      { status: 400 },
    );
  }
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
  const currentStore = await store();
  const wave = withPlaceholderRepoSetupState(withCurrentHookChatCopy(withFirstPhaseRules(currentStore.wave)));

  if (wave !== currentStore.wave) {
    await savePersistedCommandWave(wave);
    currentStore.wave = wave;
  }

  return currentStore.wave;
}

export function clearCommandWaveStoreForTests() {
  delete globalStore.__commandWaveStore;
}

export async function replaceCommandWave(wave: CommandWave) {
  const nextWave = withPlaceholderRepoSetupState(withCurrentHookChatCopy(withFirstPhaseRules(wave)));

  await savePersistedCommandWave(nextWave);
  (await store()).wave = nextWave;

  return (await store()).wave;
}

export async function resetCommandWave() {
  const wave = initialCommandWave();

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

  const gates = Object.hasOwn(body, "gates")
    ? normalizeParticipationGates(body.gates, [])
    : normalizeParticipationGates(wave.gates);
  const nextWave = appendLedger(
    {
      ...wave,
      waveUrl: `https://6529.io/waves/${validation.waveId}`,
      repoUrl: validation.repo?.htmlUrl ?? wave.repoUrl,
      gates,
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

  assertFirstPhaseCommandKind(kind);

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
  const nextWave = appendLedger(
    {
      ...wave,
      polls: updatedPolls,
      proposals: wave.proposals,
    },
    {
      actor: voterIdentity,
      type: passed ? "poll_passed" : "rule_check",
      message: passed
        ? `${proposal.id} local vote passed. Record the project decision receipt before work can run.`
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
    throw Object.assign(new Error("Project decision URL or drop id is required."), { status: 400 });
  }

  const referenceCheck = validateWaveDecisionReference({
    reference,
    waveUrl: wave.waveUrl,
    requireUrl: proposal.kind === "open_pr",
  });

  if (!referenceCheck.ok) {
    throw Object.assign(new Error(referenceCheck.message), { status: 400 });
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
      message: `Recorded project decision receipt for ${proposal.id}.`,
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

  if (proposal.kind !== "open_pr") {
    throw Object.assign(new Error("Only approved PR work can use the build step in phase 1."), { status: 409 });
  }

  const poll = wave.polls.find((item) => item.proposalId === proposalId) ?? null;

  if (!pollApprovalPassedForWave(poll, wave.waveUrl, { requireUrl: true })) {
    if (proposal.status === "approved" || poll?.status === "passed") {
      throw Object.assign(new Error("Record the project decision receipt before building PR work."), { status: 409 });
    }

    throw Object.assign(new Error("Proposal is not approved for execution."), { status: 409 });
  }

  if (proposal.status !== "approved") {
    throw Object.assign(new Error("Proposal is not approved for execution."), { status: 409 });
  }

  if (!validateSetupShape({ waveUrl: wave.waveUrl, repoUrl: wave.repoUrl }).canRunCode) {
    throw Object.assign(new Error("A valid GitHub repo is required before opening PR commands can run."), { status: 409 });
  }

  const files = parseExecutionFiles(body.files, proposal);
  const execution = await getConfiguredOrchestratorAdapter().execute({
    wave,
    proposal,
    poll,
    files,
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

  if (proposal.kind === "open_pr") {
    if (!validateSetupShape({ waveUrl: wave.waveUrl, repoUrl: wave.repoUrl }).canRunCode) {
      throw Object.assign(new Error("A valid GitHub repo is required before reviewing PR work."), { status: 409 });
    }

    if (!gitHubPullRequestUrlsForRepo(execution.artifacts, wave.repoUrl).length) {
      throw Object.assign(new Error("A GitHub PR link for the configured repo is required before review."), {
        status: 409,
      });
    }
  }

  const rawReview = await getConfiguredGuardianAdapter().review({ wave, proposal, execution });
  const review =
    proposal.kind === "open_pr"
      ? await annotatePullRequestReview({
          execution,
          review: rawReview,
          wave,
        })
      : rawReview;
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
