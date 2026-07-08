import { pollApprovalPassedForWave, validateWaveDecisionReference, type CommandWave } from "./command-waves";
import { isPlaceholderValue } from "./env-placeholders";
import { guardianReviewProofBoundToConfiguredRepo } from "./guardian-review-proof";
import { gitHubPullRequestUrlsForRepo } from "./github/pr-evidence";
import { humanizeLegacyCommandCopy } from "./legacy-copy";
import { hashValue } from "./run-manifest";
import { selectPhaseWork } from "./phase-work";
import { reviewAgentIdentity } from "./agent-identities";

export type PublicWorkflowProofStepId = "chat" | "decision" | "pr" | "review" | "log";
export type PublicWorkflowProofStepStatus = "ready" | "needed" | "blocked";

export type PublicWorkflowProofStep = {
  id: PublicWorkflowProofStepId;
  label: string;
  status: PublicWorkflowProofStepStatus;
  detail: string;
  evidenceUrl: string | null;
  evidenceHash: string | null;
};

export type PublicWorkflowProof = ReturnType<typeof createPublicWorkflowProof>;

function hasProjectChat(wave: CommandWave) {
  return Boolean(wave.waveUrl.trim());
}

function hasConfiguredRepo(wave: CommandWave) {
  return Boolean(wave.repoUrl.trim() && !isPlaceholderValue(wave.repoUrl));
}

function latestPrUrl(wave: CommandWave) {
  if (!hasConfiguredRepo(wave)) {
    return null;
  }

  return gitHubPullRequestUrlsForRepo(
    wave.executions.flatMap((execution) => execution.artifacts),
    wave.repoUrl,
  )[0] ?? null;
}

function decisionEvidence(wave: CommandWave) {
  const phaseWork = selectPhaseWork(wave);
  const proposal = phaseWork.prProposal;
  const poll = phaseWork.prPoll;
  const decision = poll?.decision ?? null;

  if (!proposal) {
    return {
      status: "needed" as const,
      detail: "Choose one PR-sized hook change before recording a project decision.",
      evidenceUrl: null,
      evidenceHash: null,
    };
  }

  if (!poll) {
    return {
      status: "needed" as const,
      detail: "Decision waits for the project vote or explicit approval record.",
      evidenceUrl: null,
      evidenceHash: null,
    };
  }

  if (!decision) {
    return {
      status: "needed" as const,
      detail:
        poll.status === "passed"
          ? "Local vote passed. Record the project decision link from chat before PR work starts."
          : `Decision is ${poll.status} with ${poll.yesVotes} yes and ${poll.noVotes} no.`,
      evidenceUrl: null,
      evidenceHash: hashValue(poll),
    };
  }

  const referenceCheck = validateWaveDecisionReference({
    reference: decision.url ?? decision.dropId ?? "",
    waveUrl: wave.waveUrl,
    requireUrl: true,
  });

  if (!referenceCheck.ok || !pollApprovalPassedForWave(poll, wave.waveUrl, { requireUrl: true })) {
    return {
      status: "blocked" as const,
      detail: referenceCheck.ok ? "Project decision is not approved for this wave." : referenceCheck.message,
      evidenceUrl: decision.url,
      evidenceHash: hashValue({ poll, decision }),
    };
  }

  return {
    status: "ready" as const,
    detail: `Builders approved with ${poll.yesVotes} yes and ${poll.noVotes} no.`,
    evidenceUrl: decision.url,
    evidenceHash: hashValue({ poll, decision }),
  };
}

