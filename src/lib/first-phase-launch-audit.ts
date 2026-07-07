import { validateWaveDecisionReference, type CommandWave } from "./command-waves";
import { guardianReviewProofBoundToConfiguredRepo } from "./guardian-review-proof";
import { configuredGitHubRepo, gitHubPullRequestUrlsForRepo } from "./github/pr-evidence";
import { participationGateNeedsAdvisoryNote } from "./participation-gates";
import type { PhaseChecklistItem, PhaseChecklistStatus } from "./phase-checklist";
import type { SetupCheckStatus, SetupValidation } from "./setup-validation";
import type { ReadinessCheck } from "./system/readiness";

export type FirstPhaseLaunchAuditStatus = "ready" | "needs_setup" | "blocked";
export type FirstPhaseLaunchAuditItemStatus = "ready" | "needed" | "blocked";

export type FirstPhaseLaunchAuditItem = {
  id: string;
  label: string;
  status: FirstPhaseLaunchAuditItemStatus;
  detail: string;
  source: "flow" | "readiness" | "setup";
};

export type FirstPhaseLaunchNextAction = {
  status: FirstPhaseLaunchAuditStatus;
  statusLabel: string;
  itemId: string | null;
  title: string;
  detail: string;
};

export type FirstPhaseLaunchAudit = {
  status: FirstPhaseLaunchAuditStatus;
  statusLabel: string;
  summary: string;
  nextAction: FirstPhaseLaunchNextAction;
  items: FirstPhaseLaunchAuditItem[];
  readyItems: FirstPhaseLaunchAuditItem[];
  blockers: FirstPhaseLaunchAuditItem[];
  openItems: FirstPhaseLaunchAuditItem[];
};

