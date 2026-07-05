import { pollApprovalPassedForWave, type CommandWave } from "./command-waves";
import { selectPhaseWork } from "./phase-work";

export type HookProgressStatus = "done" | "current" | "waiting" | "blocked";

export type HookProgressStep = {
  id: "discuss" | "decide" | "build" | "review";
  label: string;
  status: HookProgressStatus;
  detail: string;
};

function discussionStep(detail: string, status: HookProgressStatus = "current"): HookProgressStep {
  return {
    id: "discuss",
    label: "Discuss",
    status,
    detail,
  };
}

function waitingSteps(hasDraft: boolean): HookProgressStep[] {
  return [
    {
      id: "decide",
      label: "Decide",
      status: "waiting",
      detail: hasDraft ? "Save proposal first." : "Waits for a proposal.",
    },
    { id: "build", label: "PR", status: "waiting", detail: "Waits for a decision." },
    { id: "review", label: "Review", status: "waiting", detail: "Waits for a PR." },
  ];
}

export function createHookProgress(wave: CommandWave, draftTitle = ""): HookProgressStep[] {
  const phaseWork = selectPhaseWork(wave);
  const proposal = phaseWork.prProposal;
  const poll = phaseWork.prPoll;
  const execution = phaseWork.prExecution;
  const review = phaseWork.prReview;
  const nextTitle = draftTitle.trim();

  if (!proposal || review?.status === "pass") {
    return [
      discussionStep(nextTitle ? "Shape this draft in chat." : "Pick one small hook change."),
      ...waitingSteps(Boolean(nextTitle)),
    ];
  }

  const decisionBlocked = proposal.status === "rejected" || poll?.status === "failed";
  const decisionDone =
    ["reviewing", "complete"].includes(proposal.status) ||
    pollApprovalPassedForWave(poll, wave.waveUrl, { requireUrl: true });
  const buildBlocked = execution?.status === "blocked";
  const buildDone = execution?.status === "complete";
  const reviewBlocked = Boolean(review && review.status !== "waiting");

  return [
    discussionStep("Proposal is recorded.", "done"),
    {
      id: "decide",
      label: "Decide",
      status: decisionBlocked ? "blocked" : decisionDone ? "done" : "current",
      detail: decisionBlocked
        ? "Decision needs attention."
        : decisionDone
          ? "Decision receipt recorded."
          : "Record the project decision.",
    },
    {
      id: "build",
      label: "PR",
      status: buildBlocked ? "blocked" : buildDone ? "done" : decisionDone ? "current" : "waiting",
      detail: buildBlocked
        ? "PR work is blocked."
        : buildDone
          ? "PR recorded."
          : decisionDone
            ? "Build or attach the approved PR."
            : "Waits for the decision.",
    },
    {
      id: "review",
      label: "Review",
      status: reviewBlocked ? "blocked" : buildDone ? "current" : "waiting",
      detail: reviewBlocked
        ? "Review needs changes."
        : buildDone
          ? "Check the PR against the rules."
          : "Waits for a PR.",
    },
  ];
}
