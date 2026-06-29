import {
  pollApprovalPassedForWave,
  validateWaveDecisionReference,
  type CommandWave,
  type PollState,
} from "./command-waves";
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

  return Boolean(waveText && repoLooksValid);
}

function buildStatus(
  execution: PhaseWork["prExecution"],
  decisionDone: boolean,
): Pick<PhaseChecklistItem, "status" | "detail"> {
  if (execution?.status === "complete") {
    return { status: "done", detail: "PR build evidence is recorded." };
  }

  if (execution?.status === "blocked") {
    return { status: "blocked", detail: "Build is blocked and needs attention." };
  }

  if (decisionDone) {
    return { status: "active", detail: "Approved work is ready for the PR build step." };
  }

  return { status: "waiting", detail: "Build waits for a recorded wave decision." };
}

function reviewStatus(
  execution: PhaseWork["prExecution"],
  review: PhaseWork["prReview"],
): Pick<PhaseChecklistItem, "status" | "detail"> {
  if (review?.status === "pass") {
    return { status: "done", detail: "Reviewer proof and checks are recorded." };
  }

  if (review && review.status !== "waiting") {
    return { status: "blocked", detail: `Review returned ${review.status.replaceAll("_", " ")}.` };
  }

  if (execution?.status === "complete") {
    return { status: "active", detail: "Execution evidence is ready for review." };
  }

  return { status: "waiting", detail: "Review waits for execution evidence." };
}

export function createPhaseChecklist(wave: CommandWave): PhaseChecklistItem[] {
  const canRunCode = setupCanRunCode(wave);
  const phaseWork = selectPhaseWork(wave);
  const proposal = phaseWork.prProposal;
  const supportProposal = proposal ? null : (phaseWork.supportProposals[0] ?? null);
  const poll = phaseWork.prPoll;
  const execution = phaseWork.prExecution;
  const review = phaseWork.prReview;
  const decisionDone = proposal ? isDecisionDone(proposal.status, poll, wave.waveUrl) : false;
  const decisionReferenceCheck = poll?.decision
    ? validateWaveDecisionReference({
        reference: poll.decision.url ?? poll.decision.dropId ?? "",
        waveUrl: wave.waveUrl,
        requireUrl: true,
      })
    : null;
  const build = buildStatus(execution, decisionDone);
  const reviewItem = reviewStatus(execution, review);
  const loggedReview = Boolean(
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
      label: "Choose project",
      status: canRunCode ? "done" : "active",
      detail: canRunCode ? "Builder wave and GitHub repo are set." : "Set a valid builder wave and GitHub repo.",
    },
    {
      id: "proposal",
      label: "Propose work",
      status: proposal ? "done" : canRunCode ? "active" : "waiting",
      detail: proposal
        ? `${proposal.id}: ${proposal.title}`
        : supportProposal
          ? "Support command recorded. Write one PR-sized hook command."
          : "Write one PR-sized hook command.",
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
              : (decisionReferenceCheck?.message ?? "6529 decision receipt is not valid.")
            : poll.status === "passed"
              ? "Vote passed locally. Record the 6529 decision URL."
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
      status: loggedReview ? "done" : review?.status === "pass" ? "active" : "waiting",
      detail: loggedReview
        ? "Audit log, discussion update draft, and launch packet are ready."
        : "Log the result before sharing it back.",
    },
  ];
}
