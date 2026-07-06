import { githubRepoPlaceholder, orchestratorAgentIdentity, reviewAgentIdentity } from "./agent-identities";
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
      stringArrayIncludes(record.appDoesNot, "Move funds") &&
      asString(record.accessStatus) ===
        "Reputation, token, holder, allowlist, and QnA access notes are advisory until wired and verified.",
  );
}

function accessSnapshotReady(value: unknown) {
  const record = isRecord(value) ? value : null;

  return Boolean(
    record &&
      asString(record.label) &&
      asString(record.summary) &&
      Array.isArray(record.notes) &&
      record.notes.every((item) => typeof item === "string" && item.trim().length > 0),
  );
}

function agentBoundaryReady(value: unknown) {
  const record = isRecord(value) ? value : null;
  const orchestrator = isRecord(record?.orchestrator) ? record.orchestrator : null;
  const reviewer = isRecord(record?.reviewer) ? record.reviewer : null;
  const githubRepo = isRecord(record?.githubRepo) ? record.githubRepo : null;

  return Boolean(
    record &&
      orchestrator &&
      reviewer &&
      githubRepo &&
      asString(orchestrator.handle) === orchestratorAgentIdentity.handle &&
      asString(orchestrator.accountType) === orchestratorAgentIdentity.accountType &&
      asString(orchestrator.status) === orchestratorAgentIdentity.status &&
      asString(reviewer.status) === reviewAgentIdentity.status &&
      asString(reviewer.accountType) === reviewAgentIdentity.accountType &&
      asString(githubRepo.status) === githubRepoPlaceholder.status &&
      asString(githubRepo.label) === githubRepoPlaceholder.label &&
      asString(githubRepo.url) === githubRepoPlaceholder.url &&
      asString(githubRepo.description) === githubRepoPlaceholder.description,
  );
}

function projectSnapshotReady(value: unknown) {
  const record = isRecord(value) ? value : null;
  const currentWork = isRecord(record?.currentWork) ? record.currentWork : null;
  const decision = isRecord(record?.decision) ? record.decision : null;
  const repo = isRecord(record?.repo) ? record.repo : null;
  const nextStep = isRecord(record?.nextStep) ? record.nextStep : null;

  return Boolean(
    record &&
      asString(record.summary) &&
      currentWork &&
      asString(currentWork.title) &&
      asString(currentWork.status) &&
      asString(currentWork.detail) &&
      decision &&
      asString(decision.status) &&
      asString(decision.detail) &&
      repo &&
      asString(repo.status) &&
      asString(repo.label) &&
      nextStep &&
      asString(nextStep.label) &&
      asString(nextStep.status) &&
      asString(nextStep.detail) &&
      Array.isArray(record.latestChanges),
  );
}

function hookSafetyReady(value: unknown) {
  const record = isRecord(value) ? value : null;

  return Boolean(
    record &&
      record.immutableDefault === true &&
      asString(record.summary)?.includes("immutable by default") &&
      stringArrayContains(record.parameterPolicy, "explicit cap") &&
      stringArrayContains(record.parameterPolicy, "bound-focused tests") &&
      stringArrayContains(record.blockedInPhaseOne, "Upgradeable") &&
      stringArrayContains(record.blockedInPhaseOne, "delegatecall") &&
      stringArrayContains(record.blockedInPhaseOne, "Deploy scripts") &&
      stringArrayContains(record.reviewEvidence, "rules hash") &&
      stringArrayContains(record.reviewEvidence, "wave state hash"),
  );
}

function workflowProofReady(value: unknown) {
  const record = isRecord(value) ? value : null;
  const steps = Array.isArray(record?.steps) ? record.steps.filter(isRecord) : [];
  const stepById = new Map(steps.map((step) => [asString(step.id), step]));
  const requiredStepIds = ["chat", "decision", "pr", "review", "log"];

  return Boolean(
    record &&
      asString(record.summary)?.includes("chat, decision, PR, review, and log") &&
      asString(record.sourceOfTruth) === "project chat" &&
      asString(record.codeSurface) === "GitHub PR" &&
      asNumber(record.readyCount) !== null &&
      asNumber(record.blockedCount) !== null &&
      requiredStepIds.every((id) => {
        const step = stepById.get(id);
        const status = asString(step?.status);

        return (
          step &&
          asString(step.label) &&
          asString(step.detail) &&
          (status === "ready" || status === "needed" || status === "blocked")
        );
      }),
  );
}

