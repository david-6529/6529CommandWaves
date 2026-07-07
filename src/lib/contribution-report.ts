import type { CommandWave } from "./command-waves";
import { orchestratorAgentIdentity } from "./agent-identities";
import { guardianReviewProofBoundToConfiguredRepo } from "./guardian-review-proof";
import { gitHubPullRequestUrlsForRepo } from "./github/pr-evidence";
import { latestLedgerTimestamp } from "./ledger";

export type ContributionContributor = {
  identity: string;
  score: number;
  scoreBasis: string[];
  proposals: number;
  votes: number;
  decisions: number;
  pullRequests: number;
  reviewProofs: number;
  chatPosts: number;
  ledgerEvents: number;
  rationale: string[];
};

export type ContributionChatPost = {
  author: string;
  preview: string;
  createdAt?: string | null;
};

export type ContributionReport = {
  mode: "informational";
  method: {
    id: "visible_activity_v0";
    label: string;
    authority: string;
  };
  generatedAt: string;
  summary: string;
  coverage: {
    included: string[];
    notIncluded: string[];
  };
  scoringRubric: string[];
  evidence: string[];
  contributors: ContributionContributor[];
  notes: string[];
};

function addContributor(map: Map<string, ContributionContributor>, identity: string) {
  const normalized = identity.trim() || "unknown";
  const existing = map.get(normalized);

  if (existing) {
    return existing;
  }

  const contributor: ContributionContributor = {
    identity: normalized,
    score: 0,
    scoreBasis: [],
    proposals: 0,
    votes: 0,
    decisions: 0,
    pullRequests: 0,
    reviewProofs: 0,
    chatPosts: 0,
    ledgerEvents: 0,
    rationale: [],
  };

  map.set(normalized, contributor);
  return contributor;
}

function addRationale(contributor: ContributionContributor, rationale: string) {
  if (!contributor.rationale.includes(rationale)) {
    contributor.rationale.push(rationale);
  }
}

function countLabel(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

export function reportPointLabel(points: number) {
  return `${points} report point${points === 1 ? "" : "s"}`;
}

function scoreLabel(points: number, source: string) {
  return `${source}: ${reportPointLabel(points)}`;
}

function addScoreBasis(contributor: ContributionContributor, source: string, points: number) {
  const existingIndex = contributor.scoreBasis.findIndex((item) => item.startsWith(`${source}: `));

  if (existingIndex >= 0) {
    const current = contributor.scoreBasis[existingIndex];
    const currentPoints = Number(current.match(/: (\d+) report point/)?.[1] ?? 0);

    contributor.scoreBasis[existingIndex] = scoreLabel(currentPoints + points, source);
    return;
  }

  contributor.scoreBasis.push(scoreLabel(points, source));
}

function githubPrLinkCount(wave: CommandWave) {
  return wave.executions.reduce(
    (count, execution) => count + gitHubPullRequestUrlsForRepo(execution.artifacts, wave.repoUrl).length,
    0,
  );
}

function chatPostPreview(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 110);
}

function isSystemChatAuthor(identity: string) {
  const normalized = identity.trim().toLowerCase();

  return (
    !normalized ||
    normalized === "unknown" ||
    normalized === orchestratorAgentIdentity.handle ||
    normalized === "wave-poll" ||
    normalized === "agent" ||
    normalized === "reviewer" ||
    normalized.endsWith("-agent")
  );
}

function latestReportTimestamp(wave: CommandWave, chatPosts: ContributionChatPost[]) {
  const ledgerLatest = latestLedgerTimestamp(wave.ledger);
  const chatLatest = chatPosts
    .map((post) => (post.createdAt ? Date.parse(post.createdAt) : 0))
    .filter((time) => Number.isFinite(time) && time > 0)
    .sort((left, right) => right - left)[0];

  if (!chatLatest) {
    return ledgerLatest;
  }

  const ledgerTime = Date.parse(ledgerLatest);

  return chatLatest > (Number.isFinite(ledgerTime) ? ledgerTime : 0) ? new Date(chatLatest).toISOString() : ledgerLatest;
}

