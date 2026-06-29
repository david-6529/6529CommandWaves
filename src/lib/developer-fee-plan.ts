import type { CommandWave } from "./command-waves";
import type { ContributionReport } from "./contribution-report";

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
  const reviewedWorkLabel = reviewedWorkCount === 1 ? "reviewed command" : "reviewed commands";
  const contributorLabel = visibleContributorCount === 1 ? "visible contributor" : "visible contributors";

  return {
    mode: "manual_review",
    summary: reviewedWorkCount
      ? `Manual fee planning can use ${reviewedWorkCount} ${reviewedWorkLabel} and ${visibleContributorCount} ${contributorLabel} as evidence.`
      : "Manual fee planning starts after a reviewed command exists.",
    evidenceInputs: [
      "Approved command and vote record.",
      "Merged or reviewed PR evidence.",
      "Contribution report rationale.",
      "Human review notes from the builder wave.",
    ],
    requiredDecisions: [
      "Wave approves the fee budget before any payment.",
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
    "6529 hook developer fee plan",
    "",
    `Builder wave: ${wave.waveUrl}`,
    `GitHub repo: ${wave.repoUrl}`,
    plan.summary,
    "",
    "Evidence for human review:",
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
    "Note: this draft does not move funds, choose recipients, set amounts, grant REP or TDH, or create payment authority.",
  ].join("\n");
}
