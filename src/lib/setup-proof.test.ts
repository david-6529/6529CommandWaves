import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createSetupProof, setupProofOptionsFromEnv, verifySetupProofHash } from "./setup-proof";

describe("setup proof", () => {
  it("creates a third-party-verifiable setup proof", () => {
    const proof = createSetupProof(demoWave, {
      generatedAt: "2026-06-20T18:00:00.000Z",
    });

    expect(proof).toMatchObject({
      version: "command-wave-setup-v0.1",
      wave: {
        id: "6529-hook-builder",
      },
      github: {
        owner: "6529-Collections",
        repo: "6529-hook",
        protectedBranch: "main",
        requiredReviewerCheck: "Command Waves Guardian",
      },
      vercel: {
        productionBranch: "main",
      },
      guardian: {
        enforcementMode: "repo_local_github_action",
        requiredCheck: "Command Waves Guardian",
        workflowPath: ".github/workflows/guardian-review.yml",
        proofArtifact: "guardian-proof",
        replayCommand: "npm run guardian:verify-proof",
        productionStrength: "mvp",
        recommendedUpgrade: "external_github_app",
      },
      storage: {
        mode: "memory",
        durability: "volatile",
        databaseConfigured: false,
      },
      governance: {
        rulesVersion: demoWave.rules.version,
        manifestSchemaVersion: "command-wave-pr-v0.1",
        reviewerGateVersion: "command-wave-reviewer-gate-v0.4",
      },
    });
    expect(proof.setupHash).toHaveLength(64);
    expect(proof.attestationHash).toHaveLength(64);
    expect(proof.verificationTargets.githubRulesetsApi).toContain("/rulesets");
    expect(proof.verificationTargets.githubBranchRulesApi).toContain("/rules/branches/main");
    expect(verifySetupProofHash(proof)).toBe(true);
  });

  it("keeps setupHash stable while generatedAt changes", () => {
    const first = createSetupProof(demoWave, {
      generatedAt: "2026-06-20T18:00:00.000Z",
    });
    const second = createSetupProof(demoWave, {
      generatedAt: "2026-06-20T19:00:00.000Z",
    });

    expect(first.setupHash).toBe(second.setupHash);
    expect(first.attestationHash).not.toBe(second.attestationHash);
  });

  it("detects setup proof tampering", () => {
    const proof = createSetupProof(demoWave, {
      generatedAt: "2026-06-20T18:00:00.000Z",
    });

    expect(verifySetupProofHash({
      ...proof,
      github: proof.github ? { ...proof.github, requiredReviewerCheck: "Not the real guardian" } : null,
    })).toBe(false);
    expect(verifySetupProofHash({
      ...proof,
      guardian: { ...proof.guardian, enforcementMode: "external_github_app", productionStrength: "strong" },
    })).toBe(false);
  });

  it("can publish external guardian setup metadata from env", () => {
    const proof = createSetupProof(
      demoWave,
      setupProofOptionsFromEnv({
        COMMAND_WAVE_GUARDIAN_MODE: "external_github_app",
        COMMAND_WAVE_GUARDIAN_REQUIRED_CHECK: "Command Waves Guardian App",
        COMMAND_WAVE_GUARDIAN_WORKFLOW_PATH: ".github/workflows/guardian-review.yml",
        COMMAND_WAVE_GUARDIAN_PROOF_ARTIFACT: "guardian-app-proof",
        COMMAND_WAVE_GUARDIAN_REPLAY_COMMAND: "npm run guardian:verify-proof",
        COMMAND_WAVE_PROTECTED_BRANCH: "main",
      }),
    );

    expect(proof.github).toMatchObject({
      requiredReviewerCheck: "Command Waves Guardian App",
      requiredChecks: ["Command Waves Guardian App"],
    });
    expect(proof.guardian).toMatchObject({
      enforcementMode: "external_github_app",
      requiredCheck: "Command Waves Guardian App",
      productionStrength: "strong",
      proofArtifact: "guardian-app-proof",
      workflowPath: null,
      limitation: null,
      recommendedUpgrade: null,
    });
    expect(verifySetupProofHash(proof)).toBe(true);
  });

  it("normalizes direct external guardian options to strong external metadata", () => {
    const proof = createSetupProof(demoWave, {
      guardian: {
        enforcementMode: "external_github_app",
        workflowPath: ".github/workflows/guardian-review.yml",
        productionStrength: "mvp",
        limitation: "stale repo-local limitation",
        recommendedUpgrade: "external_github_app",
      },
    });

    expect(proof.guardian).toMatchObject({
      enforcementMode: "external_github_app",
      workflowPath: null,
      productionStrength: "strong",
      limitation: null,
      recommendedUpgrade: null,
    });
    expect(verifySetupProofHash(proof)).toBe(true);
  });

  it("publishes production storage metadata from env", () => {
    const proof = createSetupProof(
      demoWave,
      setupProofOptionsFromEnv({
        COMMAND_WAVE_STORE: "postgres",
        DATABASE_URL: "postgresql://example",
      }),
    );

    expect(proof.storage).toMatchObject({
      mode: "postgres",
      durability: "production",
      databaseConfigured: true,
      limitation: null,
    });
    expect(verifySetupProofHash(proof)).toBe(true);
  });

  it("discloses local file storage as local durability", () => {
    const proof = createSetupProof(
      demoWave,
      setupProofOptionsFromEnv({
        COMMAND_WAVE_STORE: "file",
      }),
    );

    expect(proof.storage).toMatchObject({
      mode: "file",
      durability: "local",
      databaseConfigured: false,
    });
    expect(proof.storage.limitation).toContain("not production audit durability");
  });
});
