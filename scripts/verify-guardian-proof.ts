import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { CommandWave } from "../src/lib/command-waves";
import type { GuardianPullRequestEvidence } from "../src/lib/github/pr-reviewer-gate";
import { verifyGuardianPullRequestProof, type GuardianAttestation } from "../src/lib/github/pr-reviewer-gate";

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeResult(path: string | undefined, value: unknown) {
  if (!path?.trim()) {
    return;
  }

  const outputPath = resolve(path);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`);
}

function pathFromEnv(name: string, fallback: string) {
  return resolve(process.env[name]?.trim() || fallback);
}

function main() {
  const attestation = readJsonFile<GuardianAttestation>(
    pathFromEnv("GUARDIAN_ATTESTATION_PATH", "guardian-attestation.json"),
  );
  const wave = readJsonFile<CommandWave>(
    pathFromEnv("GUARDIAN_WAVE_STATE_SNAPSHOT_PATH", "guardian-wave-state.json"),
  );
  const evidence = readJsonFile<GuardianPullRequestEvidence>(
    pathFromEnv("GUARDIAN_PR_EVIDENCE_PATH", "guardian-pr-evidence.json"),
  );
  const result = verifyGuardianPullRequestProof({ wave, evidence, attestation });

  writeResult(process.env.GUARDIAN_VERIFICATION_PATH, result);

  console.log(`Guardian proof verification: ${result.status}`);
  console.log(`Expected attestation: ${result.expectedAttestationHash}`);
  console.log(`Actual attestation: ${result.actualAttestationHash}`);

  for (const item of result.checks) {
    console.log(`${item.status.toUpperCase()} ${item.id}: ${item.message}`);
  }

  if (result.status !== "pass") {
    process.exitCode = 1;
  }
}

main();
