import type { GuardianAttestation } from "./pr-reviewer-gate";

export function formatGuardianStepSummary(attestation: GuardianAttestation) {
  const lines = [
    "# Command Waves Guardian",
    "",
    `Status: **${attestation.result.status.toUpperCase()}**`,
    "",
    `Attestation: \`${attestation.attestationHash}\``,
    `Verifier: \`${attestation.verifier.version}\``,
    `Rules hash: \`${attestation.inputs.rulesHash}\``,
    `Manifest hash: \`${attestation.inputs.manifestHash ?? "missing"}\``,
    `Changed paths hash: \`${attestation.inputs.changedPathsHash}\``,
    "",
    "## Checks",
    "",
    "| Status | Check | Message |",
    "| --- | --- | --- |",
    ...attestation.result.checks.map((check) => `| ${check.status} | \`${check.id}\` | ${check.message.replaceAll("|", "\\|")} |`),
  ];

  if (attestation.result.diffSignals.length) {
    lines.push("", "## Risky Paths", "", "| Risk | Path | Reason |", "| --- | --- | --- |");
    lines.push(
      ...attestation.result.diffSignals.map(
        (signal) => `| ${signal.risk} | \`${signal.path}\` | ${signal.reason.replaceAll("|", "\\|")} |`,
      ),
    );
  }

  return `${lines.join("\n")}\n`;
}
