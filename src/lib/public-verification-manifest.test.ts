import { describe, expect, it } from "vitest";
import { publicGithubRepoPlaceholder } from "./agent-identities";
import { demoWave } from "./demo-wave";
import { createPublicVerificationManifest, publicVerificationManifestHashInput } from "./public-verification-manifest";
import { hashValue } from "./run-manifest";

const manifestEnv = {
  NEXT_PUBLIC_APP_URL: "https://command-waves.example.com",
  ADMIN_API_KEY: "admin",
  "6529_MOCK_MODE": "false",
};

describe("public verification manifest", () => {
  it("publishes the public verification targets and stable anchors", async () => {
    const manifest = await createPublicVerificationManifest(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: manifestEnv,
    });

    expect(manifest).toMatchObject({
      version: "command-wave-verification-manifest-v0.1",
      generatedAt: "2026-06-20T13:00:00.000Z",
      project: {
        id: demoWave.id,
        name: demoWave.name,
        waveUrl: demoWave.waveUrl,
        repoStatus: "placeholder",
      },
      stableAnchors: {
        waveStateHash: hashValue(demoWave),
        rulesHash: hashValue(demoWave.rules),
        proposalCount: demoWave.proposals.length,
        reviewCount: demoWave.reviews.length,
        ledgerEventCount: demoWave.ledger.length,
      },
      agents: {
        orchestrator: {
          handle: "daemon",
          status: "active",
        },
        reviewer: {
          status: "placeholder",
        },
        githubRepo: publicGithubRepoPlaceholder,
      },
      authority: {
        sourceOfTruth: "project chat",
        codeSurface: "GitHub PR",
      },
    });
    expect(manifest.manifestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.manifestHash).toBe(hashValue(publicVerificationManifestHashInput(manifest)));
    expect(manifest.stableAnchors.setupHash).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.stableAnchors.projectIndexHash).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.endpoints).toEqual([
      expect.objectContaining({
        id: "verification_manifest",
        url: "https://command-waves.example.com/api/command-wave/verification/manifest",
        requiredHashFields: ["manifestHash"],
        verifierCommand: null,
      }),
      expect.objectContaining({
        id: "setup_proof",
        url: "https://command-waves.example.com/api/command-wave/setup/proof",
        requiredHashFields: ["setupHash", "attestationHash"],
        verifierCommand: "npm run setup:verify",
      }),
      expect.objectContaining({
        id: "command_wave_state",
        url: "https://command-waves.example.com/api/command-wave/state",
        requiredHashFields: ["waveStateHash", "stateHash"],
      }),
      expect.objectContaining({
        id: "project_index",
        url: "https://command-waves.example.com/api/command-wave/projects",
        requiredHashFields: ["projectsHash"],
      }),
      expect.objectContaining({
        id: "launch_audit",
        url: "https://command-waves.example.com/api/command-wave/launch/audit",
        requiredHashFields: ["auditHash"],
        verifierCommand: "npm run launch:audit",
      }),
      expect.objectContaining({
        id: "chat_launch",
        url: "https://command-waves.example.com/api/command-wave/launch/chat",
        requiredHashFields: ["chatLaunchHash", "sourceAuditHash"],
        verifierCommand: "npm run chat:launch",
      }),
    ]);
    expect(manifest.endpoints.find((endpoint) => endpoint.id === "chat_launch")?.hashes).toMatchObject({
      generated: expect.stringMatching(/^[a-f0-9]{64}$/),
      source: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(JSON.stringify(manifest)).not.toContain("\u2014");
  });

  it("keeps stable anchors stable across generated times", async () => {
    const first = await createPublicVerificationManifest(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: manifestEnv,
    });
    const second = await createPublicVerificationManifest(demoWave, {
      generatedAt: "2026-06-20T13:01:00.000Z",
      env: manifestEnv,
    });

    expect(first.generatedAt).not.toBe(second.generatedAt);
    expect(first.manifestHash).not.toBe(second.manifestHash);
    expect(first.stableAnchors).toEqual(second.stableAnchors);
  });
});
