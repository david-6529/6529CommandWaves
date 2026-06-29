import { normalizeWaveId } from "./6529/client";
import type { CommandWave } from "./command-waves";
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
  const wave = isCommandWave(record?.wave) ? record.wave : isCommandWave(payload) ? payload : null;
  const waveStateHash = asString(record?.waveStateHash);

  return {
    wave,
    waveStateHash,
  };
}

function fromRequiredStatusCheckObject(value: unknown) {
  const record = isRecord(value) ? value : null;

  if (!record) {
    return [];
  }

  return [asString(record.context), asString(record.name), asString(record.check_name), asString(record.checkName)].filter(
    (item): item is string => Boolean(item),
  );
}

function collectFromRequiredStatusContainer(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      typeof item === "string" ? [item] : fromRequiredStatusCheckObject(item).concat(collectFromRequiredStatusContainer(item)),
    );
  }

  if (!isRecord(value)) {
    return [];
  }

  return [
    ...fromRequiredStatusCheckObject(value),
    ...collectFromRequiredStatusContainer(value.contexts),
    ...collectFromRequiredStatusContainer(value.checks),
    ...collectFromRequiredStatusContainer(value.required_status_checks),
    ...collectFromRequiredStatusContainer(value.requiredStatusChecks),
  ];
}

function collectRequiredChecksFromRule(value: unknown): string[] {
  if (!isRecord(value)) {
    return [];
  }

  const type = asString(value.type);
  const parameterChecks = collectFromRequiredStatusContainer(value.parameters);

  if (type === "required_status_checks") {
    return parameterChecks;
  }

  return [
    ...collectFromRequiredStatusContainer(value.required_status_checks),
    ...collectFromRequiredStatusContainer(value.requiredStatusChecks),
  ];
}

export function extractRequiredStatusChecks(payloads: unknown[]) {
  const found = new Set<string>();

  function visit(value: unknown, keyHint = "") {
    if (keyHint === "required_status_checks" || keyHint === "requiredStatusChecks") {
      for (const item of collectFromRequiredStatusContainer(value)) {
        found.add(item);
      }
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, keyHint);
      }

      return;
    }

    if (!isRecord(value)) {
      return;
    }

    for (const item of collectRequiredChecksFromRule(value)) {
      found.add(item);
    }

    for (const [key, item] of Object.entries(value)) {
      visit(item, key);
    }
  }

  for (const payload of payloads) {
    visit(payload);
  }

  return [...found].sort((a, b) => a.localeCompare(b));
}

export function verifySetupProofAgainstGitHubPayloads(
  proof: SetupProof,
  payloads: unknown[],
  options: SetupVerificationOptions = {},
): SetupVerificationResult {
  const requiredChecks = proof.github?.requiredChecks ?? [];
  const observedRequiredChecks = extractRequiredStatusChecks(payloads);
  const guardianEnforcementMode = proof.guardian?.enforcementMode;
  const storageDurability = proof.storage?.durability;
  const checks: SetupVerificationCheck[] = [
    check("proof_hash", verifySetupProofHash(proof) ? "pass" : "fail", "Setup proof hashes are internally consistent."),
    check("github_repo", proof.github ? "pass" : "fail", "Setup proof names a GitHub repo."),
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

    checks.push(
      check(
        "command_wave_state_available",
        wave ? "pass" : "fail",
        wave
          ? "Command-wave state URL returned a wave payload."
          : "Command-wave state URL did not return a readable wave payload.",
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
