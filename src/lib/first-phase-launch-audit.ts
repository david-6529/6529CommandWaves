import { validateWaveDecisionReference, type CommandWave } from "./command-waves";
import { isPlaceholderValue } from "./env-placeholders";
import { guardianReviewProofBoundToConfiguredRepo } from "./guardian-review-proof";
import { configuredGitHubRepo, gitHubPullRequestUrlsForRepo } from "./github/pr-evidence";
import { participationGateNeedsAdvisoryNote } from "./participation-gates";
import { reviewAgentIdentity } from "./agent-identities";
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

export type FirstPhaseLaunchAuditTrack = {
  status: FirstPhaseLaunchAuditStatus;
  statusLabel: string;
  summary: string;
  nextAction: FirstPhaseLaunchNextAction;
  items: FirstPhaseLaunchAuditItem[];
  readyItems: FirstPhaseLaunchAuditItem[];
  blockers: FirstPhaseLaunchAuditItem[];
  openItems: FirstPhaseLaunchAuditItem[];
};

export type FirstPhaseLaunchAudit = FirstPhaseLaunchAuditTrack & {
  chatLaunch: FirstPhaseLaunchAuditTrack;
};

const launchReadinessCheckIds = new Set([
  "app_url",
  "initial_hook_project",
  "database",
  "command_wave_store",
  "admin_api_key",
  "6529_mode",
  "6529_chat_posting",
  "github_pr_adapter",
  "guardian_wave_state",
  "guardian_mode",
]);

