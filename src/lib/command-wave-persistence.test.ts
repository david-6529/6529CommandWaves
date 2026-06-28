import { existsSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearCommandWaveStoreForTests,
  getCommandWave,
  replaceCommandWave,
  resetCommandWave,
  submitCommandProposal,
} from "./command-wave-store";
import { demoWave } from "./command-waves";
import { deletePersistedCommandWave, getCommandWaveStoreMode } from "./command-wave-persistence";

describe("command wave persistence", () => {
  const previousStoreMode = process.env.COMMAND_WAVE_STORE;
  const storeFile = ".data/command-wave-test.json";

  beforeEach(async () => {
    process.env.COMMAND_WAVE_STORE = "file";
    clearCommandWaveStoreForTests();
    await deletePersistedCommandWave();
  });

  afterEach(async () => {
    clearCommandWaveStoreForTests();
    await deletePersistedCommandWave();

    if (previousStoreMode === undefined) {
      delete process.env.COMMAND_WAVE_STORE;
    } else {
      process.env.COMMAND_WAVE_STORE = previousStoreMode;
    }

  });

  it("persists command wave mutations and reloads them after memory is cleared", async () => {
    expect(getCommandWaveStoreMode()).toBe("file");

    await resetCommandWave();
    const updated = await submitCommandProposal({
      title: "Persist me",
      proposer: "tester",
      kind: "draft_response",
      prompt: "Draft a short update.",
      spec: "Draft only.",
      budgetUsd: 0,
    });

    expect(updated.proposals[0]).toMatchObject({
      id: "cmd-002",
      title: "Persist me",
      status: "approved",
    });
    expect(existsSync(storeFile)).toBe(true);
    expect(JSON.parse(readFileSync(storeFile, "utf8")).proposals[0]).toMatchObject({
      id: "cmd-002",
      title: "Persist me",
    });

    clearCommandWaveStoreForTests();

    expect((await getCommandWave()).proposals[0]).toMatchObject({
      id: "cmd-002",
      title: "Persist me",
    });
  });

  it("migrates the old built-in demo state to the hook project demo", async () => {
    await replaceCommandWave({
      ...demoWave,
      id: "cw-6529-shipyard",
      waveUrl: "https://6529.io/waves/demo-command-wave",
      repoUrl: "https://github.com/6529-Collections/example-command-wave",
    });

    clearCommandWaveStoreForTests();

    expect(await getCommandWave()).toMatchObject({
      id: "cw-6529-hook-builder",
      waveUrl: "https://6529.io/waves/6529-hook-builder",
      repoUrl: "https://github.com/6529-Collections/6529-hook",
    });
  });

  it("refreshes stale built-in hook demo records without changing custom activity", async () => {
    await replaceCommandWave({
      ...demoWave,
      proposals: [{ ...demoWave.proposals[0], status: "approved" }],
      executions: [
        {
          proposalId: "cmd-001",
          harness: "codex",
          status: "complete",
          summary: "Mock execution opened a PR with copy-only changes bound to the approved spec.",
          artifacts: ["PR #12"],
        },
      ],
      ledger: [
        {
          id: "evt-001",
          at: "2026-06-20T12:00:00.000Z",
          actor: "Setup",
          type: "wave_created",
          message: "Created Command Waves Demo and attached 6529 wave + GitHub repo.",
        },
      ],
    });

    clearCommandWaveStoreForTests();

    const wave = await getCommandWave();

    expect(wave.executions[0]?.summary).toBe(
      "Mock execution opened a PR with the hook scaffold and parameter-bound tests bound to the approved spec.",
    );
    expect(wave.proposals[0]?.status).toBe("complete");
    expect(wave.ledger[0]?.message).toBe("Created 6529 Hook Builder and attached the builder wave plus GitHub repo.");
  });

  it("keeps custom local hook demo activity during stale status migration", async () => {
    await replaceCommandWave({
      ...demoWave,
      proposals: [{ ...demoWave.proposals[0], status: "approved" }],
      executions: [
        {
          proposalId: "cmd-001",
          harness: "codex",
          status: "complete",
          summary: "Local agent mock opened a deterministic PR artifact for the approved command.",
          artifacts: ["PR #99"],
        },
      ],
      reviews: [],
    });

    clearCommandWaveStoreForTests();

    const wave = await getCommandWave();

    expect(wave.proposals[0]?.status).toBe("approved");
    expect(wave.executions[0]?.summary).toBe("Local agent mock opened a deterministic PR artifact for the approved command.");
    expect(wave.executions[0]?.artifacts).toEqual(["PR #99"]);
  });
});
