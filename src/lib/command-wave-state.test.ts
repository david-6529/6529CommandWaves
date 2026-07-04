import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { commandWaveStateUrlFromEnv, createCommandWaveStateSnapshot } from "./command-wave-state";
import { hashValue } from "./run-manifest";

describe("command wave state snapshot", () => {
  it("publishes the current wave in guardian-readable shape", () => {
    const snapshot = createCommandWaveStateSnapshot(demoWave, {
      generatedAt: "2026-06-21T12:00:00.000Z",
    });

    expect(snapshot).toMatchObject({
      version: "command-wave-state-v0.1",
      generatedAt: "2026-06-21T12:00:00.000Z",
      wave: demoWave,
      productContract: {
        name: "Decentralized Coding",
        purpose: "A new form of swarm development for the age of AI",
        workflow: ["Choose project", "Discuss work", "Record decision", "Build PR", "Review", "Log result"],
        publicSurfaces: ["6529 wave discussion", "GitHub PR record", "Command Waves audit log"],
      },
      authorityBoundary: {
        phase: "first_public_hook_build",
        socialSourceOfTruth: "6529 wave",
        codeSurface: "GitHub PR",
        humansControl: ["Merges", "Deploys", "Payments", "Governance changes"],
        appDoesNot: [
          "Auto-merge PRs",
          "Deploy contracts",
          "Move funds",
          "Grant REP, TDH, payouts, permissions, or merge rights from contribution scores",
        ],
        gateStatus: "REP, TDH, holder, allowlist, and QnA gates are advisory until wired and verified.",
      },
      reports: {
        contribution: {
          mode: "informational",
          method: {
            id: "visible_activity_v0",
            label: "Visible activity report",
            authority: "Informational only",
          },
          generatedAt: "2026-06-21T12:00:00.000Z",
        },
      },
      guardian: {
        envVar: "COMMAND_WAVE_STATE_URL",
        expectedPayload: "command-wave-state-v0.1 snapshot",
      },
    });
    expect(snapshot.waveStateHash).toBe(hashValue(demoWave));
    expect(snapshot.productContract.firstPhaseLimits.join(" ")).toContain("Contribution reports are evidence");
    expect(snapshot.reports.contribution.notes.join(" ")).toContain("not a permission system");
    expect(snapshot.authorityBoundary.agentLimits.join(" ")).toContain("Reviewer checks are evidence");
  });

  it("builds the public state URL from env", () => {
    expect(
      commandWaveStateUrlFromEnv({
        NEXT_PUBLIC_APP_URL: "https://hooks.example/",
      }),
    ).toBe("https://hooks.example/api/command-wave/state");
    expect(
      commandWaveStateUrlFromEnv({
        COMMAND_WAVE_STATE_URL: "https://state.example/wave.json",
        NEXT_PUBLIC_APP_URL: "https://hooks.example",
      }),
    ).toBe("https://state.example/wave.json");
    expect(commandWaveStateUrlFromEnv({})).toBeNull();
  });

  it("ignores placeholder state URLs in production", () => {
    expect(
      commandWaveStateUrlFromEnv({
        NODE_ENV: "production",
        COMMAND_WAVE_STATE_URL: "https://your-app.example/api/command-wave/state",
        NEXT_PUBLIC_APP_URL: "https://your-app.example",
      }),
    ).toBeNull();
  });
});
