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
