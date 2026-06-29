import type { CommandProposal, CommandWave, ExecutionRecord, GuardianReview, PollState } from "./command-waves";
import { createContributionReport, type ContributionReport } from "./contribution-report";
import { createDeveloperFeePlan, type DeveloperFeePlan } from "./developer-fee-plan";
import { humanizeLegacyCommandCopy } from "./legacy-copy";
import { latestLedgerTimestamp } from "./ledger";

export type LaunchPacket = {
  version: "command-wave-launch-packet-v0.1";
  proposalId: string | null;
  generatedAt: string;
  text: string;
};

function list(items: string[]) {
  return items.map((item) => `- ${item}`);
}

function limitedList(items: string[], limit: number, empty: string) {
  if (!items.length) {
    return [`- ${empty}`];
  }

  const visible = items.slice(0, limit);
  const hiddenCount = items.length - visible.length;

  return [
    ...list(visible),
    ...(hiddenCount > 0 ? [`- ${hiddenCount} more item${hiddenCount === 1 ? "" : "s"} in the app log.`] : []),
  ];
}

function artifactSummary(artifact: string) {
  if (artifact.startsWith("run-manifest:")) {
    return "Run manifest recorded.";
  }

  if (artifact.startsWith("agent-handoff:")) {
    return "Codex handoff packet recorded.";
  }

  if (artifact.startsWith("rules ")) {
    return "Rules hash recorded.";
  }

  if (artifact.startsWith("permissions ")) {
    return "Tool permissions recorded.";
  }

  if (artifact.startsWith("head ")) {
    return "Head commit recorded.";
  }

  if (artifact.startsWith("https://github.com/")) {
    return `PR link: ${artifact}`;
  }

  return humanizeLegacyCommandCopy(artifact);
}

function proposalLines(proposal: CommandProposal | null) {
  if (!proposal) {
    return ["- Command: none selected yet.", "- Status: setup"];
  }

  return [
    `- Command: ${proposal.id} - ${proposal.title}`,
    `- Status: ${proposal.status}`,
    `- Kind: ${proposal.kind.replaceAll("_", " ")}`,
    `- Risk: ${proposal.risk}`,
    `- Proposer: ${proposal.proposer}`,
    `- Budget cap: $${proposal.budgetUsd}`,
    `- Approved command: ${humanizeLegacyCommandCopy(proposal.prompt)}`,
    `- Limits: ${humanizeLegacyCommandCopy(proposal.spec)}`,
  ];
}

function decisionLines(poll: PollState | null) {
  if (!poll) {
    return ["- Decision: no vote required by current rules."];
  }

  const voteLine = `- Vote: ${poll.status}, ${poll.yesVotes} yes, ${poll.noVotes} no, quorum ${poll.quorumRequired}, yes threshold ${poll.yesPercentRequired}%.`;

  if (!poll.decision) {
    return [voteLine, "- Wave decision receipt: not recorded yet."];
  }

  return [
    voteLine,
    `- Wave decision receipt: ${poll.decision.summary}`,
    `- Receipt source: ${poll.decision.source}`,
    `- Receipt reference: ${poll.decision.url ?? poll.decision.dropId ?? "recorded"}`,
  ];
}

function buildLines(poll: PollState | null, execution: ExecutionRecord | null) {
  if (!execution) {
    if (poll?.status === "passed" && !poll.decision) {
      return ["- Build: waiting for a recorded wave decision."];
    }

    return ["- Build: waiting for an approved PR command."];
  }

  return [
    `- Build: ${execution.status}`,
    `- Harness: ${execution.harness}`,
    `- Summary: ${humanizeLegacyCommandCopy(execution.summary)}`,
    "- Build evidence:",
    ...limitedList(execution.artifacts.map(artifactSummary), 6, "No build artifacts recorded."),
  ];
}

