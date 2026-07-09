import { describe, expect, it } from "vitest";
import { publicGithubRepoPlaceholder } from "./agent-identities";
import { createChatPostingCapabilityPayload } from "./6529/chat-post";
import { publicCommandWaveHash } from "./command-wave-state";
import { demoWave } from "./demo-wave";
import { createPublicContributionReport } from "./public-contribution-report";
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
        waveStateHash: publicCommandWaveHash(demoWave),
        rulesHash: hashValue(demoWave.rules),
        proposalCount: demoWave.proposals.length,
        reviewCount: 0,
        ledgerEventCount: 4,
      },
      launchTracks: {
        chat: {
          status: "needs_setup",
          statusLabel: "checks needed",
          nextAction: {
            title: "Run project chat check",
          },
        },
        prLoop: {
          status: "needs_setup",
          statusLabel: "checks needed",
          nextAction: {
            title: "Repo not selected yet",
          },
        },
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
        id: "contribution_report",
        url: "https://command-waves.example.com/api/command-wave/reports/contribution",
        requiredHashFields: ["reportHash"],
        verifierCommand: null,
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
      expect.objectContaining({
        id: "chat_posting_capability",
        url: "https://command-waves.example.com/api/6529/chat-post",
        requiredHashFields: ["capabilityHash"],
        verifierCommand: null,
      }),
    ]);
    expect(manifest.endpoints.find((endpoint) => endpoint.id === "chat_launch")?.hashes).toMatchObject({
      generated: expect.stringMatching(/^[a-f0-9]{64}$/),
      source: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(manifest.endpoints.find((endpoint) => endpoint.id === "contribution_report")?.hashes).toMatchObject({
      generated: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(manifest.endpoints.find((endpoint) => endpoint.id === "contribution_report")?.hashes.generated).toBe(
      createPublicContributionReport(demoWave).reportHash,
    );
    expect(manifest.endpoints.find((endpoint) => endpoint.id === "chat_posting_capability")?.hashes.stable).toBe(
      createChatPostingCapabilityPayload(manifestEnv).capabilityHash,
    );
    expect(JSON.stringify(manifest)).not.toContain("\u2014");
    expect(JSON.stringify(manifest)).not.toContain("6529_BOT");
    expect(JSON.stringify(manifest)).not.toContain("windowMs");
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

  it("keeps old concrete pilot repo evidence published as a placeholder", async () => {
    const generatedAt = "2026-06-20T13:00:00.000Z";
    const staleConcretePilot = {
      ...demoWave,
      repoUrl: "https://github.com/6529-Collections/6529-hook",
    };
    const manifest = await createPublicVerificationManifest(staleConcretePilot, {
      generatedAt,
      env: manifestEnv,
    });
    const placeholderManifest = await createPublicVerificationManifest(demoWave, {
      generatedAt,
      env: manifestEnv,
    });

    expect(manifest.project.repoStatus).toBe("placeholder");
    expect(manifest.stableAnchors.setupHash).toBe(placeholderManifest.stableAnchors.setupHash);
    expect(manifest.stableAnchors.reviewCount).toBe(0);
    expect(JSON.stringify(manifest)).not.toContain("https://github.com/6529-Collections/6529-hook");
  });
});
