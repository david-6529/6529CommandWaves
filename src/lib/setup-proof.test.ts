import { describe, expect, it } from "vitest";
import { demoWave } from "./command-waves";
import { createSetupProof, verifySetupProofHash } from "./setup-proof";

describe("setup proof", () => {
  it("creates a third-party-verifiable setup proof", () => {
    const proof = createSetupProof(demoWave, {
      generatedAt: "2026-06-20T18:00:00.000Z",
    });

    expect(proof).toMatchObject({
      version: "command-wave-setup-v0.1",
      wave: {
        id: "demo-command-wave",
      },
      github: {
        owner: "6529-Collections",
        repo: "example-command-wave",
        protectedBranch: "main",
        requiredReviewerCheck: "Command Waves Reviewer",
      },
      vercel: {
        productionBranch: "main",
      },
      governance: {
        rulesVersion: demoWave.rules.version,
        manifestSchemaVersion: "command-wave-pr-v0.1",
        reviewerGateVersion: "command-wave-reviewer-gate-v0.1",
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
  });
});
