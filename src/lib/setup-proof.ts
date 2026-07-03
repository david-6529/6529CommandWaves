import { normalizeWaveId } from "./6529/client";
import { commandWaveStateUrlFromEnv } from "./command-wave-state";
import type { CommandWave } from "./command-waves";
import { hasProductionValue } from "./env-placeholders";
import { parseGitHubRepoUrl } from "./github/repo";
import { REVIEWER_GATE_VERSION } from "./github/pr-reviewer-gate";
import { hashValue } from "./run-manifest";

export type GuardianEnforcementMode = "repo_local_github_action" | "external_github_app";
export type SetupProofStorageMode = "memory" | "file" | "postgres";
export type SetupProofStorageDurability = "volatile" | "local" | "production";

export type SetupProofGuardian = {
  enforcementMode: GuardianEnforcementMode;
  requiredCheck: string;
  workflowPath: string | null;
  proofArtifact: string;
  replayCommand: string;
  productionStrength: "mvp" | "strong";
  limitation: string | null;
  recommendedUpgrade: "external_github_app" | null;
};

export type SetupProofStorage = {
  mode: SetupProofStorageMode;
  durability: SetupProofStorageDurability;
  databaseConfigured: boolean;
  limitation: string | null;
};

export type SetupProofOptions = {
  generatedAt?: string;
  protectedBranch?: string;
  requiredReviewerCheck?: string;
  vercelProductionBranch?: string;
  commandWaveStateUrl?: string | null;
  guardian?: Partial<SetupProofGuardian>;
  storage?: Partial<SetupProofStorage>;
};

export type SetupProof = {
  version: "command-wave-setup-v0.1";
  generatedAt: string;
  wave: {
    id: string;
    url: string;
  };
  github: {
    owner: string;
    repo: string;
    repoUrl: string;
    protectedBranch: string;
    requiredReviewerCheck: string;
    requiredChecks: string[];
  } | null;
  vercel: {
    productionBranch: string;
    mode: "expected" | "not_configured";
  };
  guardian: SetupProofGuardian;
  storage: SetupProofStorage;
  governance: {
    rulesVersion: string;
    rulesHash: string;
    manifestSchemaVersion: "command-wave-pr-v0.1";
    manifestSchemaHash: string;
    reviewerGateVersion: typeof REVIEWER_GATE_VERSION;
    reviewerGateHash: string;
  };
  verificationTargets: {
    waveUrl: string;
    githubRepoUrl: string | null;
    githubRulesetsApi: string | null;
    githubBranchRulesApi: string | null;
    commandWaveStateUrl: string | null;
  };
  setupHash: string;
  attestationHash: string;
};

const manifestSchemaShape = {
  version: "command-wave-pr-v0.1",
  requiredFields: [
    "waveId",
    "waveUrl",
    "proposalId",
    "pollDropId",
    "commandKind",
    "risk",
    "rulesVersion",
    "rulesHash",
    "promptHash",
    "specHash",
    "allowedPermissions",
    "runManifestHash",
    "approval",
  ],
};

function withoutHashes(proof: Omit<SetupProof, "setupHash" | "attestationHash">) {
  return proof;
}

function defaultGuardian(requiredCheck: string, enforcementMode: GuardianEnforcementMode): SetupProofGuardian {
  if (enforcementMode === "external_github_app") {
    return {
      enforcementMode,
      requiredCheck,
      workflowPath: null,
      proofArtifact: "guardian-proof",
      replayCommand: "npm run guardian:verify-proof",
      productionStrength: "strong",
      limitation: null,
      recommendedUpgrade: null,
    };
  }

  return {
    enforcementMode,
    requiredCheck,
    workflowPath: ".github/workflows/guardian-review.yml",
    proofArtifact: "guardian-proof",
    replayCommand: "npm run guardian:verify-proof",
    productionStrength: "mvp",
    limitation:
      "The MVP guardian runs from the governed repo. Critical-risk diff rules protect guardian changes, but stronger production should use an external GitHub App.",
    recommendedUpgrade: "external_github_app",
  };
}

