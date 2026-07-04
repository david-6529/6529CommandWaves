import type { CommandWave } from "./command-waves";
import type { FirstPhaseLaunchAudit } from "./first-phase-launch-audit";

export type LaunchStatusVerificationTargets = {
  setupProofUrl: string;
  commandWaveStateUrl: string;
  launchAuditUrl?: string;
};

function openItemLines(audit: FirstPhaseLaunchAudit) {
  if (!audit.openItems.length) {
    return ["- No launch gaps found in the checked records."];
  }

  return audit.openItems.slice(0, 5).map((item) => `- ${item.label}: ${item.detail}`);
}

const checklistByItemId: Record<string, string[]> = {
  setup_not_checked: [
    "Run the setup check against the selected project room and GitHub repo.",
    "Confirm CONTRIBUTING.md and .github/PULL_REQUEST_TEMPLATE.md exist in the hook repo.",
  ],
  setup_remote_check: [
    "Run the setup check against the selected project room and GitHub repo.",
    "Confirm CONTRIBUTING.md and .github/PULL_REQUEST_TEMPLATE.md exist in the hook repo.",
  ],
  setup_wave_reachable: ["Pick a reachable 6529 project room before inviting contributors."],
  setup_repo_reachable: ["Pick a reachable GitHub repo before inviting contributors."],
  setup_project_check: ["Fix the setup check failure for the selected project room and repo."],
  setup_repo_required_files: ["Add launch repo files before inviting contributors."],
  setup_repo_file_contributing_md: ["Add CONTRIBUTING.md to the hook repo."],
  setup_repo_file_github_pull_request_template_md: ["Add .github/PULL_REQUEST_TEMPLATE.md to the hook repo."],
  readiness_not_checked: ["Run launch readiness from the app or /api/command-wave/launch/audit?remote=1."],
  readiness_app_url: ["Set NEXT_PUBLIC_APP_URL to the deployed HTTPS app URL."],
  readiness_initial_hook_project: [
    "Set COMMAND_WAVE_INITIAL_WAVE_URL to the first project room.",
    "Set COMMAND_WAVE_INITIAL_REPO_URL to the hook GitHub repo.",
  ],
  readiness_database: ["Set DATABASE_URL to production Postgres before durable public audit storage."],
  readiness_command_wave_store: ["Set COMMAND_WAVE_STORE=postgres for production state."],
  readiness_admin_api_key: ["Set a strong ADMIN_API_KEY before public launch."],
  readiness_6529_mode: ["Set 6529_MOCK_MODE=false before public launch."],
  readiness_github_pr_adapter: [
    "Set COMMAND_WAVE_REPO_ADAPTER=github before automated PR creation.",
    "Set COMMAND_WAVE_GITHUB_TOKEN or GITHUB_TOKEN with repo access.",
  ],
  readiness_guardian_wave_state: [
    "Set COMMAND_WAVE_STATE_URL to the deployed /api/command-wave/state URL for guardian PR checks.",
  ],
  flow_project: ["Select the first project room and hook GitHub repo."],
  flow_proposal: ["Create one PR-sized hook proposal before starting the first public loop."],
  flow_decision: ["Record the room decision before PR work starts."],
  flow_build: ["Attach the PR record or Codex work packet for the approved change."],
  flow_review: ["Run reviewer checks against the PR before human merge decisions."],
  flow_log: ["Post the reviewed result back to the project room."],
  flow_wave_decision_receipt: ["Record the 6529 decision URL for the approved PR work."],
  flow_participation_notes: ["Keep participation notes advisory until live gating is implemented."],
  flow_audit_packet: ["Prepare the launch packet with PR, review, contribution, and fee records."],
};

function checklistLines(audit: FirstPhaseLaunchAudit) {
  if (!audit.openItems.length) {
    return ["- Start the first public loop with one small reviewed hook change."];
  }

  const seen = new Set<string>();
  const lines: string[] = [];

  for (const item of audit.openItems) {
    for (const line of checklistByItemId[item.id] ?? [`Resolve ${item.label}: ${item.detail}`]) {
      if (!seen.has(line)) {
        seen.add(line);
        lines.push(`- ${line}`);
      }

      if (lines.length >= 8) {
        return lines;
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
    "6529 hook launch status",
    "",
    `6529 discussion: ${wave.waveUrl}`,
    `Code repo: ${wave.repoUrl}`,
    `Status: ${audit.statusLabel}`,
    audit.summary,
    "",
    `Next action: ${audit.nextAction.title}`,
    audit.nextAction.detail,
    "",
    "Open items:",
    ...openItemLines(audit),
    "",
    "Operator checklist:",
    ...checklistLines(audit),
    "",
    "Verification:",
    `- Setup proof: ${verificationTargets.setupProofUrl}`,
    `- Command-wave state: ${verificationTargets.commandWaveStateUrl}`,
    ...(verificationTargets.launchAuditUrl ? [`- Launch audit: ${verificationTargets.launchAuditUrl}`] : []),
    "",
    "Guardrails: humans keep merge, deploy, payment, and governance authority. This status note does not approve work or move funds.",
  ].join("\n");
}
