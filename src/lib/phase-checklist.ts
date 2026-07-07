import {
  pollApprovalPassedForWave,
  validateWaveDecisionReference,
  type CommandWave,
  type PollState,
} from "./command-waves";
import { reviewAgentIdentity } from "./agent-identities";
import { isPlaceholderValue } from "./env-placeholders";
import { guardianReviewProofBoundToConfiguredRepo } from "./guardian-review-proof";
import { gitHubPullRequestUrlsForRepo } from "./github/pr-evidence";
import { selectPhaseWork, type PhaseWork } from "./phase-work";

export type PhaseChecklistStatus = "done" | "active" | "waiting" | "blocked";

export type PhaseChecklistItem = {
  id: "project" | "proposal" | "decision" | "build" | "review" | "log";
  label: string;
  status: PhaseChecklistStatus;
  detail: string;
};

function isDecisionDone(proposalStatus: string, poll: PollState | null, waveUrl: string) {
  return ["reviewing", "complete"].includes(proposalStatus) || pollApprovalPassedForWave(poll, waveUrl, { requireUrl: true });
}

function setupCanRunCode(wave: CommandWave) {
  const waveText = wave.waveUrl.trim();
  const repoText = wave.repoUrl.trim();
  const repoLooksValid =
    /^git@github\.com:[^/\s]+\/[^/\s]+?(?:\.git)?$/.test(repoText) ||
    /^https?:\/\/github\.com\/[^/\s]+\/[^/\s?#]+(?:[?#].*)?$/.test(repoText) ||
    /^[^/\s]+\/[^/\s]+$/.test(repoText);

  return Boolean(waveText && repoLooksValid && !isPlaceholderValue(repoText));
}

function buildStatus(
  execution: PhaseWork["prExecution"],
  decisionDone: boolean,
  canRunCode: boolean,
  hasConfiguredPrLink: boolean,
): Pick<PhaseChecklistItem, "status" | "detail"> {
  if (!canRunCode) {
    return { status: "waiting", detail: "Build waits for a selected GitHub repo." };
  }

  if (execution?.status === "complete") {
    return hasConfiguredPrLink
      ? { status: "done", detail: "PR record is ready." }
      : { status: "blocked", detail: "PR record must link to the selected GitHub repo." };
  }

  if (execution?.status === "blocked") {
    return { status: "blocked", detail: "Build is blocked and needs attention." };
  }

  if (decisionDone) {
    return { status: "active", detail: "Approved work is ready for the PR build step." };
  }

  return { status: "waiting", detail: "Build waits for a recorded project decision." };
}

function reviewStatus(
  execution: PhaseWork["prExecution"],
  review: PhaseWork["prReview"],
  canRunCode: boolean,
  hasConfiguredPrLink: boolean,
  reviewProofBound: boolean,
  reviewerProcessSelected: boolean,
): Pick<PhaseChecklistItem, "status" | "detail"> {
  if (!canRunCode) {
    return { status: "waiting", detail: "Review waits for a PR from the selected GitHub repo." };
  }

  if (review?.status === "pass") {
    if (!reviewProofBound) {
      return { status: "blocked", detail: "Reviewer proof must be bound to the selected GitHub repo." };
    }

    return reviewerProcessSelected
      ? { status: "done", detail: "Reviewer proof and checks are recorded." }
      : { status: "active", detail: "Select the reviewer process before marking review complete." };
  }

  if (review && review.status !== "waiting") {
    return { status: "blocked", detail: `Review returned ${review.status.replaceAll("_", " ")}.` };
  }

  if (execution?.status === "complete") {
    return hasConfiguredPrLink
      ? { status: "active", detail: "PR record is ready for review." }
      : { status: "blocked", detail: "Review waits for a PR link that matches the selected GitHub repo." };
  }

  return { status: "waiting", detail: "Review waits for a PR record." };
}

function projectSetupItem(wave: CommandWave, canRunCode: boolean): Pick<PhaseChecklistItem, "label" | "status" | "detail"> {
  if (canRunCode) {
    return {
      label: "Choose project",
      status: "done",
      detail: "Project chat and GitHub repo are set.",
    };
  }

  if (wave.waveUrl.trim()) {
    return {
      label: "Select repo",
      status: "active",
      detail: "Select the GitHub repo before PR work can run.",
    };
  }

  return {
    label: "Choose project",
    status: "active",
    detail: "Set a project chat and GitHub repo.",
  };
}

export function createPhaseChecklist(wave: CommandWave): PhaseChecklistItem[] {
  const canRunCode = setupCanRunCode(wave);
  const phaseWork = selectPhaseWork(wave);
  const proposal = phaseWork.prProposal;
  const supportProposal = proposal ? null : (phaseWork.supportProposals[0] ?? null);
  const poll = phaseWork.prPoll;
  const execution = phaseWork.prExecution;
  const review = phaseWork.prReview;
  const hasConfiguredPrLink = Boolean(execution && gitHubPullRequestUrlsForRepo(execution.artifacts, wave.repoUrl).length);
  const reviewProofBound = guardianReviewProofBoundToConfiguredRepo(review, wave.repoUrl);
  const reviewerProcessSelected = reviewAgentIdentity.status !== "placeholder";
  const decisionDone = proposal ? isDecisionDone(proposal.status, poll, wave.waveUrl) : false;
  const decisionReferenceCheck = poll?.decision
    ? validateWaveDecisionReference({
        reference: poll.decision.url ?? poll.decision.dropId ?? "",
        waveUrl: wave.waveUrl,
        requireUrl: true,
      })
    : null;
  const build = buildStatus(execution, decisionDone, canRunCode, hasConfiguredPrLink);
  const reviewItem = reviewStatus(execution, review, canRunCode, hasConfiguredPrLink, reviewProofBound, reviewerProcessSelected);
  const projectItem = projectSetupItem(wave, canRunCode);
  const loggedReview = Boolean(
    canRunCode &&
      hasConfiguredPrLink &&
      reviewProofBound &&
      reviewerProcessSelected &&
      proposal &&
      review?.status === "pass" &&
      wave.ledger.some(
        (event) =>
          event.type === "guardian_reviewed" && (event.message.includes(proposal.id) || wave.proposals.length === 1),
      ),
  );

  return [
    {
      id: "project",
      label: projectItem.label,
      status: projectItem.status,
      detail: projectItem.detail,
    },
    {
      id: "proposal",
      label: "Propose work",
      status: proposal ? "done" : canRunCode ? "active" : "waiting",
      detail: proposal
        ? `${proposal.id}: ${proposal.title}`
        : supportProposal
          ? "Support item recorded. Write one PR-sized hook change."
          : "Write one PR-sized hook change.",
    },
    {
      id: "decision",
      label: "Decide",
      status: proposal
        ? proposal.status === "rejected" || poll?.status === "failed"
          ? "blocked"
          : decisionDone
            ? "done"
            : "active"
        : "waiting",
      detail: proposal
        ? poll
          ? poll.decision
            ? decisionReferenceCheck?.ok
              ? `Receipt recorded: ${poll.decision.url ?? poll.decision.dropId ?? "wave decision"}.`
              : (decisionReferenceCheck?.message ?? "Project decision receipt is not valid.")
            : poll.status === "passed"
              ? "Vote passed locally. Record the project decision URL."
              : `Vote is ${poll.status}: ${poll.yesVotes} yes, ${poll.noVotes} no.`
          : "No vote required by current rules."
        : "Decision waits for a proposal.",
    },
    {
      id: "build",
      label: "Build PR",
      status: build.status,
      detail: build.detail,
    },
    {
      id: "review",
      label: "Review",
      status: reviewItem.status,
      detail: reviewItem.detail,
    },
    {
      id: "log",
      label: "Log",
      status: loggedReview ? "done" : reviewItem.status === "blocked" ? "blocked" : reviewItem.status === "done" ? "active" : "waiting",
      detail: loggedReview
        ? "Audit log, discussion update draft, and launch packet are ready."
        : reviewItem.status === "blocked"
          ? "Resolve review evidence before logging the result."
        : "Log the result before sharing it back.",
    },
  ];
}
