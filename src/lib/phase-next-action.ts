import type { PhaseChecklistItem } from "./phase-checklist";

export type PhaseNextActionStatus = "ready" | "action" | "waiting" | "blocked";

export type PhaseNextAction = {
  status: PhaseNextActionStatus;
  statusLabel: string;
  stepLabel: string;
  title: string;
  detail: string;
};

const actionCopyByStep: Record<
  PhaseChecklistItem["id"],
  {
    title: string;
    detail: string;
  }
> = {
  project: {
    title: "Set the project",
    detail: "Confirm one project chat and one GitHub repo before proposals start.",
  },
  proposal: {
    title: "Propose scoped hook work",
    detail: "Write one PR-sized change with limits, tests, and success criteria.",
  },
  decision: {
    title: "Get the project decision",
    detail: "Ask builders to decide, then record the project decision URL before work runs.",
  },
  build: {
    title: "Build the approved PR",
    detail: "Use the approved packet or prepared branch, then record the PR.",
  },
  review: {
    title: "Review the result",
    detail: "Check the PR against the approved work, rules, hook guardrails, and tests.",
  },
  log: {
    title: "Share the result",
    detail: "Review the discussion update draft, share it manually, and keep the launch packet with the PR audit trail.",
  },
};

function statusLabel(status: PhaseNextActionStatus) {
  if (status === "action") {
    return "next";
  }

  return status;
}

export function createPhaseNextAction(checklist: PhaseChecklistItem[]): PhaseNextAction {
  const blocked = checklist.find((item) => item.status === "blocked");

  if (blocked) {
    return {
      status: "blocked",
      statusLabel: statusLabel("blocked"),
      stepLabel: blocked.label,
      title: `Fix ${blocked.label.toLowerCase()}`,
      detail: blocked.detail,
    };
  }

  const active = checklist.find((item) => item.status === "active");

  if (active) {
    const copy =
      active.id === "project" && active.label === "Select repo"
        ? { title: "Select the repo", detail: active.detail }
        : actionCopyByStep[active.id];

    return {
      status: "action",
      statusLabel: statusLabel("action"),
      stepLabel: active.label,
      title: copy.title,
      detail: copy.detail,
    };
  }

  const waiting = checklist.find((item) => item.status === "waiting");

  if (waiting) {
    return {
      status: "waiting",
      statusLabel: statusLabel("waiting"),
      stepLabel: waiting.label,
      title: `Waiting for ${waiting.label.toLowerCase()}`,
      detail: waiting.detail,
    };
  }

  return {
    status: "ready",
    statusLabel: statusLabel("ready"),
    stepLabel: "Log",
    title: "Loop complete",
    detail: "The approved hook work has a PR, review, project update, and launch packet.",
  };
}
