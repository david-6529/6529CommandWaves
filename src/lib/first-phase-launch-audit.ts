import { validateWaveDecisionReference, type CommandWave } from "./command-waves";
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

function decisionReceiptItem(wave: CommandWave | null | undefined): FirstPhaseLaunchAuditItem[] {
  const proposal = wave?.proposals.find((item) => item.kind === "open_pr") ?? null;

  if (!proposal) {
    return [];
  }

  const poll = wave?.polls.find((item) => item.proposalId === proposal.id) ?? null;
  const receipt = poll?.decision ?? null;

  if (receipt) {
    const referenceCheck = validateWaveDecisionReference({
      reference: receipt.url ?? receipt.dropId ?? "",
      waveUrl: wave?.waveUrl ?? "",
    });

    if (!referenceCheck.ok) {
      return [
        {
          id: "flow_wave_decision_receipt",
          label: "Wave decision receipt",
          status: "blocked",
          detail: referenceCheck.message,
          source: "flow",
        },
      ];
    }

    return [
      {
        id: "flow_wave_decision_receipt",
        label: "Wave decision receipt",
        status: "ready",
        detail: `Decision evidence recorded for ${proposal.id}.`,
        source: "flow",
      },
    ];
  }

  return [
    {
      id: "flow_wave_decision_receipt",
      label: "Wave decision receipt",
      status: "needed",
      detail: "Record the 6529 decision URL or drop id before public launch.",
      source: "flow",
    },
  ];
}

export function createFirstPhaseLaunchAudit({
  phaseChecklist,
  readinessChecks,
  wave,
}: {
  phaseChecklist: PhaseChecklistItem[];
  readinessChecks?: ReadinessCheck[] | null;
  wave?: CommandWave | null;
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

  const items = [...flowItems, ...decisionReceiptItem(wave), ...readinessItems];
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
