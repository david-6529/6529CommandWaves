import type { CommandProposal, CommandWave, ExecutionRecord, GuardianReview, PollState } from "./command-waves";
import { commandKindLabel } from "./command-kind-copy";
import { createCommandOrchestrationSummary } from "./command-orchestration-summary";
import { createContributionReport, type ContributionReport } from "./contribution-report";
import { createDeveloperFeePlan, type DeveloperFeePlan } from "./developer-fee-plan";
import { humanizeLegacyCommandCopy } from "./legacy-copy";
import { latestLedgerTimestamp } from "./ledger";
import { createPublicWorkflowProof } from "./public-workflow-proof";

export type LaunchPacket = {
  version: "command-wave-launch-packet-v0.1";
  proposalId: string | null;
  generatedAt: string;
  text: string;
};

export type LaunchPacketVerificationTargets = {
  setupProofUrl: string;
  commandWaveStateUrl: string;
  launchAuditUrl?: string;
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

  if (artifact === "PR body includes Command Waves manifest") {
    return "PR manifest in body.";
  }

  return humanizeLegacyCommandCopy(artifact);
}

function artifactPriority(artifact: string) {
  if (artifact.startsWith("run-manifest:")) {
    return 0;
  }

  if (artifact.startsWith("agent-handoff:")) {
    return 1;
  }

  if (artifact === "PR body includes Command Waves manifest") {
    return 2;
  }

  if (artifact.startsWith("https://github.com/")) {
    return 3;
  }

  if (artifact.startsWith("head ")) {
    return 4;
  }

  if (/\btest\b/i.test(artifact)) {
    return 5;
  }

  if (artifact.startsWith("rules ")) {
    return 6;
  }

  if (artifact.startsWith("permissions ")) {
    return 7;
  }

  if (artifact.startsWith("budget cap ")) {
    return 8;
  }

  if (/^PR #\d+\b/.test(artifact)) {
    return 9;
  }

  return 10;
}

function buildEvidenceItems(artifacts: string[]) {
  return artifacts
    .map((artifact, index) => ({ artifact, index }))
    .toSorted((left, right) => artifactPriority(left.artifact) - artifactPriority(right.artifact) || left.index - right.index)
    .map((item) => artifactSummary(item.artifact));
}

function proposalLines(proposal: CommandProposal | null) {
  if (!proposal) {
    return ["- Work: none selected yet.", "- Status: setup"];
  }

  return [
    `- Work: ${proposal.id} - ${proposal.title}`,
    `- Status: ${proposal.status}`,
    `- Kind: ${commandKindLabel(proposal.kind)}`,
    `- Risk: ${proposal.risk}`,
    `- Proposer: ${proposal.proposer}`,
    `- Budget cap: $${proposal.budgetUsd}`,
    `- Approved work: ${humanizeLegacyCommandCopy(proposal.prompt)}`,
    `- Limits: ${humanizeLegacyCommandCopy(proposal.spec)}`,
  ];
}

function decisionLines(poll: PollState | null) {
  if (!poll) {
    return ["- Decision: no vote required by current rules."];
  }

  const voteLine = `- Vote: ${poll.status}, ${poll.yesVotes} yes, ${poll.noVotes} no, quorum ${poll.quorumRequired}, yes threshold ${poll.yesPercentRequired}%.`;

  if (!poll.decision) {
    return [voteLine, "- Project decision receipt: not recorded yet."];
  }

  return [
    voteLine,
    `- Project decision receipt: ${poll.decision.summary}`,
    `- Receipt source: ${poll.decision.source}`,
    `- Receipt reference: ${poll.decision.url ?? poll.decision.dropId ?? "recorded"}`,
  ];
}

function orchestrationLines(wave: CommandWave, proposal: CommandProposal | null, poll: PollState | null) {
  const summary = createCommandOrchestrationSummary({ wave, proposal, poll });

  return [
    `- Work type: ${summary.workType}`,
    `- Risk: ${summary.risk}`,
    `- Decision route: ${summary.decisionRoute}.`,
    `- Rule reason: ${summary.ruleReason}`,
    `- Reviewer route: ${summary.reviewerRoute}`,
  ];
}

