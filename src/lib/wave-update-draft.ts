import type { CommandProposal, CommandWave, ExecutionRecord, GuardianReview, PollState } from "./command-waves";
import { createContributionReport } from "./contribution-report";
import { createDeveloperFeePlan } from "./developer-fee-plan";

function decisionReference(poll: PollState) {
  return poll.decision?.url ?? poll.decision?.dropId ?? "recorded";
}

function pollLine(poll: PollState | null) {
  if (!poll) {
    return "Decision: no vote required by current rules.";
  }

  if (poll.decision) {
    return `Decision: ${poll.status} with ${poll.yesVotes} yes, ${poll.noVotes} no, receipt ${decisionReference(poll)}.`;
  }

  return `Decision: ${poll.status} with ${poll.yesVotes} yes, ${poll.noVotes} no, quorum ${poll.quorumRequired}, yes threshold ${poll.yesPercentRequired}%.`;
}

function buildLine(poll: PollState | null, execution: ExecutionRecord | null) {
  if (!execution) {
    if (poll?.status === "passed" && !poll.decision) {
      return "Build: waiting for a recorded wave decision.";
    }

    return "Build: waiting for an approved PR command.";
  }

  return `Build: ${execution.status}. ${execution.summary}`;
}

function reviewLine(review: GuardianReview | null) {
  if (!review) {
    return "Review: waiting for execution evidence.";
  }

  return `Review: ${review.status}. ${review.summary}`;
}

function contributorLine(wave: CommandWave) {
  const report = createContributionReport(wave, { limit: 3 });

  if (!report.contributors.length) {
    return `Contribution report: ${report.summary} No visible contributors yet. Scores are informational only.`;
  }

  const contributors = report.contributors
    .map((contributor) => `${contributor.identity} score ${contributor.score}`)
    .join(", ");

  return `Contribution report: ${report.summary} Visible contributors: ${contributors}. Scores are informational only.`;
}

function developerFeeLine(wave: CommandWave) {
  const report = createContributionReport(wave);
  const plan = createDeveloperFeePlan(wave, report);

  return `Developer fee plan: ${plan.summary} No automatic payouts.`;
}

export function createWaveUpdateDraft({
  wave,
  proposal,
  poll,
  execution,
  review,
}: {
  wave: CommandWave;
  proposal: CommandProposal | null;
  poll: PollState | null;
  execution: ExecutionRecord | null;
  review: GuardianReview | null;
}) {
  return [
    "6529 Hook Builder update",
    "",
    `Wave: ${wave.waveUrl}`,
    `Repo: ${wave.repoUrl}`,
    proposal ? `Command: ${proposal.id} - ${proposal.title}` : "Command: none selected yet.",
    proposal ? `Status: ${proposal.status}` : "Status: setup",
    pollLine(poll),
    buildLine(poll, execution),
    reviewLine(review),
    "Guardrails: humans keep merge, deploy, payment, and governance authority. The hook is immutable by default with capped parameters only when explicitly approved.",
    contributorLine(wave),
    developerFeeLine(wave),
    "Next step: review this draft, then post it in the builder wave if it matches the work.",
  ].join("\n");
}
