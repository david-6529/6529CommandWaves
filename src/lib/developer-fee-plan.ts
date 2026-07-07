import type { CommandWave } from "./command-waves";
import type { ContributionReport } from "./contribution-report";
import { reviewAgentIdentity } from "./agent-identities";
import { guardianReviewProofBoundToConfiguredRepo } from "./guardian-review-proof";
import { gitHubPullRequestUrlsForRepo } from "./github/pr-evidence";
import { projectRepoLine } from "./project-repo-copy";

export type DeveloperFeePlan = {
  mode: "manual_review";
  summary: string;
  evidenceInputs: string[];
  requiredDecisions: string[];
  blockedActions: string[];
};

function reviewedPrLoopReadyCount(wave: CommandWave) {
  if (reviewAgentIdentity.status === "placeholder") {
    return 0;
  }

  return wave.reviews.filter((review) => {
    if (review.status !== "pass" || !guardianReviewProofBoundToConfiguredRepo(review, wave.repoUrl)) {
      return false;
    }

    const execution = wave.executions.find((item) => item.proposalId === review.proposalId);

    return execution ? gitHubPullRequestUrlsForRepo(execution.artifacts, wave.repoUrl).length > 0 : false;
  }).length;
}

export function createDeveloperFeePlan(wave: CommandWave, contributionReport: ContributionReport): DeveloperFeePlan {
  const reviewedWorkCount = reviewedPrLoopReadyCount(wave);
  const visibleContributorCount = contributionReport.contributors.length;
  const reviewedWorkLabel = reviewedWorkCount === 1 ? "reviewed PR loop" : "reviewed PR loops";
  const contributorLabel = visibleContributorCount === 1 ? "visible contributor" : "visible contributors";

  return {
    mode: "manual_review",
    summary: reviewedWorkCount
      ? `Manual fee planning can use ${reviewedWorkCount} ${reviewedWorkLabel} and ${visibleContributorCount} ${contributorLabel} as records.`
      : "Manual fee planning starts after the reviewed PR loop is ready.",
    evidenceInputs: [
      "Approved work and vote record.",
      "Reviewed PR loop record after reviewer process is selected.",
      "Contribution report rationale.",
      "Human review notes from chat.",
    ],
    requiredDecisions: [
      "Builders approve the fee budget before any payment.",
      "Humans choose recipients, amounts, token, and payment method.",
      "Payments happen outside this app in the first phase.",
    ],
    blockedActions: [
      "No automatic payouts.",
      "No wallet keys or treasury controls.",
      "No score-to-payment conversion without a separate vote.",
    ],
  };
}

function contributorLine(contributor: ContributionReport["contributors"][number]) {
  return `- ${contributor.identity}: report score ${contributor.score}; ${contributor.rationale.join(", ")}`;
}

export function createDeveloperFeePlanDraft(wave: CommandWave, contributionReport: ContributionReport) {
  const plan = createDeveloperFeePlan(wave, contributionReport);
  const contributors = contributionReport.contributors.length
    ? contributionReport.contributors.map(contributorLine)
    : ["- No visible contributors yet."];

  return [
    "Project developer fee plan",
    "",
    `Project chat: ${wave.waveUrl}`,
    projectRepoLine("GitHub repo", wave.repoUrl),
    plan.summary,
    "",
    "Records for human review:",
    ...plan.evidenceInputs.map((item) => `- ${item}`),
    "",
    "Visible contributors for review:",
    ...contributors,
    "",
    "Decisions needed:",
    ...plan.requiredDecisions.map((item) => `- ${item}`),
    "",
    "Blocked in this app:",
    ...plan.blockedActions.map((item) => `- ${item}`),
    "",
    "Note: this draft does not move funds, choose recipients, set amounts, grant reputation or token weight, or create payment authority.",
  ].join("\n");
}
