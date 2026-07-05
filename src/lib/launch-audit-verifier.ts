import { launchOperatorChecklistLines, type LaunchStatusOpenItem } from "./launch-status-draft";
import { commandWaveProductCopy } from "./product-copy";

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
  statusDraft: string | null;
  stateEvidence: {
    waveStateHash: string;
    rulesHash: string;
    proposalCount: number;
    reviewCount: number;
    ledgerEventCount: number;
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

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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

function stringArrayContains(value: unknown, expected: string) {
  return Array.isArray(value) && value.some((item) => typeof item === "string" && item.includes(expected));
}

function isSha256Hash(value: unknown) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function authorityBoundaryReady(value: unknown) {
  const record = isRecord(value) ? value : null;

  return Boolean(
    record &&
      asString(record.phase) === "first_public_hook_build" &&
      asString(record.socialSourceOfTruth) === "project chat" &&
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

function stateEvidenceReady(value: unknown) {
  const record = isRecord(value) ? value : null;
  const proposalCount = asNumber(record?.proposalCount);
  const reviewCount = asNumber(record?.reviewCount);
  const ledgerEventCount = asNumber(record?.ledgerEventCount);

  return Boolean(
    record &&
      isSha256Hash(record.waveStateHash) &&
      isSha256Hash(record.rulesHash) &&
      Number.isInteger(proposalCount) &&
      Number.isInteger(reviewCount) &&
      Number.isInteger(ledgerEventCount) &&
      proposalCount !== null &&
      proposalCount >= 0 &&
      reviewCount !== null &&
      reviewCount >= 0 &&
      ledgerEventCount !== null &&
      ledgerEventCount >= 0,
  );
}

function collectStateEvidence(value: unknown): LaunchAuditVerificationResult["stateEvidence"] {
  if (!stateEvidenceReady(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    waveStateHash: record.waveStateHash as string,
    rulesHash: record.rulesHash as string,
    proposalCount: record.proposalCount as number,
    reviewCount: record.reviewCount as number,
    ledgerEventCount: record.ledgerEventCount as number,
  };
}

function statusDraftReady(value: unknown) {
  const draft = asString(value);

  return Boolean(
    draft &&
      draft.includes("Project launch status") &&
      draft.includes("Status:") &&
      draft.includes("Operator checklist:") &&
      draft.includes("Verification:") &&
      draft.includes("Guardrails:") &&
      draft.includes("does not approve work or move funds"),
  );
}

function contributionReportReady(value: unknown) {
  const record = isRecord(value) ? value : null;
  const method = isRecord(record?.method) ? record.method : null;

  return Boolean(
    record &&
      asString(record.mode) === "informational" &&
      asString(method?.id) === "visible_activity_v0" &&
      asString(method?.authority) === "Informational only" &&
      Array.isArray(record.contributors) &&
      stringArrayContains(record.scoringRubric, "report points") &&
      stringArrayContains(record.notes, "not a permission system"),
  );
}

function developerFeePlanReady(value: unknown) {
  const record = isRecord(value) ? value : null;

  return Boolean(
    record &&
      asString(record.mode) === "manual_review" &&
      stringArrayIncludes(record.requiredDecisions, "Builders approve the fee budget before any payment.") &&
      stringArrayIncludes(record.requiredDecisions, "Payments happen outside this app in the first phase.") &&
      stringArrayIncludes(record.blockedActions, "No automatic payouts.") &&
      stringArrayIncludes(record.blockedActions, "No wallet keys or treasury controls.") &&
      stringArrayIncludes(record.blockedActions, "No score-to-payment conversion without a separate vote."),
  );
}

function productContractReady(value: unknown) {
  const record = isRecord(value) ? value : null;

  return Boolean(
      record &&
      asString(record.name) === commandWaveProductCopy.headline &&
      asString(record.purpose) === commandWaveProductCopy.subhead &&
      stringArrayIncludes(record.workflow, "Choose project") &&
      stringArrayIncludes(record.workflow, "Discuss work") &&
      stringArrayIncludes(record.workflow, "Record decision") &&
      stringArrayIncludes(record.workflow, "Build PR") &&
      stringArrayIncludes(record.workflow, "Review") &&
      stringArrayIncludes(record.workflow, "Log result") &&
      stringArrayIncludes(record.publicSurfaces, "Project chat discussion") &&
      stringArrayIncludes(record.publicSurfaces, "GitHub PR record") &&
      stringArrayIncludes(record.publicSurfaces, "Build audit log"),
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
  const stateEvidence = collectStateEvidence(snapshot?.stateEvidence);
  const hasStateEvidence = Boolean(stateEvidence);
  const hasStatusDraft = statusDraftReady(snapshot?.statusDraft);
  const reports = isRecord(snapshot?.reports) ? snapshot.reports : null;
  const hasContributionReport = contributionReportReady(reports?.contribution);
  const hasDeveloperFeePlan = developerFeePlanReady(reports?.developerFee);
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
      "state_evidence",
      hasStateEvidence ? "pass" : "fail",
      hasStateEvidence
        ? "Launch audit is tied to hashed wave state evidence."
        : "Launch audit must publish wave state hash, rules hash, and record counts.",
    ),
    check(
      "status_draft",
      hasStatusDraft ? "pass" : "fail",
      hasStatusDraft
        ? "Human-readable launch status draft is published."
        : "Launch audit must publish a human-readable launch status draft with guardrails and verification links.",
    ),
    check(
      "contribution_report",
      hasContributionReport ? "pass" : "fail",
      hasContributionReport
        ? "Contribution report is published as informational evidence."
        : "Launch audit must publish contribution scoring as informational evidence, not authority.",
    ),
    check(
      "developer_fee_plan",
      hasDeveloperFeePlan ? "pass" : "fail",
      hasDeveloperFeePlan
        ? "Developer fee plan is manual and requires a separate decision."
        : "Launch audit must publish manual fee boundaries and block automatic payouts.",
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
    statusDraft: asString(snapshot?.statusDraft),
    stateEvidence,
    blockers,
    openItems,
    operatorChecklist: launchAudit ? launchOperatorChecklistLines(openItemRecords) : [],
    checks,
  };
}
