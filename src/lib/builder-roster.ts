import type { ContributionContributor, ContributionReport } from "./contribution-report";

export type BuilderRosterMember = {
  identity: string;
  role: string;
  activity: string;
  scoreLabel: string;
  authorityNote: string;
  detail: string;
};

function countLabel(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function roleFor(contributor: ContributionContributor) {
  if (contributor.proposals > 0 && contributor.decisions > 0) {
    return "Coordinator";
  }

  if (contributor.proposals > 0) {
    return "Proposer";
  }

  if (contributor.decisions > 0) {
    return "Decision recorder";
  }

  if (contributor.votes > 0) {
    return "Voter";
  }

  if (contributor.ledgerEvents > 0) {
    return "Participant";
  }

  return "Member";
}

function activityFor(contributor: ContributionContributor) {
  const activity = [
    ...(contributor.proposals ? [countLabel(contributor.proposals, "proposal")] : []),
    ...(contributor.votes ? [countLabel(contributor.votes, "vote")] : []),
    ...(contributor.decisions ? [countLabel(contributor.decisions, "decision")] : []),
    ...(contributor.ledgerEvents ? [countLabel(contributor.ledgerEvents, "activity event")] : []),
  ];

  return activity.length ? activity.join(", ") : "No visible app activity yet.";
}

export function createBuilderRoster(
  report: ContributionReport,
  options: {
    limit?: number;
  } = {},
): BuilderRosterMember[] {
  return report.contributors.slice(0, options.limit ?? 6).map((contributor) => ({
    identity: contributor.identity,
    role: roleFor(contributor),
    activity: activityFor(contributor),
    scoreLabel: `activity ${contributor.score}`,
    authorityNote: "Informational only",
    detail: contributor.rationale[0] ?? "Visible project activity",
  }));
}
