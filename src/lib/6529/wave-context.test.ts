import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetMockDropsForTests } from "./mock";
import { fetchWaveContext, previewWaveContext } from "./wave-context";

describe("6529 wave context", () => {
  const previousMockMode = process.env["6529_MOCK_MODE"];

  beforeEach(() => {
    process.env["6529_MOCK_MODE"] = "true";
    resetMockDropsForTests();
  });

  afterEach(() => {
    resetMockDropsForTests();

    if (previousMockMode === undefined) {
      delete process.env["6529_MOCK_MODE"];
    } else {
      process.env["6529_MOCK_MODE"] = previousMockMode;
    }
  });

  it("fetches mock context with source metadata", async () => {
    const context = await fetchWaveContext({
      waveId: "https://6529.io/waves/mock-command-wave",
      includeAllHistory: true,
    });

    expect(context.drops).toHaveLength(3);
    expect(context.context.mode).toBe("all");
    expect(context.context.sources[0]).toMatchObject({
      waveId: "mock-command-wave",
      label: "Primary wave",
      dropCount: 3,
    });
    expect(context.drops[0]).toMatchObject({
      source_wave_id: "mock-command-wave",
      source_wave_role: "Primary wave",
    });
  });

  it("previews the newest drops in chronological context", async () => {
    const preview = await previewWaveContext({
      waveId: "mock-command-wave",
      includeAllHistory: true,
    });

    expect(preview).toMatchObject({
      waveId: "mock-command-wave",
      dropCount: 3,
      fromDropId: "drop-001",
      toDropId: "drop-003",
    });
    expect(preview.sampleDrops.at(-1)).toMatchObject({
      id: "drop-003",
      url: "https://6529.io/waves/mock-command-wave/drops/drop-003",
      author: "reviewer-agent",
      preview: "Review passed cmd-001. The hook scaffold matched the approved proposal and rules.",
    });
  });

  it("caps all-history previews to the requested latest drops", async () => {
    const preview = await previewWaveContext({
      waveId: "mock-command-wave",
      includeAllHistory: true,
      maxMessages: 2,
    });

    expect(preview).toMatchObject({
      waveId: "mock-command-wave",
      dropCount: 2,
      fromDropId: "drop-002",
      toDropId: "drop-003",
    });
    expect(preview.context).toMatchObject({
      mode: "all",
      maxMessages: 2,
    });
  });

  it("rejects missing primary wave ids clearly", async () => {
    const missingWaveIdInput = {} as Parameters<typeof previewWaveContext>[0];

    await expect(previewWaveContext({ waveId: "" })).rejects.toMatchObject({
      message: "Paste a 6529 wave link or wave id.",
      status: 400,
    });

    await expect(previewWaveContext(missingWaveIdInput)).rejects.toMatchObject({
      message: "Paste a 6529 wave link or wave id.",
      status: 400,
    });
  });

  it("rejects conflicting all-history and explicit date windows", async () => {
    await expect(
      fetchWaveContext({
        waveId: "mock-command-wave",
        includeAllHistory: true,
        contextFrom: "2026-06-20",
      }),
    ).rejects.toThrow("Use either all available history or a date window");
  });
});