function buildLines(poll: PollState | null, execution: ExecutionRecord | null) {
  if (!execution) {
    if (poll?.status === "passed" && !poll.decision) {
      return ["- Build: waiting for a recorded project decision."];
    }

    return ["- Build: waiting for an approved PR change."];
  }

  return [
    `- Build: ${execution.status}`,
    `- Harness: ${execution.harness}`,
    `- Summary: ${humanizeLegacyCommandCopy(execution.summary)}`,
    "- Build records:",
    ...limitedList(buildEvidenceItems(execution.artifacts), 6, "No build artifacts recorded."),
  ];
}

function reviewLines(review: GuardianReview | null) {
  if (!review) {
    return ["- Review: waiting for a PR record."];
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
      `${contributor.identity}: report score ${contributor.score}, ${contributor.scoreBasis.join(", ")}, ${
        contributor.proposals
      } proposal${contributor.proposals === 1 ? "" : "s"}, ${contributor.votes} vote${
        contributor.votes === 1 ? "" : "s"
      }`,
  );

  return [
    `- Summary: ${report.summary}`,
    "- Scoring rubric:",
    ...limitedList(report.scoringRubric, 6, "No scoring rubric recorded."),
    "- Records used:",
    ...limitedList(report.evidence, 6, "No app records yet."),
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

function workflowProofLines(wave: CommandWave) {
  const proof = createPublicWorkflowProof(wave);

  return [
    `- Summary: ${proof.summary}`,
    `- Source of truth: ${proof.sourceOfTruth}`,
    `- Code surface: ${proof.codeSurface}`,
    `- Status: ${proof.readyCount} ready, ${proof.blockedCount} blocked.`,
    "- Steps:",
    ...proof.steps.map((step) => {
      const evidence = step.evidenceUrl ?? step.evidenceHash ?? "no evidence yet";

      return `- ${step.label}: ${step.status}. ${step.detail} Evidence: ${evidence}`;
    }),
  ];
}

function verificationLines(targets: LaunchPacketVerificationTargets | null | undefined) {
  if (!targets) {
    return ["- Setup proof: not attached.", "- Command-wave state: not attached."];
  }

  return [
    `- Setup proof: ${targets.setupProofUrl}`,
    `- Command-wave state: ${targets.commandWaveStateUrl}`,
    ...(targets.launchAuditUrl ? [`- Launch audit: ${targets.launchAuditUrl}`] : []),
    `- Verify setup: SETUP_PROOF_URL=${targets.setupProofUrl} npm run setup:verify`,
  ];
}

function nextStep(proposal: CommandProposal | null, execution: ExecutionRecord | null, review: GuardianReview | null) {
  if (!proposal) {
    return "Choose one PR-sized hook change.";
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

  return "Post this packet to chat after human review, then decide any payout separately.";
}

export function createLaunchPacket({
  wave,
  proposal,
  poll,
  execution,
  review,
  verificationTargets,
  generatedAt = latestLedgerTimestamp(wave.ledger),
}: {
  wave: CommandWave;
  proposal: CommandProposal | null;
  poll: PollState | null;
  execution: ExecutionRecord | null;
  review: GuardianReview | null;
  verificationTargets?: LaunchPacketVerificationTargets | null;
  generatedAt?: string;
}): LaunchPacket {
  const contributionReport = createContributionReport(wave, { generatedAt, limit: 6 });
  const developerFeePlan = createDeveloperFeePlan(wave, contributionReport);
  const text = [
    "# Project launch packet",
    "",
    "Status: human-reviewed draft",
    `Generated: ${generatedAt}`,
    "",
    "## Project",
    `- Project chat: ${wave.waveUrl}`,
    `- Repo: ${wave.repoUrl}`,
    `- Rules: ${wave.rules.version}`,
    `- Participation notes (advisory): ${wave.gates.join(", ") || "none recorded"}`,
    "",
    "## Command",
    ...proposalLines(proposal),
    "",
    "## Orchestration",
    ...orchestrationLines(wave, proposal, poll),
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
    "## Workflow Proof",
    ...workflowProofLines(wave),
    "",
    "## Contribution Report",
    ...contributionLines(contributionReport),
    "",
    "## Developer Fee Records",
    ...feeLines(developerFeePlan),
    "",
    "## Verification",
    ...verificationLines(verificationTargets),
    "",
    "## Authority Limits",
    "- Humans keep merge, deploy, payment, and governance authority.",
    "- This packet does not grant reputation, token weight, payouts, permissions, or merge rights.",
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