function evidenceSummary(wave: CommandWave, chatPostCount: number) {
  const voteCount = wave.polls.reduce((count, poll) => count + (poll.votes?.length ?? 0), 0);
  const decisionCount = wave.polls.filter((poll) => poll.decision).length;
  const prLinkCount = githubPrLinkCount(wave);
  const reviewProofCount = prLinkCount
    ? wave.reviews.filter((review) => guardianReviewProofBoundToConfiguredRepo(review, wave.repoUrl)).length
    : 0;
  const evidence = [
    ...(wave.proposals.length ? [countLabel(wave.proposals.length, "proposal")] : []),
    ...(voteCount ? [countLabel(voteCount, "vote")] : []),
    ...(decisionCount ? [countLabel(decisionCount, "project decision link")] : []),
    ...(chatPostCount ? [countLabel(chatPostCount, "chat post")] : []),
    ...(prLinkCount ? [countLabel(prLinkCount, "GitHub PR link")] : []),
    ...(reviewProofCount ? [countLabel(reviewProofCount, "Guardian review proof")] : []),
    ...(wave.ledger.length ? [countLabel(wave.ledger.length, "ledger event")] : []),
  ];

  return evidence.length ? evidence : ["No app records yet."];
}

const scoringRubric = [
  "Complete proposal: 6 report points.",
  "Reviewing proposal: 4 report points.",
  "Other proposal: 3 report points.",
  "Recorded PR linked to a proposal: 2 report points.",
  "Repo-bound Guardian review proof linked to a proposal: 2 report points.",
  "Project decision link: 2 report points.",
  "Vote or attributed activity log event: 1 report point.",
  "Chat post pulled into app: 1 report point.",
];

const coverage = {
  included: [
    "Work proposals stored by this app.",
    "Votes and recorded project decision links stored by this app.",
    "Chat posts pulled into this app.",
    "Recorded GitHub PR links and repo-bound Guardian review proof.",
    "Attributed activity log events stored by this app.",
  ],
  notIncluded: [
    "Live chat posts that have not been pulled into app state.",
    "GitHub commits, comments, reviews, and merges that are not attached to a recorded PR.",
    "Manual payments, reputation, token weight, off-app agreements, or private coordination.",
  ],
};

const reportMethod: ContributionReport["method"] = {
  id: "visible_activity_v0",
  label: "Visible activity report",
  authority: "Informational only",
};

