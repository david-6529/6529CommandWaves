import type { CommandWave } from "./command-waves";

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
    generatedAt: options.generatedAt ?? wave.ledger[0]?.at ?? new Date(0).toISOString(),
    summary: sorted.length
      ? `${sorted.length} contributors have visible project activity.`
      : "No contributor activity has been recorded yet.",
    contributors: sorted,
    notes: [
      "Scores are an AI-readable activity report, not a permission system.",
      "REP, TDH, payouts, and merge rights must use separate human-approved rules.",
      "The report only uses proposals, votes, decision receipts, and ledger events currently stored by this app.",
      "Unattributed agent and reviewer events stay in the audit log but do not become human score.",
    ],
  };
}
