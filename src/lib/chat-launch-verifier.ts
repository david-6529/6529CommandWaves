import { createCommandWaveStateHash } from "./command-wave-state-hash";
import { hookProjectIndexHashInput } from "./hook-project-index";
import { verifyLaunchAuditPayload, type LaunchAuditVerificationCheck } from "./launch-audit-verifier";
import { launchOperatorChecklistLines, type LaunchStatusOpenItem } from "./launch-status-draft";
import { publicProjectChatSettings } from "./public-project-snapshot";
import { hashValue } from "./run-manifest";

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
  chatLaunchHash: string | null;
  blockers: string[];
  openItems: string[];
  operatorChecklist: string[];
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

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isSha256Hash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
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

function collectOpenItemRecords(value: unknown): LaunchStatusOpenItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).flatMap((item) => {
    const id = asString(item.id);
    const label = asString(item.label);
    const detail = asString(item.detail);

    return id && label && detail ? [{ id, label, detail }] : [];
  });
}

function operatorChecklistFor(openItems: LaunchStatusOpenItem[]) {
  return openItems.length ? launchOperatorChecklistLines(openItems) : [];
}

function check(id: string, status: LaunchAuditVerificationCheck["status"], message: string): LaunchAuditVerificationCheck {
  return { id, status, message };
}

function launchStatusReady(value: unknown) {
  const status = asString(value);

  return status === "ready" || status === "needs_setup" || status === "blocked";
}

function chatLaunchHashInput(value: unknown) {
  const record = isRecord(value) ? value : null;

  if (!record) {
    return null;
  }

  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== "chatLaunchHash"));
}

type ChatLaunchVerificationOptions = Parameters<typeof verifyLaunchAuditPayload>[1];

type ChatLaunchStateEvidence = {
  waveStateHash: string;
  rulesHash: string;
  proposalCount: number;
  reviewCount: number;
  ledgerEventCount: number;
};

function collectStateEvidence(value: unknown): ChatLaunchStateEvidence | null {
  const record = isRecord(value) ? value : null;
  const proposalCount = asNumber(record?.proposalCount);
  const reviewCount = asNumber(record?.reviewCount);
  const ledgerEventCount = asNumber(record?.ledgerEventCount);

  if (
    !record ||
    !isSha256Hash(record.waveStateHash) ||
    !isSha256Hash(record.rulesHash) ||
    proposalCount === null ||
    reviewCount === null ||
    ledgerEventCount === null ||
    !Number.isInteger(proposalCount) ||
    !Number.isInteger(reviewCount) ||
    !Number.isInteger(ledgerEventCount) ||
    proposalCount < 0 ||
    reviewCount < 0 ||
    ledgerEventCount < 0
  ) {
    return null;
  }

  return {
    waveStateHash: record.waveStateHash,
    rulesHash: record.rulesHash,
    proposalCount,
    reviewCount,
    ledgerEventCount,
  };
}

function publicStateChatSettingsReady(value: unknown) {
  const record = isRecord(value) ? value : null;
  const projectSnapshot = isRecord(record?.projectSnapshot) ? record.projectSnapshot : null;
  const chat = isRecord(projectSnapshot?.chat) ? projectSnapshot.chat : null;
  const posting = isRecord(chat?.posting) ? chat.posting : null;
  const pace = isRecord(posting?.pace) ? posting.pace : null;
  const parser = isRecord(chat?.parser) ? chat.parser : null;

  return Boolean(
    chat &&
      asString(chat.id) === publicProjectChatSettings.id &&
      asString(chat.mode) === publicProjectChatSettings.mode &&
      asString(chat.label) === publicProjectChatSettings.label &&
      asString(chat.title) === publicProjectChatSettings.title &&
      asString(chat.composerLabel) === publicProjectChatSettings.composerLabel &&
      asString(posting?.label) === publicProjectChatSettings.posting.label &&
      asNumber(pace?.maxPosts) === publicProjectChatSettings.posting.pace.maxPosts &&
      asNumber(pace?.windowSeconds) === publicProjectChatSettings.posting.pace.windowSeconds &&
      asString(pace?.identity) === publicProjectChatSettings.posting.pace.identity &&
      asString(pace?.enforcedBy) === publicProjectChatSettings.posting.pace.enforcedBy &&
      asString(parser?.agent) === publicProjectChatSettings.parser.agent,
  );
}

