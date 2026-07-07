import type { CommandProposal, CommandWave, ExecutionRecord, GuardianReview, PollState } from "./command-waves";
import { createContributionReport } from "./contribution-report";
import { createDeveloperFeePlan } from "./developer-fee-plan";
import { guardianReviewProofBoundToConfiguredRepo } from "./guardian-review-proof";
import { projectRepoLine } from "./project-repo-copy";

export type WaveUpdateVerificationTargets = {
  verificationManifestUrl?: string;
  setupProofUrl: string;
  projectIndexUrl?: string;
  contributionReportUrl?: string;
  commandWaveStateUrl: string;
  chatLaunchUrl?: string;
  launchAuditUrl?: string;
};

function decisionReference(poll: PollState) {
  return poll.decision?.url ?? poll.decision?.dropId ?? "recorded";
}

function pollLine(poll: PollState | null) {
  if (!poll) {
    return "Decision: no vote required by current rules.";
  }

  if (poll.decision) {
    return `Decision: ${poll.status} with ${poll.yesVotes} yes, ${poll.noVotes} no, decision link ${decisionReference(poll)}.`;
  }

  return `Decision: ${poll.status} with ${poll.yesVotes} yes, ${poll.noVotes} no, quorum ${poll.quorumRequired}, yes threshold ${poll.yesPercentRequired}%.`;
}

function buildLine(poll: PollState | null, execution: ExecutionRecord | null) {
  if (!execution) {
    if (poll?.status === "passed" && !poll.decision) {
      return "Build: waiting for a recorded project decision.";
    }

    return "Build: waiting for an approved PR change.";
  }

  return `Build: ${execution.status}. ${execution.summary}`;
}

function prLine(execution: ExecutionRecord | null) {
  const prUrl = execution?.artifacts.find((artifact) =>
    /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+(?:[?#][^\s]*)?$/.test(artifact),
  );

  return prUrl ? `PR: ${prUrl}` : null;
}

function reviewLine(review: GuardianReview | null) {
  if (!review) {
    return "Review: waiting for a PR record.";
  }

  return `Review: ${review.status}. ${review.summary}`;
}

function reviewProofLine(wave: CommandWave, review: GuardianReview | null) {
  if (!review?.proof) {
    return null;
  }

  if (!guardianReviewProofBoundToConfiguredRepo(review, wave.repoUrl)) {
    return "Review proof: not bound to the selected GitHub repo.";
  }

  return `Review proof: ${review.proof.verifierVersion} / ${review.proof.attestationHash}`;
}

function contributorLine(wave: CommandWave) {
  const report = createContributionReport(wave, { limit: 3 });

  if (!report.contributors.length) {
    return `Contribution report: ${report.summary} No visible contributors yet. Report scores are informational only.`;
  }

  const contributors = report.contributors
    .map((contributor) => `${contributor.identity} report score ${contributor.score}`)
    .join(", ");

  return `Contribution report: ${report.summary} Visible contributors: ${contributors}. Report scores are informational only.`;
}

function developerFeeLine(wave: CommandWave) {
  const report = createContributionReport(wave);
  const plan = createDeveloperFeePlan(wave, report);

  return `Developer fee plan: ${plan.summary} No automatic payouts.`;
}

function verificationLine(targets: WaveUpdateVerificationTargets | null | undefined) {
  return targets
    ? [
        `Verification: setup proof ${targets.setupProofUrl}`,
        ...(targets.verificationManifestUrl ? [`verification manifest ${targets.verificationManifestUrl}`] : []),
        ...(targets.projectIndexUrl ? [`project index ${targets.projectIndexUrl}`] : []),
        ...(targets.contributionReportUrl ? [`contribution report ${targets.contributionReportUrl}`] : []),
        `state ${targets.commandWaveStateUrl}`,
        ...(targets.chatLaunchUrl ? [`chat launch ${targets.chatLaunchUrl}`] : []),
        ...(targets.launchAuditUrl ? [`launch audit ${targets.launchAuditUrl}`] : []),
      ].join("; ") + "."
    : null;
}

export function createWaveUpdateDraft({
  wave,
  proposal,
  poll,
  execution,
  review,
  verificationTargets,
}: {
  wave: CommandWave;
  proposal: CommandProposal | null;
  poll: PollState | null;
  execution: ExecutionRecord | null;
  review: GuardianReview | null;
  verificationTargets?: WaveUpdateVerificationTargets | null;
}) {
  const pr = prLine(execution);
  const reviewProof = reviewProofLine(wave, review);
  const verification = verificationLine(verificationTargets);

  return [
    "Project build update",
    "",
    `Project chat: ${wave.waveUrl}`,
    projectRepoLine("Repo", wave.repoUrl),
    proposal ? `Work: ${proposal.id} - ${proposal.title}` : "Work: none selected yet.",
    proposal ? `Status: ${proposal.status}` : "Status: setup",
    pollLine(poll),
    buildLine(poll, execution),
    ...(pr ? [pr] : []),
    reviewLine(review),
    ...(reviewProof ? [reviewProof] : []),
    ...(verification ? [verification] : []),
    "Guardrails: humans keep merge, deploy, payment, and governance authority. The hook is immutable by default with capped parameters only when explicitly approved.",
    contributorLine(wave),
    developerFeeLine(wave),
    "Next step: review this draft, then post it manually in chat if it matches the work.",
  ].join("\n");
}
