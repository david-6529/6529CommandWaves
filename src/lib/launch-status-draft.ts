import type { CommandWave } from "./command-waves";
import type { FirstPhaseLaunchAudit } from "./first-phase-launch-audit";
import { projectRepoLine } from "./project-repo-copy";

export type LaunchStatusVerificationTargets = {
  verificationManifestUrl?: string;
  setupProofUrl: string;
  projectIndexUrl?: string;
  contributionReportUrl?: string;
  commandWaveStateUrl: string;
  chatLaunchUrl?: string;
  launchAuditUrl?: string;
};

export type LaunchStatusOpenItem = Pick<FirstPhaseLaunchAudit["openItems"][number], "id" | "label" | "detail">;

function openItemLines(audit: FirstPhaseLaunchAudit) {
  if (!audit.openItems.length) {
    return ["- No launch gaps found in the checked records."];
  }

  return audit.openItems.slice(0, 5).map((item) => `- ${item.label}: ${item.detail}`);
}

const checklistByItemId: Record<string, string[]> = {
  setup_not_checked: [
    "Run the setup check against the selected project chat and current repo setting.",
    "If the repo is still a placeholder, PR checks stay blocked until the hook repo is selected.",
  ],
  setup_remote_check: [
    "Run the setup check against the selected project chat and current repo setting.",
    "If the repo is still a placeholder, PR checks stay blocked until the hook repo is selected.",
  ],
  setup_wave_reachable: ["Pick a reachable 6529 project chat before inviting contributors."],
  setup_repo_reachable: ["Pick a reachable GitHub repo before inviting contributors."],
  setup_repo_placeholder: ["Keep the repo as a placeholder until the hook repo is selected, then replace it before PR work."],
  setup_project_check: ["Fix the setup check failure for the selected project chat and repo."],
  setup_repo_required_files: ["Add launch repo files before inviting contributors."],
  setup_repo_file_contributing_md: ["Add CONTRIBUTING.md to the hook repo."],
  setup_repo_file_github_pull_request_template_md: ["Add .github/PULL_REQUEST_TEMPLATE.md to the hook repo."],
  setup_repo_file_github_workflows_guardian_review_yml: [
    "Add .github/workflows/guardian-review.yml to the hook repo.",
  ],
  setup_repo_required_guardian_check: ["Make Command Waves Guardian a required GitHub status check before inviting contributors."],
  readiness_not_checked: ["Run launch readiness from the app or /api/command-wave/launch/audit?remote=1."],
  readiness_app_url: ["Set NEXT_PUBLIC_APP_URL to the deployed HTTPS app URL."],
  readiness_initial_hook_project: [
    "Set COMMAND_WAVE_INITIAL_WAVE_URL to the first project chat.",
    "Keep COMMAND_WAVE_INITIAL_REPO_URL as the placeholder until the selected hook repo is ready.",
  ],
  readiness_database: ["Set DATABASE_URL to production Postgres before durable public audit storage."],
  readiness_command_wave_store: ["Set COMMAND_WAVE_STORE=postgres for production state."],
  readiness_admin_api_key: ["Set a strong ADMIN_API_KEY before public launch."],
  readiness_6529_mode: ["Set 6529_MOCK_MODE=false before public launch."],
  readiness_6529_chat_posting: [
    "Set 6529_BOT_BEARER_TOKEN and 6529_BOT_WALLET_ADDRESS for daemon chat posting.",
  ],
  readiness_github_pr_adapter: [
    "Set COMMAND_WAVE_REPO_ADAPTER=github before automated PR creation.",
    "Set COMMAND_WAVE_GITHUB_TOKEN or GITHUB_TOKEN with repo access.",
  ],
  readiness_guardian_wave_state: [
    "Set COMMAND_WAVE_STATE_URL to the deployed /api/command-wave/state URL for guardian PR checks.",
  ],
  flow_project: ["Select the first project chat, and keep the repo placeholder until PR work starts."],
  flow_proposal: ["Create one PR-sized hook proposal before starting the first public loop."],
  flow_decision: ["Record the project decision before PR work starts."],
  flow_build: ["After the repo is configured, attach the PR record or Codex work packet for the approved change."],
  flow_review: ["Run reviewer checks against the PR before human merge decisions."],
  flow_log: ["Post the reviewed result back to project chat."],
  flow_wave_decision_receipt: ["Record the project decision URL for the approved PR work."],
  flow_participation_notes: ["Keep participation notes advisory until live gating is implemented."],
  flow_audit_packet: ["Finish PR build and review before preparing the launch packet."],
};

export function launchOperatorChecklistLines(openItems: LaunchStatusOpenItem[]) {
  if (!openItems.length) {
    return ["- Start the first public loop with one small reviewed hook change."];
  }

  const seen = new Set<string>();
  const lines: string[] = [];

  for (const item of openItems) {
    for (const line of checklistByItemId[item.id] ?? [`Resolve ${item.label}: ${item.detail}`]) {
      if (!seen.has(line)) {
        seen.add(line);
        lines.push(`- ${line}`);
      }
    }
  }

  return lines;
}

export function createLaunchStatusDraft({
  wave,
  audit,
  verificationTargets,
}: {
  wave: CommandWave;
  audit: FirstPhaseLaunchAudit;
  verificationTargets: LaunchStatusVerificationTargets;
}) {
  return [
    "Project launch status",
    "",
    `Project chat: ${wave.waveUrl}`,
    projectRepoLine("GitHub repo", wave.repoUrl),
    `Chat launch: ${audit.chatLaunch.statusLabel}`,
    audit.chatLaunch.summary,
    `Status: ${audit.statusLabel}`,
    audit.summary,
    "",
    `Chat next action: ${audit.chatLaunch.nextAction.title}`,
    audit.chatLaunch.nextAction.detail,
    "",
    `Next action: ${audit.nextAction.title}`,
    audit.nextAction.detail,
    "",
    "Open items:",
    ...openItemLines(audit),
    "",
    "Operator checklist:",
    ...launchOperatorChecklistLines(audit.openItems),
    "",
    "Verification:",
    ...(verificationTargets.verificationManifestUrl
      ? [`- Verification manifest: ${verificationTargets.verificationManifestUrl}`]
      : []),
    `- Setup proof: ${verificationTargets.setupProofUrl}`,
    ...(verificationTargets.projectIndexUrl ? [`- Project index: ${verificationTargets.projectIndexUrl}`] : []),
    ...(verificationTargets.contributionReportUrl
      ? [`- Contribution report: ${verificationTargets.contributionReportUrl}`]
      : []),
    `- Command-wave state: ${verificationTargets.commandWaveStateUrl}`,
    ...(verificationTargets.chatLaunchUrl ? [`- Chat launch audit: ${verificationTargets.chatLaunchUrl}`] : []),
    ...(verificationTargets.launchAuditUrl ? [`- Launch audit: ${verificationTargets.launchAuditUrl}`] : []),
    "",
    "Guardrails: humans keep merge, deploy, payment, and governance authority. This status note does not approve work or move funds.",
  ].join("\n");
}
