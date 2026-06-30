import type { ContributionContributor, ContributionReport } from "./contribution-report";

export type BuilderRosterMember = {
  identity: string;
  role: string;
  activity: string;
  scoreLabel: string;
  authorityNote: string;
  detail: string;
};

export type BuilderRosterRoomPost = {
  author: string;
  preview: string;
};

type RosterDraft = BuilderRosterMember & {
  score: number;
  roomPosts: number;
  sourceIndex: number;
  baseActivity: string;
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

function cleanIdentity(value: string) {
  return value.trim() || "unknown";
}

function roomPostPreview(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 110);
}

function isSystemRoomAuthor(identity: string) {
  const normalized = identity.toLowerCase();

  return (
    normalized === "unknown" ||
    normalized === "wave-poll" ||
    normalized === "agent" ||
    normalized === "reviewer" ||
    normalized.endsWith("-agent")
  );
}

function toMember(draft: RosterDraft): BuilderRosterMember {
  return {
    identity: draft.identity,
    role: draft.role,
    activity: draft.activity,
    scoreLabel: draft.scoreLabel,
    authorityNote: draft.authorityNote,
    detail: draft.detail,
  };
}

export function createBuilderRoster(
  report: ContributionReport,
  options: {
    limit?: number;
    roomPosts?: BuilderRosterRoomPost[];
  } = {},
): BuilderRosterMember[] {
  const members = new Map<string, RosterDraft>();

  report.contributors.forEach((contributor, index) => {
    const identity = cleanIdentity(contributor.identity);

    members.set(identity, {
      identity,
      role: roleFor(contributor),
      activity: activityFor(contributor),
      scoreLabel: `activity ${contributor.score}`,
      authorityNote: "Informational only",
      detail: contributor.rationale[0] ?? "Visible project activity",
      score: contributor.score,
      roomPosts: 0,
      sourceIndex: index,
      baseActivity: activityFor(contributor),
    });
  });

  for (const post of options.roomPosts ?? []) {
    const identity = cleanIdentity(post.author);

    if (isSystemRoomAuthor(identity)) {
      continue;
    }

    const preview = roomPostPreview(post.preview);
    const existing = members.get(identity);

    if (existing) {
      existing.roomPosts += 1;
      existing.activity = `${existing.baseActivity}, ${countLabel(existing.roomPosts, "room post")}`;
      continue;
    }

    members.set(identity, {
      identity,
      role: "Room participant",
      activity: countLabel(1, "room post"),
      scoreLabel: "room activity",
      authorityNote: "Informational only",
      detail: preview ? `Recent room post: ${preview}` : "Visible room activity",
      score: 0,
      roomPosts: 1,
      sourceIndex: Number.MAX_SAFE_INTEGER,
      baseActivity: countLabel(1, "room post"),
    });
  }

  return [...members.values()]
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.roomPosts - left.roomPosts ||
        left.sourceIndex - right.sourceIndex ||
        left.identity.localeCompare(right.identity),
    )
    .slice(0, options.limit ?? 8)
    .map(toMember);
}