function asGuardianMode(value: string | undefined): GuardianEnforcementMode | undefined {
  return value === "repo_local_github_action" || value === "external_github_app" ? value : undefined;
}

function asStorageMode(value: string | undefined): SetupProofStorageMode | undefined {
  return value === "memory" || value === "file" || value === "postgres" ? value : undefined;
}

function normalizeGuardianProof(guardian: SetupProofGuardian): SetupProofGuardian {
  if (guardian.enforcementMode !== "external_github_app") {
    return guardian;
  }

  return {
    ...guardian,
    workflowPath: null,
    productionStrength: "strong",
    limitation: null,
    recommendedUpgrade: null,
  };
}

function envValue(env: Record<string, string | undefined>, key: string) {
  const value = env[key]?.trim();

  return value && hasProductionValue(value, env) ? value : undefined;
}

function storageModeFromEnv(env: Record<string, string | undefined>): SetupProofStorageMode {
  const configuredMode = asStorageMode(envValue(env, "COMMAND_WAVE_STORE"));

  if (configuredMode) {
    return configuredMode;
  }

  if (env.NODE_ENV === "production" && envValue(env, "DATABASE_URL")) {
    return "postgres";
  }

  if (env.NODE_ENV === "development") {
    return "file";
  }

  return "memory";
}

function storageProofForMode(mode: SetupProofStorageMode, databaseConfigured: boolean): SetupProofStorage {
  if (mode === "postgres") {
    return {
      mode,
      durability: databaseConfigured ? "production" : "volatile",
      databaseConfigured,
      limitation: databaseConfigured ? null : "Postgres storage is selected but DATABASE_URL is missing.",
    };
  }

  if (mode === "file") {
    return {
      mode,
      durability: "local",
      databaseConfigured,
      limitation: "Local file storage is useful for development, not production audit durability.",
    };
  }

  return {
    mode,
    durability: "volatile",
    databaseConfigured,
    limitation: "In-memory storage resets when the server restarts.",
  };
}

export function setupProofOptionsFromEnv(env: Record<string, string | undefined> = process.env): SetupProofOptions {
  const enforcementMode = asGuardianMode(envValue(env, "COMMAND_WAVE_GUARDIAN_MODE"));
  const requiredCheck = envValue(env, "COMMAND_WAVE_GUARDIAN_REQUIRED_CHECK");
  const workflowPath =
    enforcementMode === "external_github_app" ? undefined : envValue(env, "COMMAND_WAVE_GUARDIAN_WORKFLOW_PATH");
  const proofArtifact = envValue(env, "COMMAND_WAVE_GUARDIAN_PROOF_ARTIFACT");
  const replayCommand = envValue(env, "COMMAND_WAVE_GUARDIAN_REPLAY_COMMAND");
  const storageMode = storageModeFromEnv(env);
  const databaseConfigured = Boolean(envValue(env, "DATABASE_URL"));

  return {
    protectedBranch: envValue(env, "COMMAND_WAVE_PROTECTED_BRANCH"),
    requiredReviewerCheck: requiredCheck,
    vercelProductionBranch: envValue(env, "COMMAND_WAVE_VERCEL_PRODUCTION_BRANCH"),
    commandWaveStateUrl: commandWaveStateUrlFromEnv(env),
    guardian: {
      ...(enforcementMode ? { enforcementMode } : {}),
      ...(requiredCheck ? { requiredCheck } : {}),
      ...(workflowPath ? { workflowPath } : {}),
      ...(proofArtifact ? { proofArtifact } : {}),
      ...(replayCommand ? { replayCommand } : {}),
    },
    storage: storageProofForMode(storageMode, databaseConfigured),
  };
}

