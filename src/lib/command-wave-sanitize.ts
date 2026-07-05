import { createWaveDecisionReceipt, type CommandProposal, type CommandWave, type PollState } from "./command-waves";
import { isPlaceholderValue } from "./env-placeholders";

const builtInHookProposalId = "cmd-001";
const builtInHookPrompt = "Use Codex to draft a non-upgradeable 6529 hook scaffold with fee parameters capped at 100 bps and tests.";
const builtInHookSpec =
  "Smart contract work only. No proxy, no delegatecall, no deploy script, no payments, and no governance changes. Include tests for the 100 bps fee cap.";

export function isBuiltInPlaceholderHookProject(wave: CommandWave) {
  return wave.id === "cw-6529-hook-builder" && wave.waveUrl.includes("/waves/6529-hook-builder") && isPlaceholderValue(wave.repoUrl);
}

function sanitizeBuiltInProposal(proposal: CommandProposal) {
  if (proposal.id !== builtInHookProposalId) {
    return proposal;
  }

  return {
    ...proposal,
    prompt: proposal.prompt.includes("bounded fee parameters") ? builtInHookPrompt : proposal.prompt,
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
  if (!isBuiltInPlaceholderHookProject(wave)) {
    return wave;
  }

  return {
    ...wave,
    proposals: wave.proposals.map(sanitizeBuiltInProposal),
    polls: wave.polls.map((poll) => sanitizeBuiltInPoll(poll, wave.waveUrl)),
    executions: [],
    reviews: [],
    ledger: wave.ledger
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