function publicStateMatches(value: unknown, expected: ChatLaunchStateEvidence | null) {
  const record = isRecord(value) ? value : null;
  const wave = isRecord(record?.wave) ? record.wave : null;
  const rules = isRecord(wave?.rules) ? wave.rules : null;
  const proposals = Array.isArray(wave?.proposals) ? wave.proposals : null;
  const reviews = Array.isArray(wave?.reviews) ? wave.reviews : null;
  const ledger = Array.isArray(wave?.ledger) ? wave.ledger : null;
  const stateHash = asString(record?.stateHash);
  const waveStateHash = asString(record?.waveStateHash);

  return Boolean(
    record &&
      record.version === "command-wave-state-v0.1" &&
      wave &&
      rules &&
      proposals &&
      reviews &&
      ledger &&
      expected &&
      isSha256Hash(stateHash) &&
      isSha256Hash(waveStateHash) &&
      stateHash === createCommandWaveStateHash(record) &&
      waveStateHash === hashValue(wave) &&
      waveStateHash === expected.waveStateHash &&
      hashValue(rules) === expected.rulesHash &&
      proposals.length === expected.proposalCount &&
      reviews.length === expected.reviewCount &&
      ledger.length === expected.ledgerEventCount &&
      publicStateChatSettingsReady(record),
  );
}

function projectIndexMatches(value: unknown, project: Record<string, unknown> | null) {
  const record = isRecord(value) ? value : null;
  const projects = Array.isArray(record?.projects) ? record.projects.filter(isRecord) : [];
  const projectsHash = asString(record?.projectsHash);
  const activeProjectId = asString(record?.activeProjectId);
  const projectCount = asNumber(record?.projectCount);
  const expectedProjectId = asString(project?.id);
  const expectedWaveUrl = asString(project?.waveUrl);
  const expectedRepoUrl = asString(project?.repoUrl);
  const activeProject = projects.find((item) => asString(item.id) === expectedProjectId) ?? null;
  const repoMatches = expectedRepoUrl ? asString(activeProject?.repoUrl) === expectedRepoUrl : true;

  return Boolean(
    record &&
      record.version === "command-wave-projects-v0.1" &&
      project &&
      expectedProjectId &&
      expectedWaveUrl &&
      activeProjectId === expectedProjectId &&
      Number.isInteger(projectCount) &&
      projectCount === projects.length &&
      isSha256Hash(projectsHash) &&
      projectsHash === hashValue(hookProjectIndexHashInput(record)) &&
      activeProject &&
      asString(activeProject.waveUrl) === expectedWaveUrl &&
      repoMatches,
  );
}

