import { normalizeWaveId } from "./6529/client";
import { createCommandWaveStateHash } from "./command-wave-state-hash";
import type { CommandWave } from "./command-waves";
import { isPlaceholderValue } from "./env-placeholders";
import { extractRequiredStatusChecks } from "./github/required-status-checks";
import type { SetupProof } from "./setup-proof";
import { verifySetupProofHash } from "./setup-proof";
import { hashValue } from "./run-manifest";

export type SetupVerificationCheck = {
  id: string;
  status: "pass" | "fail";
  message: string;
};

export type SetupVerificationResult = {
  status: "pass" | "fail";
  requiredChecks: string[];
  observedRequiredChecks: string[];
  checks: SetupVerificationCheck[];
};

export type SetupVerificationOptions = {
  requireExternalGuardian?: boolean;
  requireProductionStorage?: boolean;
  commandWaveState?: unknown;
};

function check(id: string, status: SetupVerificationCheck["status"], message: string): SetupVerificationCheck {
  return { id, status, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isCommandWave(value: unknown): value is CommandWave {
  const record = isRecord(value) ? value : null;

  return Boolean(
    record &&
      typeof record.id === "string" &&
      typeof record.waveUrl === "string" &&
      typeof record.repoUrl === "string" &&
      isRecord(record.rules) &&
      Array.isArray(record.proposals) &&
      Array.isArray(record.polls) &&
      Array.isArray(record.executions) &&
      Array.isArray(record.reviews) &&
      Array.isArray(record.ledger),
  );
}

function commandWaveStateFromPayload(payload: unknown) {
  const record = isRecord(payload) ? payload : null;
  const version = record?.version === "command-wave-state-v0.1" ? record.version : null;
  const wave = version && isCommandWave(record?.wave) ? record.wave : null;
  const waveStateHash = asString(record?.waveStateHash);
  const stateHash = asString(record?.stateHash);

  return {
    record,
    version,
    wave,
    waveStateHash,
    stateHash,
  };
}

function githubRepoCheck(proof: SetupProof) {
  if (!proof.github) {
    return check("github_repo", "fail", "Use a configured GitHub repo before verifying required checks.");
  }

  if (isPlaceholderValue(proof.github.repoUrl)) {
    return check(
      "github_repo",
      "fail",
      "Setup proof uses a placeholder GitHub repo. Use a configured repo before verifying required checks.",
    );
  }

  return check("github_repo", "pass", `Setup proof names ${proof.github.owner}/${proof.github.repo}.`);
}

export function verifySetupProofAgainstGitHubPayloads(
  proof: SetupProof,
  payloads: unknown[],
  options: SetupVerificationOptions = {},
): SetupVerificationResult {
  const githubCheck = githubRepoCheck(proof);
  const requiredChecks = githubCheck.status === "pass" ? proof.github?.requiredChecks ?? [] : [];
  const observedRequiredChecks = extractRequiredStatusChecks(payloads);
  const guardianEnforcementMode = proof.guardian?.enforcementMode;
  const storageDurability = proof.storage?.durability;
  const checks: SetupVerificationCheck[] = [
    check("proof_hash", verifySetupProofHash(proof) ? "pass" : "fail", "Setup proof hashes are internally consistent."),
    githubCheck,
    check(
      "guardian_enforcement",
      guardianEnforcementMode ? "pass" : "fail",
      guardianEnforcementMode
        ? `Guardian enforcement mode is ${guardianEnforcementMode}.`
        : "Setup proof does not declare a guardian enforcement mode.",
    ),
    check(
      "storage_declared",
      proof.storage ? "pass" : "fail",
      proof.storage
        ? `Command-wave storage is ${proof.storage.mode} with ${proof.storage.durability} durability.`
        : "Setup proof does not declare command-wave storage.",
    ),
  ];

  if (options.requireExternalGuardian) {
    checks.push(
      check(
        "external_guardian",
        guardianEnforcementMode === "external_github_app" ? "pass" : "fail",
        guardianEnforcementMode === "external_github_app"
          ? "Guardian enforcement is external to the governed repo."
          : "Guardian enforcement is repo-local. This is acceptable for MVP, but not for strongest production verification.",
      ),
    );
  }

  if (options.requireProductionStorage) {
    checks.push(
      check(
        "production_storage",
        storageDurability === "production" ? "pass" : "fail",
        storageDurability === "production"
          ? "Command-wave storage is production durable."
          : "Command-wave storage is not production durable. Use Postgres with DATABASE_URL before broad participation.",
      ),
    );
  }

  if (proof.verificationTargets.commandWaveStateUrl) {
    const state = commandWaveStateFromPayload(options.commandWaveState);
    const wave = state.wave;
    const stateSnapshotHashMatches = Boolean(state.record && state.stateHash === createCommandWaveStateHash(state.record));

    checks.push(
      check(
        "command_wave_state_version",
        state.version === "command-wave-state-v0.1" ? "pass" : "fail",
        state.version === "command-wave-state-v0.1"
          ? "Command-wave state URL returned the expected snapshot version."
          : "Command-wave state URL must return a command-wave-state-v0.1 snapshot.",
      ),
    );
    checks.push(
      check(
        "command_wave_state_available",
        wave ? "pass" : "fail",
        wave
          ? "Command-wave state URL returned a wave payload."
          : "Command-wave state URL did not return a readable wave payload.",
      ),
    );
    checks.push(
      check(
        "command_wave_state_snapshot_hash",
        stateSnapshotHashMatches ? "pass" : "fail",
        stateSnapshotHashMatches
          ? "Command-wave state snapshot hash matches the published payload."
          : "Command-wave state snapshot hash is missing or does not match the published payload.",
      ),
    );

    if (wave) {
      const waveHash = hashValue(wave);
      const waveIdentityMatches = normalizeWaveId(wave.waveUrl) === proof.wave.id && wave.waveUrl === proof.wave.url;

      checks.push(
        check(
          "command_wave_state_identity",
          waveIdentityMatches ? "pass" : "fail",
          waveIdentityMatches
            ? "Command-wave state matches the setup proof wave."
            : "Command-wave state does not match the setup proof wave.",
        ),
      );
      checks.push(
        check(
          "command_wave_state_hash",
          state.waveStateHash === waveHash ? "pass" : "fail",
          state.waveStateHash === waveHash
            ? "Command-wave state hash matches the wave payload."
            : "Command-wave state hash is missing or does not match the wave payload.",
        ),
      );
    }
  }

  for (const requiredCheck of requiredChecks) {
    checks.push(
      check(
        `required_check_${requiredCheck}`,
        observedRequiredChecks.includes(requiredCheck) ? "pass" : "fail",
        observedRequiredChecks.includes(requiredCheck)
          ? `${requiredCheck} is present in GitHub required status checks.`
          : `${requiredCheck} was not found in GitHub required status checks.`,
      ),
    );
  }

  return {
    status: checks.some((item) => item.status === "fail") ? "fail" : "pass",
    requiredChecks,
    observedRequiredChecks,
    checks,
  };
}
