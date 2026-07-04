import type { ContributionContributor, ContributionReport } from "./contribution-report";

export type BuilderRosterStat = {
  label: string;
  value: string;
};

export type BuilderRosterMember = {
  identity: string;
  role: string;
  activity: string;
  scoreLabel: string;
  authorityNote: string;
  detail: string;
  basis: string[];
  stats: BuilderRosterStat[];
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

  if (contributor.roomPosts > 0) {
    return "Room participant";
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
    ...(contributor.roomPosts ? [countLabel(contributor.roomPosts, "room post")] : []),
    ...(contributor.ledgerEvents ? [countLabel(contributor.ledgerEvents, "activity event")] : []),
  ];

  return activity.length ? activity.join(", ") : "No visible app activity yet.";
}

function detailFor(contributor: ContributionContributor) {
  const roomPostRationale = contributor.rationale.find((item) => item.startsWith("Recent room post: "));

  if (contributor.roomPosts > 0 && contributor.proposals === 0 && contributor.votes === 0 && contributor.decisions === 0) {
    return roomPostRationale ?? "Posted in the room";
  }

  return contributor.rationale[0] ?? roomPostRationale ?? "Visible project activity";
}

function scoreLabelFor(contributor: ContributionContributor) {
  const onlyRoomActivity =
    contributor.roomPosts > 0 &&
    contributor.proposals === 0 &&
    contributor.votes === 0 &&
    contributor.decisions === 0 &&
    contributor.ledgerEvents === 0;

  return onlyRoomActivity ? "room activity" : `activity ${contributor.score}`;
}

function statsFor(contributor: ContributionContributor): BuilderRosterStat[] {
  const stats = [
    ["Proposals", contributor.proposals],
    ["Votes", contributor.votes],
    ["Decisions", contributor.decisions],
    ["Room posts", contributor.roomPosts],
    ["Log", contributor.ledgerEvents],
  ]
    .filter(([, value]) => Number(value) > 0)
    .map(([label, value]) => ({
      label: String(label),
      value: String(value),
    }));

  return stats.length ? stats : [{ label: "Activity", value: "0" }];
}

export function createBuilderRoster(
  report: ContributionReport,
  options: {
    limit?: number;
  } = {},
): BuilderRosterMember[] {
  return report.contributors
    .slice(0, options.limit ?? 8)
    .map((contributor) => ({
      identity: contributor.identity,
      role: roleFor(contributor),
      activity: activityFor(contributor),
      scoreLabel: scoreLabelFor(contributor),
      authorityNote: "Informational only",
      detail: detailFor(contributor),
      basis: contributor.scoreBasis.slice(0, 3),
      stats: statsFor(contributor),
    }));
}
