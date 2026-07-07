import { reportPointLabel, type ContributionContributor, type ContributionReport } from "./contribution-report";

export type BuilderRosterStat = {
  label: string;
  value: string;
};

export type BuilderRosterMember = {
  identity: string;
  role: string;
  activity: string;
  scoreLabel: string;
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

  if (contributor.pullRequests > 0 || contributor.reviewProofs > 0) {
    return "Builder";
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

  if (contributor.chatPosts > 0) {
    return "Chat participant";
  }

  if (contributor.ledgerEvents > 0) {
    return "Participant";
  }

  return "Member";
}

function activityFor(contributor: ContributionContributor) {
  const activity = [
    ...(contributor.proposals ? [countLabel(contributor.proposals, "proposal")] : []),
    ...(contributor.pullRequests ? [countLabel(contributor.pullRequests, "PR")] : []),
    ...(contributor.reviewProofs ? [countLabel(contributor.reviewProofs, "review proof")] : []),
    ...(contributor.votes ? [countLabel(contributor.votes, "vote")] : []),
    ...(contributor.decisions ? [countLabel(contributor.decisions, "decision")] : []),
    ...(contributor.chatPosts ? [countLabel(contributor.chatPosts, "chat post")] : []),
    ...(contributor.ledgerEvents ? [countLabel(contributor.ledgerEvents, "activity event")] : []),
  ];

  return activity.length ? activity.join(", ") : "No visible app activity yet.";
}

function detailFor(contributor: ContributionContributor) {
  const chatPostRationale = contributor.rationale.find((item) => item.startsWith("Recent chat post: "));

  if (contributor.chatPosts > 0 && contributor.proposals === 0 && contributor.votes === 0 && contributor.decisions === 0) {
    return chatPostRationale ?? "Posted in chat";
  }

  return contributor.rationale[0] ?? chatPostRationale ?? "Visible project activity";
}

function scoreLabelFor(contributor: ContributionContributor) {
  const onlyChatActivity =
    contributor.chatPosts > 0 &&
    contributor.proposals === 0 &&
    contributor.pullRequests === 0 &&
    contributor.reviewProofs === 0 &&
    contributor.votes === 0 &&
    contributor.decisions === 0 &&
    contributor.ledgerEvents === 0;

  return onlyChatActivity ? "chat activity" : reportPointLabel(contributor.score);
}

function statsFor(contributor: ContributionContributor): BuilderRosterStat[] {
  const stats = [
    ["Proposals", contributor.proposals],
    ["PRs", contributor.pullRequests],
    ["Reviews", contributor.reviewProofs],
    ["Votes", contributor.votes],
    ["Decisions", contributor.decisions],
    ["Chat posts", contributor.chatPosts],
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
      detail: detailFor(contributor),
      basis: contributor.scoreBasis.slice(0, 3),
      stats: statsFor(contributor),
    }));
}
