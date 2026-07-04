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
    expect(snapshot.reports.contribution.notes.join(" ")).toContain("not a permission system");
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
