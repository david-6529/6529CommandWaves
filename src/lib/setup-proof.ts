import { normalizeWaveId } from "./6529/client";
import type { CommandWave } from "./command-waves";
import { parseGitHubRepoUrl } from "./github/repo";
import { REVIEWER_GATE_VERSION } from "./github/pr-reviewer-gate";
import { hashValue } from "./run-manifest";

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
  guardian: {
    enforcementMode: "repo_local_github_action" | "external_github_app";
    requiredCheck: string;
    workflowPath: string | null;
    proofArtifact: string;
    replayCommand: string;
    productionStrength: "mvp" | "strong";
    limitation: string | null;
    recommendedUpgrade: "external_github_app" | null;
  };
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

export function createSetupProof(
  wave: CommandWave,
  options: {
    generatedAt?: string;
    protectedBranch?: string;
    requiredReviewerCheck?: string;
    vercelProductionBranch?: string;
  } = {},
): SetupProof {
  const protectedBranch = options.protectedBranch ?? "main";
  const requiredReviewerCheck = options.requiredReviewerCheck ?? "Command Waves Guardian";
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
    guardian: {
      enforcementMode: "repo_local_github_action",
      requiredCheck: requiredReviewerCheck,
      workflowPath: ".github/workflows/guardian-review.yml",
      proofArtifact: "guardian-proof",
      replayCommand: "npm run guardian:verify-proof",
      productionStrength: "mvp",
      limitation:
        "The MVP guardian runs from the governed repo. Critical-risk diff rules protect guardian changes, but stronger production should use an external GitHub App.",
      recommendedUpgrade: "external_github_app",
    },
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
          "risky_diff_paths",
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
    },
  });
  const setupHash = hashValue({
    wave: baseProof.wave,
    github: baseProof.github,
    vercel: baseProof.vercel,
    guardian: baseProof.guardian,
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
    governance: proof.governance,
    verificationTargets: proof.verificationTargets,
    setupHash,
  });

  return proof.attestationHash === attestationHash && proof.setupHash === setupHash;
}