export function createContributionReport(
  wave: CommandWave,
  options: {
    generatedAt?: string;
    limit?: number;
    chatPosts?: ContributionChatPost[];
  } = {},
): ContributionReport {
  const contributors = new Map<string, ContributionContributor>();
  const chatPosts = options.chatPosts ?? [];
  const includedChatPosts: ContributionChatPost[] = [];
  let includedChatPostCount = 0;

  for (const proposal of wave.proposals) {
    const contributor = addContributor(contributors, proposal.proposer);

    contributor.proposals += 1;
    const points = proposal.status === "complete" ? 6 : proposal.status === "reviewing" ? 4 : 3;

    contributor.score += points;
    addScoreBasis(contributor, "Proposal work", points);
    addRationale(contributor, "Proposed work");

    if (proposal.status === "complete") {
      addRationale(contributor, "Carried work through review");
    }

    const execution = wave.executions.find((item) => item.proposalId === proposal.id);
    const prCount = execution ? gitHubPullRequestUrlsForRepo(execution.artifacts, wave.repoUrl).length : 0;

    if (prCount) {
      const points = prCount * 2;

      contributor.pullRequests += prCount;
      contributor.score += points;
      addScoreBasis(contributor, "PR evidence", points);
      addRationale(contributor, "Linked approved work to a GitHub PR");
    }

    const review = wave.reviews.find((item) => item.proposalId === proposal.id);

    if (review && guardianReviewProofBoundToConfiguredRepo(review, wave.repoUrl)) {
      contributor.reviewProofs += 1;
      contributor.score += 2;
      addScoreBasis(contributor, "Review proof", 2);
      addRationale(contributor, "Received repo-bound Guardian review proof");
    }
  }

  for (const poll of wave.polls) {
    if (poll.decision?.recordedBy) {
      const contributor = addContributor(contributors, poll.decision.recordedBy);

      contributor.decisions += 1;
      contributor.score += 2;
      addScoreBasis(contributor, "Decision links", 2);
      addRationale(contributor, "Recorded project decision link");
    }

    for (const vote of poll.votes ?? []) {
      const contributor = addContributor(contributors, vote.voterIdentity);

      contributor.votes += 1;
      contributor.score += 1;
      addScoreBasis(contributor, "Votes", 1);
      addRationale(contributor, "Participated in decisions");
    }
  }

  for (const event of wave.ledger) {
    if (["Setup", "Rule Engine", "AI Worker", "Agent", "Reviewer", "Wave Poll", "Decision"].includes(event.actor)) {
      continue;
    }

    const contributor = addContributor(contributors, event.actor);

    contributor.ledgerEvents += 1;
    contributor.score += 1;
    addScoreBasis(contributor, "Activity log", 1);
    addRationale(contributor, "Appears in the activity log");
  }

  for (const post of chatPosts) {
    if (isSystemChatAuthor(post.author)) {
      continue;
    }

    const contributor = addContributor(contributors, post.author);

    contributor.chatPosts += 1;
    contributor.score += 1;
    includedChatPostCount += 1;
    includedChatPosts.push(post);
    addScoreBasis(contributor, "Chat posts", 1);
    addRationale(contributor, "Posted in chat");

    const preview = chatPostPreview(post.preview);

    if (preview) {
      addRationale(contributor, `Recent chat post: ${preview}`);
    }
  }

  const sorted = [...contributors.values()]
    .sort((left, right) => right.score - left.score || left.identity.localeCompare(right.identity))
    .slice(0, options.limit ?? 8);

  return {
    mode: "informational",
    method: reportMethod,
    generatedAt: options.generatedAt ?? latestReportTimestamp(wave, includedChatPosts),
    summary: sorted.length
      ? `${sorted.length} contributors have visible project activity.`
      : "No contributor activity has been recorded yet.",
    coverage,
    scoringRubric,
    evidence: evidenceSummary(wave, includedChatPostCount),
    contributors: sorted,
    notes: [
      "Report scores are an AI-readable activity report, not a permission system.",
      "Reputation, token weight, payouts, and merge rights must use separate human-approved rules.",
      "The report only uses proposal, vote, decision, chat post, PR, review, and ledger records currently stored or previewed by this app.",
      "Unattributed agent and reviewer events stay in the audit log but do not become human score.",
    ],
  };
}

export function createContributionReportDraft(
  wave: CommandWave,
  options: {
    generatedAt?: string;
    limit?: number;
    chatPosts?: ContributionChatPost[];
  } = {},
) {
  const report = createContributionReport(wave, options);
  const contributors = report.contributors.length
    ? report.contributors.map((contributor) => {
        const counts = [
          countLabel(contributor.proposals, "proposal"),
          countLabel(contributor.pullRequests, "PR"),
          countLabel(contributor.reviewProofs, "review proof"),
          countLabel(contributor.votes, "vote"),
          countLabel(contributor.decisions, "decision"),
          countLabel(contributor.chatPosts, "chat post"),
          countLabel(contributor.ledgerEvents, "activity log event"),
        ].join(", ");

        return `- ${contributor.identity}: report score ${contributor.score}; ${contributor.scoreBasis.join(", ")}; ${counts}; ${contributor.rationale.join(", ")}`;
      })
    : ["- No visible contributors yet."];

  return [
    "Project contribution report",
    "",
    `Generated: ${report.generatedAt}`,
    `Method: ${report.method.label} (${report.method.id}), ${report.method.authority}.`,
    report.summary,
    "",
    "Records:",
    ...report.evidence.map((item) => `- ${item}`),
    "",
    "Coverage included:",
    ...report.coverage.included.map((item) => `- ${item}`),
    "",
    "Not included:",
    ...report.coverage.notIncluded.map((item) => `- ${item}`),
    "",
    "Contributors:",
    ...contributors,
    "",
    "Scoring rubric:",
    ...report.scoringRubric.map((item) => `- ${item}`),
    "",
    "Notes:",
    ...report.notes.map((item) => `- ${item}`),
  ].join("\n");
}
