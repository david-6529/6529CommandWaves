import { createWaveDecisionReceipt, type CommandProposal, type CommandWave, type PollState } from "./command-waves";
import { githubRepoPlaceholder } from "./agent-identities";
import { isPlaceholderValue } from "./env-placeholders";

const builtInHookProposalId = "cmd-001";
const builtInHookWaveId = "cw-6529-hook-builder";
const builtInHookWavePath = "/waves/6529-hook-builder";
const oldConcretePilotRepo = "6529-collections/6529-hook";
const builtInHookPrompt = "Draft the non-upgradeable AMM hook scaffold with fee parameters capped at 100 bps and tests.";
const builtInHookSpec =
  "Smart contract work only. No proxy, no delegatecall, no deploy script, no payments, and no governance changes. Include tests for the 100 bps fee cap.";

export function isBuiltInPlaceholderHookProject(wave: CommandWave) {
  return isBuiltInHookPilot(wave) && isPlaceholderValue(wave.repoUrl);
}

function isBuiltInHookPilot(wave: CommandWave) {
  return wave.id === builtInHookWaveId && wave.waveUrl.includes(builtInHookWavePath);
}

function usesOldConcretePilotRepo(wave: CommandWave) {
  return wave.repoUrl.trim().toLowerCase().includes(oldConcretePilotRepo);
}

function hasSeededCodeEvidence(wave: CommandWave) {
  return Boolean(
    wave.executions.some(
      (execution) =>
        execution.proposalId === builtInHookProposalId &&
        (execution.summary.includes("approved hook scaffold command") ||
          execution.summary.includes("hook scaffold and parameter-bound tests")),
    ) ||
      wave.reviews.some(
        (review) =>
          review.proposalId === builtInHookProposalId &&
          (review.summary.includes("approved hook proposal") ||
            review.summary.includes("matched the vote and stayed inside the approved non-upgradeable hook scope")),
      ) ||
      wave.ledger.some(
        (event) =>
          event.message.includes("Built cmd-001 through Codex and opened PR #12") ||
          event.message.includes("The hook scaffold matched the vote and rules"),
      ),
  );
}

function normalizeBuiltInRepoPlaceholder(wave: CommandWave) {
  if (!isBuiltInHookPilot(wave) || !usesOldConcretePilotRepo(wave) || !hasSeededCodeEvidence(wave)) {
    return wave;
  }

  return {
    ...wave,
    repoUrl: githubRepoPlaceholder.url,
  };
}

function sanitizeBuiltInProposal(proposal: CommandProposal) {
  if (proposal.id !== builtInHookProposalId) {
    return proposal;
  }

  const prompt =
    proposal.prompt.includes("bounded fee parameters") || proposal.prompt.includes("Use Codex to draft")
      ? builtInHookPrompt
      : proposal.prompt;

  return {
    ...proposal,
    prompt,
    spec: proposal.spec.includes("parameter bounds") ? builtInHookSpec : proposal.spec,
    status:
      proposal.kind === "open_pr" && ["reviewing", "complete"].includes(proposal.status)
        ? "approved"
        : proposal.status,
  };
}

function sanitizeBuiltInPoll(poll: PollState, waveUrl: string) {
  if (poll.proposalId !== builtInHookProposalId || poll.decision) {
    return poll;
  }

  return {
    ...poll,
    decision: createWaveDecisionReceipt({
      proposalId: builtInHookProposalId,
      reference: "https://6529.io/waves/6529-hook-builder/drops/drop-cmd-001-approval",
      waveUrl,
      recordedBy: "david",
      recordedAt: "2026-06-20T12:40:30.000Z",
      summary: "Project decision approved cmd-001 with 5 yes and 1 no.",
    }),
  };
}

export function withPlaceholderRepoSetupState(wave: CommandWave): CommandWave {
  const nextWave = normalizeBuiltInRepoPlaceholder(wave);

  if (!isBuiltInPlaceholderHookProject(nextWave)) {
    return nextWave;
  }

  return {
    ...nextWave,
    proposals: nextWave.proposals.map(sanitizeBuiltInProposal),
    polls: nextWave.polls.map((poll) => sanitizeBuiltInPoll(poll, nextWave.waveUrl)),
    executions: [],
    reviews: [],
    ledger: nextWave.ledger
      .filter((event) => !["execution_logged", "guardian_reviewed"].includes(event.type))
      .map((event) =>
        event.type === "wave_created"
          ? {
              ...event,
              message: "Created the hook build with project chat. GitHub repo setup is still needed.",
            }
          : event,
      ),
  };
}
