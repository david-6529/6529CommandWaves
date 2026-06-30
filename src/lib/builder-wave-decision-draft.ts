import type { CommandProposal, CommandWave, PollState } from "./command-waves";
import { commandKindLabel } from "./command-kind-copy";

export type BuilderWaveDecisionDraftInput = {
  wave: CommandWave;
  proposal: CommandProposal;
  poll: PollState | null;
};

function cleanLine(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function localTallyLine(poll: PollState | null) {
  if (!poll) {
    return "Local tally: not started in the app.";
  }

  return `Local tally: ${poll.yesVotes} yes, ${poll.noVotes} no. Local quorum ${poll.quorumRequired}, yes threshold ${poll.yesPercentRequired}%.`;
}

export function createBuilderWaveDecisionDraft({ wave, proposal, poll }: BuilderWaveDecisionDraftInput) {
  return [
    "6529 hook decision request",
    "",
    `6529 discussion: ${wave.waveUrl}`,
    `Code repo: ${wave.repoUrl}`,
    `Proposal: ${proposal.id} - ${cleanLine(proposal.title)}`,
    `Work type: ${commandKindLabel(proposal.kind)}`,
    "",
    "Request:",
    cleanLine(proposal.prompt),
    "",
    "Limits and success criteria:",
    cleanLine(proposal.spec),
    "",
    localTallyLine(poll),
    "",
    "Decision needed: approve, reject, or ask for edits in the 6529 discussion.",
    "If approved, link the 6529 decision drop URL back into the app before PR work starts.",
    "Guardrails: no deploy, payout, proxy, delegatecall, governance change, or uncapped parameter change in phase 1.",
  ].join("\n");
}
