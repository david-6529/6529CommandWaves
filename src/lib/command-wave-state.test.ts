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
      guardian: {
        envVar: "COMMAND_WAVE_STATE_URL",
        expectedPayload: "wave",
      },
    });
    expect(snapshot.waveStateHash).toBe(hashValue(demoWave));
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
});
