import { describe, expect, it } from "vitest";
import { applyInitialCommandWaveProject, hasInitialCommandWaveProject } from "./command-wave-seed";
import { demoWave } from "./demo-wave";

const seedEnv = {
  COMMAND_WAVE_INITIAL_NAME: "6529 Hook",
  COMMAND_WAVE_INITIAL_WAVE_URL: "https://6529.io/waves/real-hook-chat",
  COMMAND_WAVE_INITIAL_REPO_URL: "https://github.com/6529-Collections/real-hook",
};

describe("command wave seed", () => {
  it("detects explicit first project seed settings", () => {
    expect(hasInitialCommandWaveProject(seedEnv)).toBe(true);
    expect(hasInitialCommandWaveProject({ COMMAND_WAVE_INITIAL_NAME: "6529 Hook" })).toBe(false);
  });

  it("creates a clean first project from environment setup", () => {
    const wave = applyInitialCommandWaveProject(demoWave, seedEnv, {
      generatedAt: "2026-06-20T13:00:00.000Z",
    });

    expect(wave).toMatchObject({
      id: demoWave.id,
      name: "6529 Hook",
      waveUrl: "https://6529.io/waves/real-hook-chat",
      repoUrl: "https://github.com/6529-Collections/real-hook",
      proposals: [],
      polls: [],
      executions: [],
      reviews: [],
    });
    expect(wave.ledger).toEqual([
      {
        id: "evt-001",
        at: "2026-06-20T13:00:00.000Z",
        actor: "Setup",
        type: "wave_created",
        message: "Created the first hook project from environment setup.",
      },
    ]);
  });

  it("throws on invalid seed setup", () => {
    expect(() =>
      applyInitialCommandWaveProject(demoWave, {
        COMMAND_WAVE_INITIAL_WAVE_URL: "../bad wave",
        COMMAND_WAVE_INITIAL_REPO_URL: "not github",
      }),
    ).toThrow("Fix COMMAND_WAVE_INITIAL_WAVE_URL and COMMAND_WAVE_INITIAL_REPO_URL before starting the first project.");
  });

  it("does not emit em dash characters", () => {
    const wave = applyInitialCommandWaveProject(demoWave, seedEnv, {
      generatedAt: "2026-06-20T13:00:00.000Z",
    });

    expect(JSON.stringify(wave)).not.toContain("\u2014");
  });
});