export function createSetupProof(wave: CommandWave, options: SetupProofOptions = {}): SetupProof {
  const protectedBranch = options.protectedBranch ?? "main";
  const requiredReviewerCheck = options.guardian?.requiredCheck ?? options.requiredReviewerCheck ?? "Command Waves Guardian";
  const enforcementMode = options.guardian?.enforcementMode ?? "repo_local_github_action";
  const guardian = normalizeGuardianProof({
    ...defaultGuardian(requiredReviewerCheck, enforcementMode),
    ...options.guardian,
    requiredCheck: requiredReviewerCheck,
  });
  const storageMode = options.storage?.mode ?? "memory";
  const databaseConfigured = options.storage?.databaseConfigured ?? false;
  const storage = {
    ...storageProofForMode(storageMode, databaseConfigured),
    ...options.storage,
  };
  const repo = parseGitHubRepoUrl(wave.repoUrl);
  const baseProof = withoutHashes({
    version: "command-wave-setup-v0.1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    wave: {
      id: normalizeWaveId(wave.waveUrl),
      url: wave.waveUrl,
    },
    github: repo
      ? {
          owner: repo.owner,
          repo: repo.repo,
          repoUrl: repo.htmlUrl,
          protectedBranch,
          requiredReviewerCheck,
          requiredChecks: [requiredReviewerCheck],
        }
      : null,
    vercel: {
      productionBranch: options.vercelProductionBranch ?? protectedBranch,
      mode: "expected",
    },
    guardian,
    storage,
    governance: {
      rulesVersion: wave.rules.version,
      rulesHash: hashValue(wave.rules),
      manifestSchemaVersion: "command-wave-pr-v0.1",
      manifestSchemaHash: hashValue(manifestSchemaShape),
      reviewerGateVersion: REVIEWER_GATE_VERSION,
      reviewerGateHash: hashValue({
        version: REVIEWER_GATE_VERSION,
        mode: "deterministic",
        gates: [
          "proposal_status",
          "command_kind",
          "rules_hash",
          "prompt_spec_hashes",
          "permissions",
          "vote",
          "poll_drop_id",
          "wave_decision_receipt",
          "risky_diff_paths",
          "hook_contract_signals",
          "hook_patch_signals",
          "hook_parameter_policy",
        ],
      }),
    },
    verificationTargets: {
      waveUrl: wave.waveUrl,
      githubRepoUrl: repo?.htmlUrl ?? null,
      githubRulesetsApi: repo ? `https://api.github.com/repos/${repo.owner}/${repo.repo}/rulesets` : null,
      githubBranchRulesApi: repo
        ? `https://api.github.com/repos/${repo.owner}/${repo.repo}/rules/branches/${protectedBranch}`
        : null,
      commandWaveStateUrl: options.commandWaveStateUrl ?? null,
    },
  });
  const setupHash = hashValue({
    wave: baseProof.wave,
    github: baseProof.github,
    vercel: baseProof.vercel,
    guardian: baseProof.guardian,
    storage: baseProof.storage,
    governance: baseProof.governance,
    verificationTargets: baseProof.verificationTargets,
  });

  return {
    ...baseProof,
    setupHash,
    attestationHash: hashValue({
      ...baseProof,
      setupHash,
    }),
  };
}

export function verifySetupProofHash(proof: SetupProof) {
  const setupHash = hashValue({
    wave: proof.wave,
    github: proof.github,
    vercel: proof.vercel,
    guardian: proof.guardian,
    storage: proof.storage,
    governance: proof.governance,
    verificationTargets: proof.verificationTargets,
  });
  const attestationHash = hashValue({
    version: proof.version,
    generatedAt: proof.generatedAt,
    wave: proof.wave,
    github: proof.github,
    vercel: proof.vercel,
    guardian: proof.guardian,
    storage: proof.storage,
    governance: proof.governance,
    verificationTargets: proof.verificationTargets,
    setupHash,
  });

  return proof.attestationHash === attestationHash && proof.setupHash === setupHash;
}
