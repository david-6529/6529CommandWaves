import type { CommandProposal, CommandWave, ExecutionRecord, GuardianReview, LedgerEvent, PollState } from "./command-waves";

export type WavePostInput = {
  waveUrl: string;
  body: string;
  replyToDropId?: string;
};

export type WavePostResult = {
  dropId: string;
  url: string;
};

export type RepoPullRequestInput = {
  repoUrl: string;
  title: string;
  body: string;
  branchName: string;
  baseBranch?: string;
  draft?: boolean;
  maintainerCanModify?: boolean;
};

export type RepoPullRequestResult = {
  prNumber: number;
  url: string;
  headSha: string;
};

export type OrchestratorRunInput = {
  wave: CommandWave;
  proposal: CommandProposal;
  poll: PollState | null;
};

export type GuardianReviewInput = {
  wave: CommandWave;
  proposal: CommandProposal;
  execution: ExecutionRecord;
};

export type WaveAdapter = {
  post(input: WavePostInput): Promise<WavePostResult>;
};

export type RepoAdapter = {
  openPullRequest(input: RepoPullRequestInput): Promise<RepoPullRequestResult>;
};

export type OrchestratorAdapter = {
  execute(input: OrchestratorRunInput): Promise<ExecutionRecord>;
};

export type GuardianAdapter = {
  review(input: GuardianReviewInput): Promise<GuardianReview>;
};

export type LedgerAdapter = {
  append(event: Omit<LedgerEvent, "id" | "at">): Promise<LedgerEvent>;
};

export function formatProposalForWave(proposal: CommandProposal, poll: PollState | null) {
  const pollText = poll
    ? `Vote required: quorum ${poll.quorumRequired}, yes ${poll.yesPercentRequired}%.`
    : "No vote required by current rules.";
  const decisionText = poll?.decision
    ? `Decision receipt: ${poll.decision.dropId ?? poll.decision.url ?? "recorded"} (${poll.decision.source}).`
    : null;

  return [
    `Command proposal ${proposal.id}: ${proposal.title}`,
    "",
    `Type: ${proposal.kind}`,
    `Risk: ${proposal.risk}`,
    `Budget cap: $${proposal.budgetUsd}`,
    pollText,
    ...(decisionText ? [decisionText] : []),
    "",
    "Prompt:",
    proposal.prompt,
    "",
    "Limits and success criteria:",
    proposal.spec,
  ].join("\n");
}

export function formatExecutionForWave(execution: ExecutionRecord) {
  return [
    `Run for ${execution.proposalId}: ${execution.status}`,
    "",
    `Tool: ${execution.harness}`,
    execution.summary,
    "",
    "Artifacts:",
    ...execution.artifacts.map((artifact) => `- ${artifact}`),
  ].join("\n");
}

export function formatGuardianReviewForWave(review: GuardianReview) {
  return [
    `Review for ${review.proposalId}: ${review.status}`,
    "",
    review.summary,
    "",
    "Checks:",
    ...review.checks.map((check) => `- ${check}`),
  ].join("\n");
}
