import type { CommandWave } from "./command-waves";
import type { ContributionReport } from "./contribution-report";
import { projectRepoLine } from "./project-repo-copy";

export type DeveloperFeePlan = {
  mode: "manual_review";
  summary: string;
  evidenceInputs: string[];
  requiredDecisions: string[];
  blockedActions: string[];
};

export function createDeveloperFeePlan(wave: CommandWave, contributionReport: ContributionReport): DeveloperFeePlan {
  const reviewedWorkCount = wave.reviews.filter((review) => review.status === "pass").length;
  const visibleContributorCount = contributionReport.contributors.length;
  const reviewedWorkLabel = reviewedWorkCount === 1 ? "reviewed change" : "reviewed changes";
  const contributorLabel = visibleContributorCount === 1 ? "visible contributor" : "visible contributors";

  return {
    mode: "manual_review",
    summary: reviewedWorkCount
      ? `Manual fee planning can use ${reviewedWorkCount} ${reviewedWorkLabel} and ${visibleContributorCount} ${contributorLabel} as records.`
      : "Manual fee planning starts after a reviewed change exists.",
    evidenceInputs: [
      "Approved work and vote record.",
      "Merged or reviewed PR record.",
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
    projectRepoLine("Code repo", wave.repoUrl),
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