const launchReadinessCheckIds = new Set([
  "app_url",
  "initial_hook_project",
  "database",
  "command_wave_store",
  "admin_api_key",
  "6529_mode",
  "github_pr_adapter",
  "guardian_wave_state",
  "guardian_mode",
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

function includeLaunchReadinessCheck(check: ReadinessCheck) {
  return launchReadinessCheckIds.has(check.id);
}

function statusLabel(status: FirstPhaseLaunchAuditStatus) {
  if (status === "needs_setup") {
    return "checks needed";
  }

  return status;
}

function summaryFor(status: FirstPhaseLaunchAuditStatus) {
  if (status === "ready") {
    return "The hook project flow and launch checks are ready.";
  }

  if (status === "blocked") {
    return "The first public loop is blocked until failed checks are fixed.";
  }

  return "The local flow is usable. Invite contributors after setup checks pass.";
}

const launchActionCopyByItemId: Record<string, string> = {
  flow_project: "Set project chat and GitHub repo",
  flow_proposal: "Propose one PR-sized hook change",
  flow_decision: "Record the project decision",
  flow_build: "Build the approved PR",
  flow_review: "Review the PR result",
  flow_log: "Share the result back to chat",
  flow_wave_decision_receipt: "Record the project decision URL",
  flow_participation_notes: "Make participation notes advisory",
  flow_audit_packet: "Fix launch packet evidence",
  setup_not_checked: "Run launch setup check",
  setup_remote_check: "Run launch setup check",
  setup_wave_reachable: "Pick reachable project chat",
  setup_repo_reachable: "Pick reachable GitHub repo",
  setup_project_check: "Fix setup",
  setup_repo_required_files: "Check launch repo files",
  setup_repo_required_guardian_check: "Require guardian check",
  setup_repo_file_contributing_md: "Add contributor rules",
  setup_repo_file_github_pull_request_template_md: "Add PR template",
  readiness_not_checked: "Run readiness",
  readiness_app_url: "Set NEXT_PUBLIC_APP_URL",
  readiness_initial_hook_project: "Set first hook project",
  readiness_database: "Configure DATABASE_URL",
  readiness_command_wave_store: "Use durable storage",
  readiness_admin_api_key: "Set ADMIN_API_KEY",
  readiness_6529_mode: "Use live 6529 mode",
  readiness_github_pr_adapter: "Configure GitHub PR adapter",
  readiness_guardian_wave_state: "Connect guardian wave state",
};

function launchActionTitle(item: FirstPhaseLaunchAuditItem) {
  const explicitTitle = launchActionCopyByItemId[item.id];

  if (explicitTitle) {
    return explicitTitle;
  }

  if (item.status === "blocked") {
    return `Fix ${item.label}`;
  }

  return `Complete ${item.label}`;
}

function createNextAction({
  status,
  statusLabel,
  openItems,
}: {
  status: FirstPhaseLaunchAuditStatus;
  statusLabel: string;
  openItems: FirstPhaseLaunchAuditItem[];
}): FirstPhaseLaunchNextAction {
  if (status === "ready") {
    return {
      status,
      statusLabel,
      itemId: null,
      title: "Start the first public loop",
      detail: "Post the launch brief, invite contributors, and keep each PR tied to a project decision.",
    };
  }

  const item = openItems[0];

  if (!item) {
    return {
      status,
      statusLabel,
      itemId: null,
      title: "Check launch state",
      detail: "Run launch checks again before inviting contributors.",
    };
  }

  return {
    status,
    statusLabel,
    itemId: item.id,
    title: launchActionTitle(item),
    detail: item.detail,
  };
}

function openItemWeight(item: FirstPhaseLaunchAuditItem) {
  return item.status === "blocked" ? 0 : 1;
}

function setupItemStatus(status: SetupCheckStatus): FirstPhaseLaunchAuditItemStatus {
  if (status === "pass") {
    return "ready";
  }

  if (status === "fail") {
    return "blocked";
  }

  return "needed";
}

function setupValidationItems(setupValidation: SetupValidation | null | undefined): FirstPhaseLaunchAuditItem[] {
  if (!setupValidation) {
    return [
      {
        id: "setup_not_checked",
        label: "Setup check",
        status: "needed",
    detail: "Verify the project chat, repo, contributor rules, PR template, and required guardian check before inviting contributors.",
        source: "setup",
      },
    ];
  }

  if (!setupValidation.canSave) {
    const firstFailure = setupValidation.checks.find((item) => item.status === "fail");
    const failureId =
      firstFailure?.id === "wave_reachable" || firstFailure?.id === "repo_reachable"
        ? `setup_${firstFailure.id}`
        : "setup_project_check";
    const failureLabel =
      firstFailure?.id === "wave_reachable"
        ? "Project chat"
        : firstFailure?.id === "repo_reachable"
          ? "GitHub repo"
          : "Setup check";

    return [
      {
        id: failureId,
        label: failureLabel,
        status: "blocked",
        detail: firstFailure?.message ?? "Fix the project chat and GitHub repo before inviting contributors.",
        source: "setup",
      },
    ];
  }

  const launchChecks = setupValidation.checks.filter(
    (item) =>
      item.id === "wave_reachable" ||
      item.id === "repo_reachable" ||
      item.id === "repo_required_files" ||
      item.id === "repo_required_guardian_check" ||
      item.id.startsWith("repo_file_"),
  );

  if (!launchChecks.length) {
    return [
      {
        id: "setup_remote_check",
        label: "Setup check",
        status: "needed",
        detail: "Run setup check to verify the project chat, repo, contributor rules, PR template, and required guardian check.",
        source: "setup",
      },
    ];
  }

  return launchChecks.map((item) => ({
    id: `setup_${item.id}`,
    label: item.label,
    status: setupItemStatus(item.status),
    detail: item.message,
    source: "setup",
  }));
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
      requireUrl: true,
    });

    if (!referenceCheck.ok) {
      return [
        {
          id: "flow_wave_decision_receipt",
          label: "Project decision receipt",
          status: "blocked",
          detail: referenceCheck.message,
          source: "flow",
        },
      ];
    }

    return [
      {
        id: "flow_wave_decision_receipt",
        label: "Project decision receipt",
        status: "ready",
        detail: `Decision record exists for ${proposal.id}.`,
        source: "flow",
      },
    ];
  }

  return [
    {
      id: "flow_wave_decision_receipt",
      label: "Project decision receipt",
      status: "needed",
      detail: "Record the project decision URL before the PR work is launch-ready.",
      source: "flow",
    },
  ];
}

function hasGithubPrLinkForRepo(artifacts: string[], repoUrl: string | null | undefined) {
  return gitHubPullRequestUrlsForRepo(artifacts, repoUrl).length > 0;
}

