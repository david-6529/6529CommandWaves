import type { PhaseChecklistItem, PhaseChecklistStatus } from "./phase-checklist";
import type { ReadinessCheck } from "./system/readiness";

export type FirstPhaseLaunchAuditStatus = "ready" | "needs_setup" | "blocked";
export type FirstPhaseLaunchAuditItemStatus = "ready" | "needed" | "blocked";

export type FirstPhaseLaunchAuditItem = {
  id: string;
  label: string;
  status: FirstPhaseLaunchAuditItemStatus;
  detail: string;
  source: "flow" | "readiness";
};

export type FirstPhaseLaunchAudit = {
  status: FirstPhaseLaunchAuditStatus;
  statusLabel: string;
  summary: string;
  items: FirstPhaseLaunchAuditItem[];
  blockers: FirstPhaseLaunchAuditItem[];
  openItems: FirstPhaseLaunchAuditItem[];
};

const launchReadinessCheckIds = new Set([
  "app_url",
  "database",
  "command_wave_store",
  "admin_api_key",
  "cron_secret",
  "rate_limit_salt",
  "6529_mode",
  "github_pr_adapter",
  "guardian_wave_state",
]);

function phaseItemStatus(status: PhaseChecklistStatus): FirstPhaseLaunchAuditItemStatus {
  if (status === "done") {
    return "ready";
  }

  if (status === "blocked") {
    return "blocked";
  }

  return "needed";
}

function readinessItemStatus(status: ReadinessCheck["status"]): FirstPhaseLaunchAuditItemStatus {
  if (status === "pass") {
    return "ready";
  }

  if (status === "fail") {
    return "blocked";
  }

  return "needed";
}

function statusLabel(status: FirstPhaseLaunchAuditStatus) {
  if (status === "needs_setup") {
    return "needs setup";
  }

  return status;
}

function summaryFor(status: FirstPhaseLaunchAuditStatus) {
  if (status === "ready") {
    return "The hook project flow and public launch checks are ready.";
  }

  if (status === "blocked") {
    return "Public launch is blocked until failed checks are fixed.";
  }

  return "The local flow is usable. Public launch still needs setup.";
}

function openItemWeight(item: FirstPhaseLaunchAuditItem) {
  return item.status === "blocked" ? 0 : 1;
}

export function createFirstPhaseLaunchAudit({
  phaseChecklist,
  readinessChecks,
}: {
  phaseChecklist: PhaseChecklistItem[];
  readinessChecks?: ReadinessCheck[] | null;
}): FirstPhaseLaunchAudit {
  const flowItems: FirstPhaseLaunchAuditItem[] = phaseChecklist.map((item) => ({
    id: `flow_${item.id}`,
    label: item.label,
    status: phaseItemStatus(item.status),
    detail: item.detail,
    source: "flow",
  }));
  const readinessItems: FirstPhaseLaunchAuditItem[] = readinessChecks
    ? readinessChecks
        .filter((check) => launchReadinessCheckIds.has(check.id))
        .map((check) => ({
          id: `readiness_${check.id}`,
          label: check.label,
          status: readinessItemStatus(check.status),
          detail: check.message,
          source: "readiness",
        }))
    : [
        {
          id: "readiness_not_checked",
          label: "Readiness check",
          status: "needed",
          detail: "Run readiness before public launch.",
          source: "readiness",
        },
      ];

  const items = [...flowItems, ...readinessItems];
  const blockers = items.filter((item) => item.status === "blocked");
  const openItems = items
    .filter((item) => item.status !== "ready")
    .toSorted((left, right) => openItemWeight(left) - openItemWeight(right));
  const status: FirstPhaseLaunchAuditStatus = blockers.length ? "blocked" : openItems.length ? "needs_setup" : "ready";

  return {
    status,
    statusLabel: statusLabel(status),
    summary: summaryFor(status),
    items,
    blockers,
    openItems,
  };
}
