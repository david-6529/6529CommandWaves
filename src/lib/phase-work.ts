import type { CommandProposal, CommandWave, ExecutionRecord, GuardianReview, PollState } from "./command-waves";

export type PhaseWork = {
  prProposal: CommandProposal | null;
  prPoll: PollState | null;
  prExecution: ExecutionRecord | null;
  prReview: GuardianReview | null;
  supportProposals: CommandProposal[];
};

export function selectPhaseWork(wave: CommandWave): PhaseWork {
  const prProposals = wave.proposals.filter((item) => item.kind === "open_pr");
  const prProposal = prProposals.find((item) => item.status !== "complete") ?? prProposals[0] ?? null;

  return {
    prProposal,
    prPoll: prProposal ? (wave.polls.find((item) => item.proposalId === prProposal.id) ?? null) : null,
    prExecution: prProposal ? (wave.executions.find((item) => item.proposalId === prProposal.id) ?? null) : null,
    prReview: prProposal ? (wave.reviews.find((item) => item.proposalId === prProposal.id) ?? null) : null,
    supportProposals: wave.proposals.filter((item) => item.kind !== "open_pr"),
  };
}
