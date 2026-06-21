import { existsSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearCommandWaveStoreForTests,
  getCommandWave,
  resetCommandWave,
  submitCommandProposal,
} from "./command-wave-store";
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
});
