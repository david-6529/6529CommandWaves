import type { CommandWave } from "./command-waves";
import { latestLedgerTimestamp } from "./ledger";

export type ContributionContributor = {
  identity: string;
  score: number;
  proposals: number;
  votes: number;
  decisions: number;
  ledgerEvents: number;
  rationale: string[];
};

export type ContributionReport = {
  mode: "informational";
  generatedAt: string;
  summary: string;
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
    proposals: 0,
    votes: 0,
    decisions: 0,
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

function githubPrLinkCount(wave: CommandWave) {
  return wave.executions.reduce(
    (count, execution) =>
      count +
      execution.artifacts.filter((artifact) =>
        /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+(?:[?#][^\s]*)?$/.test(artifact),
      ).length,
    0,
  );
}

function evidenceSummary(wave: CommandWave) {
  const voteCount = wave.polls.reduce((count, poll) => count + (poll.votes?.length ?? 0), 0);
  const decisionCount = wave.polls.filter((poll) => poll.decision).length;
  const prLinkCount = githubPrLinkCount(wave);
  const reviewProofCount = wave.reviews.filter((review) => review.proof).length;
  const evidence = [
    ...(wave.proposals.length ? [countLabel(wave.proposals.length, "command proposal")] : []),
    ...(voteCount ? [countLabel(voteCount, "vote")] : []),
    ...(decisionCount ? [countLabel(decisionCount, "wave decision receipt")] : []),
    ...(prLinkCount ? [countLabel(prLinkCount, "GitHub PR link")] : []),
    ...(reviewProofCount ? [countLabel(reviewProofCount, "Guardian review proof")] : []),
    ...(wave.ledger.length ? [countLabel(wave.ledger.length, "ledger event")] : []),
  ];

  return evidence.length ? evidence : ["No app evidence recorded yet."];
}

export function createContributionReport(
  wave: CommandWave,
  options: {
    generatedAt?: string;
    limit?: number;
  } = {},
): ContributionReport {
  const contributors = new Map<string, ContributionContributor>();

  for (const proposal of wave.proposals) {
    const contributor = addContributor(contributors, proposal.proposer);

    contributor.proposals += 1;
    contributor.score += proposal.status === "complete" ? 6 : proposal.status === "reviewing" ? 4 : 3;
    addRationale(contributor, "Proposed scoped work");

    if (proposal.status === "complete") {
      addRationale(contributor, "Carried work through review");
    }
  }

  for (const poll of wave.polls) {
    if (poll.decision?.recordedBy) {
      const contributor = addContributor(contributors, poll.decision.recordedBy);

      contributor.decisions += 1;
      contributor.score += 2;
      addRationale(contributor, "Recorded wave decision evidence");
    }

    for (const vote of poll.votes ?? []) {
      const contributor = addContributor(contributors, vote.voterIdentity);

      contributor.votes += 1;
      contributor.score += 1;
      addRationale(contributor, "Participated in decisions");
    }
  }

  for (const event of wave.ledger) {
    if (["Setup", "Rule Engine", "AI Worker", "Agent", "Reviewer", "Wave Poll"].includes(event.actor)) {
      continue;
    }

    const contributor = addContributor(contributors, event.actor);

    contributor.ledgerEvents += 1;
    contributor.score += 1;
    addRationale(contributor, "Appears in the activity log");
  }

  const sorted = [...contributors.values()]
    .sort((left, right) => right.score - left.score || left.identity.localeCompare(right.identity))
    .slice(0, options.limit ?? 6);

  return {
    mode: "informational",
    generatedAt: options.generatedAt ?? latestLedgerTimestamp(wave.ledger),
    summary: sorted.length
      ? `${sorted.length} contributors have visible project activity.`
      : "No contributor activity has been recorded yet.",
    evidence: evidenceSummary(wave),
    contributors: sorted,
    notes: [
      "Scores are an AI-readable activity report, not a permission system.",
      "REP, TDH, payouts, and merge rights must use separate human-approved rules.",
      "The report only uses proposal, vote, decision, PR, review, and ledger evidence currently stored by this app.",
      "Unattributed agent and reviewer events stay in the audit log but do not become human score.",
    ],
  };
}