const chatLaunchReadinessCheckIds = new Set([
  "app_url",
  "initial_hook_project",
  "database",
  "command_wave_store",
  "admin_api_key",
  "6529_mode",
  "6529_chat_posting",
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

function includeChatLaunchReadinessCheck(check: ReadinessCheck) {
  return chatLaunchReadinessCheckIds.has(check.id);
}

function statusLabel(status: FirstPhaseLaunchAuditStatus) {
  if (status === "needs_setup") {
    return "checks needed";
  }

  return status;
}

function chatSummaryFor(status: FirstPhaseLaunchAuditStatus) {
  if (status === "ready") {
    return "The project chat workspace is ready to invite builders.";
  }

  if (status === "blocked") {
    return "The project chat launch is blocked until failed checks are fixed.";
  }

  return "The project chat workspace needs setup before inviting builders.";
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
  flow_project_decision_link: "Record the project decision URL",
  flow_participation_notes: "Make participation notes advisory",
  flow_audit_packet: "Fix launch packet evidence",
  setup_not_checked: "Run launch setup check",
  setup_remote_check: "Run launch setup check",
  setup_wave_reachable: "Pick reachable project chat",
  setup_repo_reachable: "Pick reachable GitHub repo",
  setup_repo_placeholder: "Repo placeholder",
  setup_project_check: "Fix setup",
  setup_repo_required_files: "Check launch repo files",
  setup_repo_required_guardian_check: "Require guardian check",
  setup_repo_file_contributing_md: "Add contributor rules",
  setup_repo_file_github_pull_request_template_md: "Add PR template",
  setup_repo_file_github_workflows_guardian_review_yml: "Add guardian workflow",
  setup_review_agent_placeholder: "Select reviewer process",
  readiness_not_checked: "Run readiness",
  readiness_app_url: "Set NEXT_PUBLIC_APP_URL",
  readiness_initial_hook_project: "Set first hook project",
  readiness_database: "Configure DATABASE_URL",
  readiness_command_wave_store: "Use durable storage",
  readiness_admin_api_key: "Set ADMIN_API_KEY",
  readiness_6529_mode: "Use live 6529 mode",
  readiness_6529_chat_posting: "Configure project chat posting",
  readiness_github_pr_adapter: "Configure GitHub PR adapter",
  readiness_guardian_wave_state: "Connect guardian wave state",
  chat_setup_not_checked: "Run project chat check",
  chat_setup_remote_check: "Run project chat check",
  chat_wave_format: "Set project chat",
  chat_wave_reachable: "Pick reachable project chat",
};

function launchActionTitle(item: FirstPhaseLaunchAuditItem) {
  if (item.id === "flow_project" && item.label === "Repo placeholder") {
    return "Repo placeholder";
  }

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
  readyTitle = "Start the first public loop",
  readyDetail = "Post the launch brief, invite contributors, and keep each PR tied to a project decision.",
}: {
  status: FirstPhaseLaunchAuditStatus;
  statusLabel: string;
  openItems: FirstPhaseLaunchAuditItem[];
  readyTitle?: string;
  readyDetail?: string;
}): FirstPhaseLaunchNextAction {
  if (status === "ready") {
    return {
      status,
      statusLabel,
      itemId: null,
      title: readyTitle,
      detail: readyDetail,
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

function trackFromItems(
  items: FirstPhaseLaunchAuditItem[],
  summary: (status: FirstPhaseLaunchAuditStatus) => string,
  readyTitle?: string,
  readyDetail?: string,
): FirstPhaseLaunchAuditTrack {
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
    summary: summary(status),
    nextAction: createNextAction({ status, statusLabel: statusText, openItems, readyTitle, readyDetail }),
    items,
    readyItems,
    blockers,
    openItems,
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
        detail: "Verify the project chat, repo, contributor rules, PR template, guardian workflow, and required guardian check before inviting contributors.",
        source: "setup",
      },
    ];
  }

  if (!setupValidation.canSave) {
    const firstFailure = setupValidation.checks.find((item) => item.status === "fail");
    const failureId =
      firstFailure?.id === "wave_reachable" || firstFailure?.id === "repo_reachable" || firstFailure?.id === "repo_placeholder"
        ? `setup_${firstFailure.id}`
        : "setup_project_check";
    const failureLabel =
      firstFailure?.id === "wave_reachable"
        ? "Project chat"
        : firstFailure?.id === "repo_reachable" || firstFailure?.id === "repo_placeholder"
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
      item.id === "repo_placeholder" ||
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
        detail: "Run setup check to verify the project chat, repo, contributor rules, PR template, guardian workflow, and required guardian check.",
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

function chatSetupItems(setupValidation: SetupValidation | null | undefined): FirstPhaseLaunchAuditItem[] {
  if (!setupValidation) {
    return [
      {
        id: "chat_setup_not_checked",
        label: "Project chat check",
        status: "needed",
        detail: "Run setup check to verify the project chat before inviting builders.",
        source: "setup",
      },
    ];
  }

  const waveFailure = setupValidation.checks.find(
    (item) => (item.id === "wave_format" || item.id === "wave_reachable") && item.status === "fail",
  );

  if (waveFailure) {
    return [
      {
        id: `chat_${waveFailure.id}`,
        label: "Project chat",
        status: "blocked",
        detail: waveFailure.message,
        source: "setup",
      },
    ];
  }

  const waveReachable = setupValidation.checks.find((item) => item.id === "wave_reachable");

  if (waveReachable) {
    return [
      {
        id: "chat_wave_reachable",
        label: "Project chat",
        status: setupItemStatus(waveReachable.status),
        detail: waveReachable.message,
        source: "setup",
      },
    ];
  }

  return [
    {
      id: "chat_setup_remote_check",
      label: "Project chat check",
      status: "needed",
      detail: "Run setup check to verify the project chat before inviting builders.",
      source: "setup",
    },
  ];
}

function readinessItem(check: ReadinessCheck): FirstPhaseLaunchAuditItem {
  return {
    id: `readiness_${check.id}`,
    label: check.label,
    status: readinessItemStatus(check.status),
    detail: check.message,
    source: "readiness",
  };
}

function chatReadinessItem(check: ReadinessCheck): FirstPhaseLaunchAuditItem {
  if (check.id === "initial_hook_project" && check.message.includes("repo is a placeholder")) {
    return {
      id: "readiness_initial_hook_project",
      label: check.label,
      status: "ready",
      detail: "First project chat is configured. The GitHub repo can stay as a placeholder until PR work starts.",
      source: "readiness",
    };
  }

  return readinessItem(check);
}

function decisionLinkItem(wave: CommandWave | null | undefined): FirstPhaseLaunchAuditItem[] {
  const proposal = wave?.proposals.find((item) => item.kind === "open_pr") ?? null;

  if (!proposal) {
    return [];
  }

  const poll = wave?.polls.find((item) => item.proposalId === proposal.id) ?? null;
  const decision = poll?.decision ?? null;

  if (decision) {
    const referenceCheck = validateWaveDecisionReference({
      reference: decision.url ?? decision.dropId ?? "",
      waveUrl: wave?.waveUrl ?? "",
      requireUrl: true,
    });

    if (!referenceCheck.ok) {
      return [
        {
          id: "flow_project_decision_link",
          label: "Project decision link",
          status: "blocked",
          detail: referenceCheck.message,
          source: "flow",
        },
      ];
    }

    return [
      {
        id: "flow_project_decision_link",
        label: "Project decision link",
        status: "ready",
        detail: `Decision link exists for ${proposal.id}.`,
        source: "flow",
      },
    ];
  }

  return [
    {
      id: "flow_project_decision_link",
      label: "Project decision link",
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
      if (isPlaceholderValue(wave?.repoUrl)) {
        return [
          {
            id: "flow_audit_packet",
            label: "Audit packet",
            status: "needed",
            detail: "Launch packet waits for the selected GitHub repo and matching PR evidence.",
            source: "flow",
          },
        ];
      }

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

function reviewerReadinessItem(): FirstPhaseLaunchAuditItem[] {
  if (reviewAgentIdentity.status === "placeholder") {
    return [
      {
        id: "setup_review_agent_placeholder",
        label: "Review agent",
        status: "needed",
        detail: "Review agent is a placeholder. Select the reviewer process before claiming the reviewed PR loop is ready.",
        source: "setup",
      },
    ];
  }

  return [
    {
      id: "setup_review_agent",
      label: "Review agent",
      status: "ready",
      detail: "Review agent is selected for the reviewed PR loop.",
      source: "setup",
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
  const reviewerPlaceholderOwnsReviewGap =
    reviewAgentIdentity.status === "placeholder" &&
    phaseChecklist.some(
      (item) => item.id === "review" && item.status !== "done" && item.detail.toLowerCase().includes("reviewer process"),
    );
  const flowItems: FirstPhaseLaunchAuditItem[] = phaseChecklist
    .filter((item) => !(reviewerPlaceholderOwnsReviewGap && (item.id === "review" || item.id === "log")))
    .map((item) => ({
      id: `flow_${item.id}`,
      label: item.label,
      status: phaseItemStatus(item.status),
      detail: item.detail,
      source: "flow",
    }));
  const readinessItems: FirstPhaseLaunchAuditItem[] = readinessChecks
    ? readinessChecks
        .filter(includeLaunchReadinessCheck)
        .map(readinessItem)
    : [
        {
          id: "readiness_not_checked",
          label: "Readiness check",
          status: "needed",
          detail: "Run readiness before inviting contributors.",
          source: "readiness",
        },
      ];
  const chatReadinessItems: FirstPhaseLaunchAuditItem[] = readinessChecks
    ? readinessChecks.filter(includeChatLaunchReadinessCheck).map(chatReadinessItem)
    : [
        {
          id: "readiness_not_checked",
          label: "Readiness check",
          status: "needed",
          detail: "Run readiness before inviting builders.",
          source: "readiness",
        },
      ];
  const chatLaunchItems = [
    ...chatSetupItems(setupValidation),
    ...participationNotesItem(wave),
    ...chatReadinessItems,
  ];

  const items = [
    ...flowItems,
    ...setupValidationItems(setupValidation),
    ...decisionLinkItem(wave),
    ...participationNotesItem(wave),
    ...auditPacketItem(wave),
    ...readinessItems,
    ...reviewerReadinessItem(),
  ];
  const fullLaunch = trackFromItems(items, summaryFor);

  return {
    ...fullLaunch,
    chatLaunch: trackFromItems(
      chatLaunchItems,
      chatSummaryFor,
      "Open project chat",
      "Post the launch brief and invite builders to discuss the first hook change.",
    ),
  };
}