export function createPublicWorkflowProof(wave: CommandWave) {
  const phaseWork = selectPhaseWork(wave);
  const proposal = phaseWork.prProposal;
  const execution = phaseWork.prExecution;
  const review = phaseWork.prReview;
  const repoConfigured = hasConfiguredRepo(wave);
  const prUrl = latestPrUrl(wave);
  const decision = decisionEvidence(wave);
  const chatReady = hasProjectChat(wave);
  const missingConfiguredPrLink = Boolean(repoConfigured && execution?.status === "complete" && !prUrl);
  const reviewProofBound = guardianReviewProofBoundToConfiguredRepo(review, wave.repoUrl);
  const reviewerProcessSelected = reviewAgentIdentity.status !== "placeholder";
  const prStatus: PublicWorkflowProofStepStatus = !repoConfigured
    ? "needed"
    : execution?.status === "complete"
      ? prUrl
        ? "ready"
        : "blocked"
      : decision.status === "ready"
        ? "needed"
        : "needed";
  const reviewStatus: PublicWorkflowProofStepStatus = !repoConfigured
    ? "needed"
    : missingConfiguredPrLink
      ? "blocked"
    : review?.status === "pass" && reviewProofBound
      ? reviewerProcessSelected
        ? "ready"
        : "needed"
      : review?.status === "pass"
        ? "blocked"
      : execution?.status === "complete"
        ? "needed"
        : "needed";
  const logReady = Boolean(
    repoConfigured &&
      prUrl &&
      review?.status === "pass" &&
      reviewProofBound &&
      reviewerProcessSelected &&
      proposal &&
      wave.ledger.some(
        (event) =>
          event.type === "guardian_reviewed" && (event.message.includes(proposal.id) || wave.proposals.length === 1),
      ),
  );
  const steps: PublicWorkflowProofStep[] = [
    {
      id: "chat",
      label: "Project chat",
      status: chatReady ? "ready" : "needed",
      detail: chatReady ? "Project chat is the social source of truth." : "Connect the project chat before inviting builders.",
      evidenceUrl: chatReady ? wave.waveUrl : null,
      evidenceHash: chatReady ? hashValue(wave.waveUrl) : null,
    },
    {
      id: "decision",
      label: "Decision",
      ...decision,
    },
    {
      id: "pr",
      label: "Pull request",
      status: prStatus,
      detail: !repoConfigured
        ? "GitHub repo is a placeholder. Choose it before PR work can run."
        : missingConfiguredPrLink
          ? "PR record is complete but no PR link matches the configured repo."
        : execution?.status === "complete"
          ? humanizeLegacyCommandCopy(execution.summary)
          : "Approved work needs a GitHub PR record.",
      evidenceUrl: prUrl,
      evidenceHash: execution ? hashValue(execution) : null,
    },
    {
      id: "review",
      label: "Review",
      status: reviewStatus,
      detail: !repoConfigured
        ? "Review waits for a selected hook repo and PR record."
        : missingConfiguredPrLink
          ? "Review waits for a PR link that matches the configured repo."
        : review?.status === "pass" && !reviewProofBound
          ? "Review proof must be bound to the configured repo."
        : review?.status === "pass" && !reviewerProcessSelected
          ? "Review proof exists, but the reviewer process is still a placeholder."
        : review?.status === "pass"
          ? humanizeLegacyCommandCopy(review.summary)
          : "Reviewer proof is required before humans merge.",
      evidenceUrl: null,
      evidenceHash: review?.proof?.attestationHash ?? (review ? hashValue(review) : null),
    },
    {
      id: "log",
      label: "Log",
      status: !repoConfigured ? "needed" : missingConfiguredPrLink ? "blocked" : logReady ? "ready" : "needed",
      detail: !repoConfigured
        ? "Log waits for the selected hook repo and reviewed PR."
        : missingConfiguredPrLink
          ? "Log waits for a PR link that matches the configured repo."
        : review?.status === "pass" && !reviewProofBound
          ? "Log waits for review proof bound to the configured repo."
        : review?.status === "pass" && !reviewerProcessSelected
          ? "Log waits for the selected reviewer process."
        : logReady
          ? "Reviewed result is recorded in the project log."
          : "Share the reviewed result back to project chat.",
      evidenceUrl: null,
      evidenceHash: logReady ? hashValue(wave.ledger) : null,
    },
  ];
  const readyCount = steps.filter((step) => step.status === "ready").length;
  const blockedCount = steps.filter((step) => step.status === "blocked").length;

  return {
    summary: "Public proof of the chat, decision, PR, review, and log path for the first hook build.",
    sourceOfTruth: "project chat",
    codeSurface: "GitHub PR",
    readyCount,
    blockedCount,
    steps,
  };
}
