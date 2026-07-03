export type LaunchAuditVerificationCheck = {
  id: string;
  status: "pass" | "fail";
  message: string;
};

export type LaunchAuditVerificationResult = {
  status: "pass" | "fail";
  launchStatus: string;
  generatedAt: string | null;
  projectName: string | null;
  nextAction: {
    title: string;
    detail: string;
  } | null;
  blockers: string[];
  openItems: string[];
  checks: LaunchAuditVerificationCheck[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function check(id: string, status: LaunchAuditVerificationCheck["status"], message: string): LaunchAuditVerificationCheck {
  return { id, status, message };
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

export function verifyLaunchAuditPayload(payload: unknown): LaunchAuditVerificationResult {
  const snapshot = unwrapSnapshot(payload);
  const launchAudit = isRecord(snapshot?.launchAudit) ? snapshot.launchAudit : null;
  const project = isRecord(snapshot?.project) ? snapshot.project : null;
  const nextAction = isRecord(launchAudit?.nextAction) ? launchAudit.nextAction : null;
  const setupCheckMode = asString(snapshot?.setupCheckMode);
  const launchStatus = asString(launchAudit?.status) ?? "unknown";
  const blockers = collectItemSummaries(launchAudit?.blockers);
  const openItems = collectItemSummaries(launchAudit?.openItems);
  const checks: LaunchAuditVerificationCheck[] = [
    check(
      "payload_shape",
      snapshot?.version === "command-wave-launch-audit-v0.1" && Boolean(launchAudit) ? "pass" : "fail",
      snapshot?.version === "command-wave-launch-audit-v0.1" && Boolean(launchAudit)
        ? "Launch audit payload is readable."
        : "Launch audit payload is missing or has the wrong version.",
    ),
    check(
      "launch_status",
      launchStatus === "ready" ? "pass" : "fail",
      launchStatus === "ready" ? "First public loop is ready." : `First public loop is ${launchStatus}.`,
    ),
    check(
      "remote_setup",
      setupCheckMode === "remote" ? "pass" : "fail",
      setupCheckMode === "remote"
        ? "Remote wave and repo setup checks ran."
        : "Launch audit must be generated with remote setup checks.",
    ),
    check(
      "blockers",
      blockers.length === 0 ? "pass" : "fail",
      blockers.length === 0 ? "No launch blockers reported." : `${blockers.length} launch blocker${blockers.length === 1 ? "" : "s"} reported.`,
    ),
  ];

  return {
    status: checks.some((item) => item.status === "fail") ? "fail" : "pass",
    launchStatus,
    generatedAt: asString(snapshot?.generatedAt),
    projectName: asString(project?.name),
    nextAction: nextAction
      ? {
          title: asString(nextAction.title) ?? "Check launch state",
          detail: asString(nextAction.detail) ?? "Open the launch audit for details.",
        }
      : null,
    blockers,
    openItems,
    checks,
  };
}