function reviewLines(review: GuardianReview | null) {
  if (!review) {
    return ["- Review: waiting for execution evidence."];
  }

  return [
    `- Review: ${review.status}`,
    `- Summary: ${humanizeLegacyCommandCopy(review.summary)}`,
    "- Review checks:",
    ...limitedList(review.checks.map(humanizeLegacyCommandCopy), 8, "No review checks recorded."),
    review.proof
      ? `- Review proof: ${review.proof.verifierVersion} / ${review.proof.attestationHash}`
      : "- Review proof: not recorded.",
  ];
}

function contributionLines(report: ContributionReport) {
  const contributors = report.contributors.map(
    (contributor) =>
      `${contributor.identity}: score ${contributor.score}, ${contributor.proposals} proposal${contributor.proposals === 1 ? "" : "s"}, ${contributor.votes} vote${contributor.votes === 1 ? "" : "s"}`,
  );

  return [
    `- Summary: ${report.summary}`,
    "- Visible contributors:",
    ...limitedList(contributors, 6, "No visible contributors yet."),
    "- Notes:",
    ...list(report.notes),
  ];
}

function feeLines(plan: DeveloperFeePlan) {
  return [
    `- Summary: ${plan.summary}`,
    "- Required decisions:",
    ...list(plan.requiredDecisions),
    "- Blocked actions:",
    ...list(plan.blockedActions),
  ];
}

function nextStep(proposal: CommandProposal | null, execution: ExecutionRecord | null, review: GuardianReview | null) {
  if (!proposal) {
    return "Choose one PR-sized hook command.";
  }

  if (!execution) {
    return "Use the approved Codex packet or prepared branch flow before opening a draft PR.";
  }

  if (!review) {
    return "Run review against the PR manifest, tests, changed files, and hook guardrails.";
  }

  if (review.status !== "pass") {
    return "Resolve review findings before merge, deploy, payment, or governance decisions.";
  }

  return "Post this packet to the builder wave after human review, then decide any payout separately.";
}

export function createLaunchPacket({
  wave,
  proposal,
  poll,
  execution,
  review,
  generatedAt = latestLedgerTimestamp(wave.ledger),
}: {
  wave: CommandWave;
  proposal: CommandProposal | null;
  poll: PollState | null;
  execution: ExecutionRecord | null;
  review: GuardianReview | null;
  generatedAt?: string;
}): LaunchPacket {
  const contributionReport = createContributionReport(wave, { generatedAt, limit: 6 });
  const developerFeePlan = createDeveloperFeePlan(wave, contributionReport);
  const text = [
    "# 6529 Hook Builder launch packet",
    "",
    "Status: human-reviewed draft",
    `Generated: ${generatedAt}`,
    "",
    "## Project",
    `- Wave: ${wave.waveUrl}`,
    `- Repo: ${wave.repoUrl}`,
    `- Rules: ${wave.rules.version}`,
    `- Participation gate: ${wave.gates.join(", ") || "not set"}`,
    "",
    "## Command",
    ...proposalLines(proposal),
    "",
    "## Decision",
    ...decisionLines(poll),
    "",
    "## Build",
    ...buildLines(poll, execution),
    "",
    "## Review",
    ...reviewLines(review),
    "",
    "## Contribution Report",
    ...contributionLines(contributionReport),
    "",
    "## Developer Fee Evidence",
    ...feeLines(developerFeePlan),
    "",
    "## Authority Limits",
    "- Humans keep merge, deploy, payment, and governance authority.",
    "- This packet does not grant REP, TDH, payouts, permissions, or merge rights.",
    "- The hook is immutable by default. Parameter changes need explicit caps and bound-focused tests.",
    "- No automatic posting, merging, deploying, spending, or payouts.",
    "",
    "## Next Step",
    `- ${nextStep(proposal, execution, review)}`,
  ].join("\n");

  return {
    version: "command-wave-launch-packet-v0.1",
    proposalId: proposal?.id ?? null,
    generatedAt,
    text,
  };
}
