import { launchOperatorChecklistLines, type LaunchStatusOpenItem } from "./launch-status-draft";

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
  operatorChecklist: string[];
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

function checklistItem(value: unknown): LaunchStatusOpenItem {
  const record = isRecord(value) ? value : null;

  return {
    id: asString(record?.id) ?? "unknown",
    label: asString(record?.label) ?? "Unknown item",
    detail: asString(record?.detail) ?? "Open the launch audit for details.",
  };
}

function collectChecklistItems(value: unknown) {
  return Array.isArray(value) ? value.map(checklistItem) : [];
}

function stringArrayIncludes(value: unknown, expected: string) {
  return Array.isArray(value) && value.some((item) => item === expected);
}

function authorityBoundaryReady(value: unknown) {
  const record = isRecord(value) ? value : null;

  return Boolean(
    record &&
      asString(record.phase) === "first_public_hook_build" &&
      asString(record.socialSourceOfTruth) === "6529 wave" &&
      asString(record.codeSurface) === "GitHub PR" &&
      stringArrayIncludes(record.humansControl, "Merges") &&
      stringArrayIncludes(record.humansControl, "Deploys") &&
      stringArrayIncludes(record.humansControl, "Payments") &&
      stringArrayIncludes(record.humansControl, "Governance changes") &&
      stringArrayIncludes(record.appDoesNot, "Auto-merge PRs") &&
      stringArrayIncludes(record.appDoesNot, "Deploy contracts") &&
      stringArrayIncludes(record.appDoesNot, "Move funds"),
  );
}

function productContractReady(value: unknown) {
  const record = isRecord(value) ? value : null;

  return Boolean(
    record &&
      asString(record.name) === "Decentralized Coding" &&
      asString(record.purpose) === "Coordinate one public hook change from room discussion to reviewed PR." &&
      stringArrayIncludes(record.workflow, "Choose project") &&
      stringArrayIncludes(record.workflow, "Discuss work") &&
      stringArrayIncludes(record.workflow, "Record decision") &&
      stringArrayIncludes(record.workflow, "Build PR") &&
      stringArrayIncludes(record.workflow, "Review") &&
      stringArrayIncludes(record.workflow, "Log result") &&
      stringArrayIncludes(record.publicSurfaces, "6529 wave discussion") &&
      stringArrayIncludes(record.publicSurfaces, "GitHub PR record") &&
      stringArrayIncludes(record.publicSurfaces, "Command Waves audit log"),
  );
}

export function verifyLaunchAuditPayload(payload: unknown): LaunchAuditVerificationResult {
  const snapshot = unwrapSnapshot(payload);
  const launchAudit = isRecord(snapshot?.launchAudit) ? snapshot.launchAudit : null;
  const project = isRecord(snapshot?.project) ? snapshot.project : null;
  const nextAction = isRecord(launchAudit?.nextAction) ? launchAudit.nextAction : null;
  const setupCheckMode = asString(snapshot?.setupCheckMode);
  const hasProductContract = productContractReady(snapshot?.productContract);
  const hasAuthorityBoundary = authorityBoundaryReady(snapshot?.authorityBoundary);
  const launchStatus = asString(launchAudit?.status) ?? "unknown";
  const blockers = collectItemSummaries(launchAudit?.blockers);
  const openItemRecords = collectChecklistItems(launchAudit?.openItems);
  const openItems = openItemRecords.map((item) => (item.detail ? `${item.label}: ${item.detail}` : item.label));
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
      "product_contract",
      hasProductContract ? "pass" : "fail",
      hasProductContract
        ? "Phase 1 product contract is published."
        : "Launch audit must publish the simple project, discussion, decision, PR, review, and log flow.",
    ),
    check(
      "authority_boundary",
      hasAuthorityBoundary ? "pass" : "fail",
      hasAuthorityBoundary
        ? "Phase 1 authority boundary is published."
        : "Launch audit must publish who controls merges, deploys, payments, governance changes, and blocked app actions.",
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
    operatorChecklist: launchAudit ? launchOperatorChecklistLines(openItemRecords) : [],
    checks,
  };
}
