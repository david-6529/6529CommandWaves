import { verifyLaunchAuditPayload, type LaunchAuditVerificationCheck } from "./launch-audit-verifier";

export type ChatLaunchVerificationResult = {
  status: "pass" | "fail";
  chatLaunchStatus: string;
  launchStatus: string;
  generatedAt: string | null;
  projectName: string | null;
  nextAction: {
    title: string;
    detail: string;
  } | null;
  statusDraft: string | null;
  auditHash: string | null;
  blockers: string[];
  openItems: string[];
  checks: LaunchAuditVerificationCheck[];
};

const requiredFullAuditCheckIds = new Set([
  "payload_shape",
  "audit_hash",
  "chat_launch_status",
  "remote_setup",
  "product_contract",
  "project_snapshot",
  "hook_safety",
  "workflow_proof",
  "authority_boundary",
  "access_summary",
  "agent_boundary",
  "state_evidence",
  "public_state_endpoint",
  "project_index_endpoint",
  "status_draft",
  "launch_packet",
  "contribution_report",
  "developer_fee_plan",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function unwrapSnapshot(payload: unknown) {
  const record = isRecord(payload) ? payload : null;

  return isRecord(record?.audit) ? record.audit : record;
}

function itemSummary(value: unknown) {
  const record = isRecord(value) ? value : null;
  const label = asString(record?.label) ?? "Unknown item";
  const detail = asString(record?.detail);

  return detail ? `${label}: ${detail}` : label;
}

function collectItemSummaries(value: unknown) {
  return Array.isArray(value) ? value.map(itemSummary) : [];
}

function check(id: string, status: LaunchAuditVerificationCheck["status"], message: string): LaunchAuditVerificationCheck {
  return { id, status, message };
}

export function verifyChatLaunchAuditPayload(
  payload: unknown,
  options: Parameters<typeof verifyLaunchAuditPayload>[1] = {},
): ChatLaunchVerificationResult {
  const fullAudit = verifyLaunchAuditPayload(payload, options);
  const snapshot = unwrapSnapshot(payload);
  const launchAudit = isRecord(snapshot?.launchAudit) ? snapshot.launchAudit : null;
  const chatLaunch = isRecord(launchAudit?.chatLaunch) ? launchAudit.chatLaunch : null;
  const nextAction = isRecord(chatLaunch?.nextAction) ? chatLaunch.nextAction : null;
  const chatLaunchStatus = asString(chatLaunch?.status) ?? "unknown";
  const blockers = collectItemSummaries(chatLaunch?.blockers);
  const openItems = collectItemSummaries(chatLaunch?.openItems);
  const checks = [
    ...fullAudit.checks.filter((item) => requiredFullAuditCheckIds.has(item.id)),
    check(
      "chat_launch_ready",
      chatLaunchStatus === "ready" ? "pass" : "fail",
      chatLaunchStatus === "ready"
        ? "Project chat launch is ready."
        : `Project chat launch is ${chatLaunchStatus}.`,
    ),
    check(
      "chat_launch_open_items",
      blockers.length === 0 && openItems.length === 0 ? "pass" : "fail",
      blockers.length === 0 && openItems.length === 0
        ? "Project chat launch has no open items."
        : "Project chat launch still has open items.",
    ),
  ];

  return {
    status: checks.some((item) => item.status === "fail") ? "fail" : "pass",
    chatLaunchStatus,
    launchStatus: fullAudit.launchStatus,
    generatedAt: fullAudit.generatedAt,
    projectName: fullAudit.projectName,
    nextAction: nextAction
      ? {
          title: asString(nextAction.title) ?? "Check project chat launch",
          detail: asString(nextAction.detail) ?? "Open the launch audit for details.",
        }
      : null,
    statusDraft: fullAudit.statusDraft,
    auditHash: fullAudit.auditHash,
    blockers,
    openItems,
    checks,
  };
}