function workflowProofComplete(value: unknown) {
  const requiredStepIds = ["chat", "decision", "pr", "review", "log"];
  const urlStepIds = new Set(["chat", "decision", "pr"]);
  const record = isRecord(value) ? value : null;
  const steps = Array.isArray(record?.steps) ? record.steps.filter(isRecord) : [];
  const stepById = new Map(steps.map((step) => [asString(step.id), step]));

  return Boolean(
    workflowProofReady(value) &&
      record &&
      asNumber(record.readyCount) === requiredStepIds.length &&
      asNumber(record.blockedCount) === 0 &&
      requiredStepIds.every((id) => {
        const step = stepById.get(id);

        return (
          step &&
          asString(step.status) === "ready" &&
          isSha256Hash(step.evidenceHash) &&
          (!urlStepIds.has(id) || Boolean(asString(step.evidenceUrl)))
        );
      }),
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
      stringArrayIncludes(record.workflow, "Discuss in chat") &&
      stringArrayIncludes(record.workflow, "Record decision") &&
      stringArrayIncludes(record.workflow, "Build PR") &&
      stringArrayIncludes(record.workflow, "Review") &&
      stringArrayIncludes(record.workflow, "Log result") &&
      stringArrayIncludes(record.publicSurfaces, "Project chat") &&
      stringArrayIncludes(record.publicSurfaces, "GitHub repo once configured") &&
      stringArrayIncludes(record.publicSurfaces, "Build audit log"),
  );
}

export function verifyLaunchAuditPayload(payload: unknown): LaunchAuditVerificationResult {
  const snapshot = unwrapSnapshot(payload);
  const launchAudit = isRecord(snapshot?.launchAudit) ? snapshot.launchAudit : null;
  const project = isRecord(snapshot?.project) ? snapshot.project : null;
  const nextAction = isRecord(launchAudit?.nextAction) ? launchAudit.nextAction : null;
  const setupCheckMode = asString(snapshot?.setupCheckMode);
  const hasProjectSnapshot = projectSnapshotReady(snapshot?.projectSnapshot);
  const hasHookSafety = hookSafetyReady(snapshot?.hookSafety);
  const hasWorkflowProof = workflowProofReady(snapshot?.workflowProof);
  const hasCompleteWorkflowProof = workflowProofComplete(snapshot?.workflowProof);
  const hasProductContract = productContractReady(snapshot?.productContract);
  const hasAuthorityBoundary = authorityBoundaryReady(snapshot?.authorityBoundary);
  const hasAccessSummary = accessSnapshotReady(snapshot?.access);
  const hasAgentBoundary = agentBoundaryReady(snapshot?.agents);
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
      "project_snapshot",
      hasProjectSnapshot ? "pass" : "fail",
      hasProjectSnapshot
        ? "Current project snapshot is published."
        : "Launch audit must publish current work, decision, repo state, next step, and recent changes.",
    ),
    check(
      "hook_safety",
      hasHookSafety ? "pass" : "fail",
      hasHookSafety
        ? "Immutable hook safety contract is published."
        : "Launch audit must publish immutable-hook, bounded-parameter, and blocked-action guardrails.",
    ),
    check(
      "workflow_proof",
      hasWorkflowProof ? "pass" : "fail",
      hasWorkflowProof
        ? "Public workflow proof is published."
        : "Launch audit must publish chat, decision, PR, review, and log proof steps.",
    ),
    check(
      "workflow_proof_ready",
      launchStatus !== "ready" || hasCompleteWorkflowProof ? "pass" : "fail",
      launchStatus !== "ready"
        ? "Workflow proof readiness is checked when launch status is ready."
        : hasCompleteWorkflowProof
          ? "Ready workflow proof covers chat, decision, PR, review, and log."
          : "Ready launch audit must publish ready chat, decision, PR, review, and log proof steps.",
    ),
    check(
      "authority_boundary",
      hasAuthorityBoundary ? "pass" : "fail",
      hasAuthorityBoundary
        ? "Phase 1 authority boundary is published."
        : "Launch audit must publish who controls merges, deploys, payments, governance changes, and blocked app actions.",
    ),
    check(
      "access_summary",
      hasAccessSummary ? "pass" : "fail",
      hasAccessSummary
        ? "Human-readable access summary is published."
        : "Launch audit must publish who can join and how access works.",
    ),
    check(
      "agent_boundary",
      hasAgentBoundary ? "pass" : "fail",
      hasAgentBoundary
        ? "Agent identities and placeholder boundaries are published."
        : "Launch audit must publish daemon, reviewer placeholder, and GitHub repo placeholder boundaries.",
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