function participationNotesItem(wave: CommandWave | null | undefined): FirstPhaseLaunchAuditItem[] {
  if (!wave) {
    return [];
  }

  if (wave.gates.some(participationGateNeedsAdvisoryNote)) {
    return [
      {
        id: "flow_participation_notes",
        label: "Participation notes",
        status: "blocked",
        detail:
          "Participation notes must be advisory until live reputation, token, holder, allowlist, or QnA enforcement is wired.",
        source: "flow",
      },
    ];
  }

  return [
    {
      id: "flow_participation_notes",
      label: "Participation notes",
      status: "ready",
      detail: wave.gates.length
        ? "Participation notes are advisory and do not grant permissions."
        : "No participation notes recorded.",
      source: "flow",
    },
  ];
}

function auditPacketItem(wave: CommandWave | null | undefined): FirstPhaseLaunchAuditItem[] {
  const proposal = wave?.proposals.find((item) => item.kind === "open_pr") ?? null;

  if (!proposal) {
    return [];
  }

  const execution = wave?.executions.find((item) => item.proposalId === proposal.id) ?? null;
  const review = wave?.reviews.find((item) => item.proposalId === proposal.id) ?? null;

  if (review?.status === "pass" && execution?.status === "complete") {
    if (!configuredGitHubRepo(wave?.repoUrl)) {
      return [
        {
          id: "flow_audit_packet",
          label: "Audit packet",
          status: "blocked",
          detail: "Launch packet needs a configured GitHub repo before contributors audit it.",
          source: "flow",
        },
      ];
    }

    if (!hasGithubPrLinkForRepo(execution.artifacts, wave?.repoUrl)) {
      return [
        {
          id: "flow_audit_packet",
          label: "Audit packet",
          status: "blocked",
          detail: "Launch packet needs a GitHub PR link for the configured repo before contributors audit it.",
          source: "flow",
        },
      ];
    }

    if (!review.proof) {
      return [
        {
          id: "flow_audit_packet",
          label: "Audit packet",
          status: "blocked",
          detail: "Launch packet needs Guardian review proof before contributors audit it.",
          source: "flow",
        },
      ];
    }

    if (!guardianReviewProofBoundToConfiguredRepo(review, wave?.repoUrl)) {
      return [
        {
          id: "flow_audit_packet",
          label: "Audit packet",
          status: "blocked",
          detail: "Launch packet needs Guardian review proof bound to the configured repo before contributors audit it.",
          source: "flow",
        },
      ];
    }

    return [
      {
        id: "flow_audit_packet",
        label: "Audit packet",
        status: "ready",
        detail: "Launch packet can include PR, review proof, contribution, and fee records.",
        source: "flow",
      },
    ];
  }

  return [
    {
      id: "flow_audit_packet",
      label: "Audit packet",
      status: "needed",
      detail: "Finish PR build and review before preparing the launch packet.",
      source: "flow",
    },
  ];
}

export function createFirstPhaseLaunchAudit({
  phaseChecklist,
  readinessChecks,
  setupValidation,
  wave,
}: {
  phaseChecklist: PhaseChecklistItem[];
  readinessChecks?: ReadinessCheck[] | null;
  setupValidation?: SetupValidation | null;
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
        .filter(includeLaunchReadinessCheck)
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
          detail: "Run readiness before inviting contributors.",
          source: "readiness",
        },
      ];

  const items = [
    ...flowItems,
    ...setupValidationItems(setupValidation),
    ...decisionReceiptItem(wave),
    ...participationNotesItem(wave),
    ...auditPacketItem(wave),
    ...readinessItems,
  ];
  const readyItems = items.filter((item) => item.status === "ready");
  const blockers = items.filter((item) => item.status === "blocked");
  const openItems = items
    .filter((item) => item.status !== "ready")
    .toSorted((left, right) => openItemWeight(left) - openItemWeight(right));
  const status: FirstPhaseLaunchAuditStatus = blockers.length ? "blocked" : openItems.length ? "needs_setup" : "ready";
  const statusText = statusLabel(status);

  return {
    status,
    statusLabel: statusText,
    summary: summaryFor(status),
    nextAction: createNextAction({ status, statusLabel: statusText, openItems }),
    items,
    readyItems,
    blockers,
    openItems,
  };
}
