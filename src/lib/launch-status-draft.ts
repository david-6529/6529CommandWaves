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
    "Verification:",
    `- Setup proof: ${verificationTargets.setupProofUrl}`,
    `- Command-wave state: ${verificationTargets.commandWaveStateUrl}`,
    ...(verificationTargets.launchAuditUrl ? [`- Launch audit: ${verificationTargets.launchAuditUrl}`] : []),
    "",
    "Guardrails: humans keep merge, deploy, payment, and governance authority. This status note does not approve work or move funds.",
  ].join("\n");
}