function verifyChatLaunchSnapshotPayload(
  payload: unknown,
  options: ChatLaunchVerificationOptions = {},
): ChatLaunchVerificationResult | null {
  const snapshot = unwrapSnapshot(payload);
  const chatLaunch = isRecord(snapshot?.chatLaunch) ? snapshot.chatLaunch : null;
  const prLoop = isRecord(snapshot?.prLoop) ? snapshot.prLoop : null;
  const nextAction = isRecord(chatLaunch?.nextAction) ? chatLaunch.nextAction : null;
  const project = isRecord(snapshot?.project) ? snapshot.project : null;
  const chatLaunchStatus = asString(chatLaunch?.status) ?? "unknown";
  const launchStatus = asString(prLoop?.status) ?? "unknown";
  const blockers = collectItemSummaries(chatLaunch?.blockers);
  const openItems = collectItemSummaries(chatLaunch?.openItems);
  const openItemRecords = collectOpenItemRecords(chatLaunch?.openItems);
  const setupCheckMode = asString(snapshot?.setupCheckMode);
  const sourceAuditHash = asString(snapshot?.sourceAuditHash);
  const chatLaunchHash = asString(snapshot?.chatLaunchHash);
  const hashInput = chatLaunchHashInput(snapshot);
  const hasChatLaunchHash = Boolean(
    hashInput && isSha256Hash(chatLaunchHash) && chatLaunchHash === hashValue(hashInput),
  );
  const stateEvidence = collectStateEvidence(snapshot?.stateEvidence);
  const shouldVerifyPublicState = options.requirePublicState === true || typeof options.commandWaveState !== "undefined";
  const shouldVerifyProjectIndex = options.requireProjectIndex === true || typeof options.projectIndex !== "undefined";
  const hasPublicState = shouldVerifyPublicState ? publicStateMatches(options.commandWaveState, stateEvidence) : null;
  const hasProjectIndex = shouldVerifyProjectIndex ? projectIndexMatches(options.projectIndex, project) : null;

  if (snapshot?.version !== "command-wave-chat-launch-v0.1") {
    return null;
  }

  const checks = [
    check(
      "payload_shape",
      chatLaunch && prLoop ? "pass" : "fail",
      chatLaunch && prLoop ? "Chat launch payload is readable." : "Chat launch payload is missing chat launch or PR-loop state.",
    ),
    check(
      "audit_hash",
      isSha256Hash(sourceAuditHash) ? "pass" : "fail",
      isSha256Hash(sourceAuditHash)
        ? "Source launch audit hash is present."
        : "Chat launch payload must include the source launch audit hash.",
    ),
    check(
      "chat_launch_hash",
      hasChatLaunchHash ? "pass" : "fail",
      hasChatLaunchHash
        ? "Chat launch payload hash is valid."
        : "Chat launch payload must publish a valid hash for this payload.",
    ),
    check(
      "state_evidence",
      stateEvidence ? "pass" : "fail",
      stateEvidence
        ? "Chat launch audit is tied to hashed project state evidence."
        : "Chat launch audit must publish wave state hash, rules hash, and record counts.",
    ),
    ...(shouldVerifyPublicState
      ? [
          check(
            "public_state_endpoint",
            hasPublicState ? "pass" : "fail",
            hasPublicState
              ? "Public command-wave state matches the chat launch audit evidence."
              : "Public command-wave state must match the chat launch audit evidence.",
          ),
        ]
      : []),
    ...(shouldVerifyProjectIndex
      ? [
          check(
            "project_index_endpoint",
            hasProjectIndex ? "pass" : "fail",
            hasProjectIndex
              ? "Public project index includes the chat launch project."
              : "Public project index must include the chat launch project.",
          ),
        ]
      : []),
    check(
      "chat_launch_status",
      launchStatusReady(chatLaunchStatus) ? "pass" : "fail",
      launchStatusReady(chatLaunchStatus)
        ? "Project chat launch status is published."
        : "Chat launch payload must publish a valid project chat launch status.",
    ),
    check(
      "remote_setup",
      setupCheckMode === "remote" ? "pass" : "fail",
      setupCheckMode === "remote"
        ? "Remote project chat setup checks ran."
        : "Run the chat launch audit with ?remote=1 before inviting builders.",
    ),
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
    launchStatus,
    generatedAt: asString(snapshot?.generatedAt),
    projectName: asString(project?.name),
    nextAction: nextAction
      ? {
          title: asString(nextAction.title) ?? "Check project chat launch",
          detail: asString(nextAction.detail) ?? "Open the chat launch audit for details.",
        }
      : null,
    statusDraft: null,
    auditHash: sourceAuditHash,
    chatLaunchHash,
    blockers,
    openItems,
    operatorChecklist: operatorChecklistFor(openItemRecords),
    checks,
  };
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
  const openItemRecords = collectOpenItemRecords(chatLaunch?.openItems);
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
    chatLaunchHash: null,
    blockers,
    openItems,
    operatorChecklist: operatorChecklistFor(openItemRecords),
    checks,
  };
}

export function verifyChatLaunchPayload(
  payload: unknown,
  options: Parameters<typeof verifyLaunchAuditPayload>[1] = {},
): ChatLaunchVerificationResult {
  return verifyChatLaunchSnapshotPayload(payload, options) ?? verifyChatLaunchAuditPayload(payload, options);
}
