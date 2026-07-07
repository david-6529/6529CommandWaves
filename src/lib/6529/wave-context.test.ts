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
      author: "daemon",
      preview: "GitHub repo placeholder for now. Which GitHub repo should hold the hook before PR work starts?",
    });
    expect(preview.sampleDrops.find((drop) => drop.id === "drop-002")).toMatchObject({
      author: "wave-poll",
      preview: "Builders approved the hook scaffold proposal.",
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

  it("caps excessive context preview sizes", async () => {
    const preview = await previewWaveContext({
      waveId: "mock-command-wave",
      includeAllHistory: true,
      maxMessages: 10_000,
    });

    expect(preview.context.maxMessages).toBe(500);
    expect(preview.context.maxMessagesPerWave).toBe(500);
  });

  it("normalizes invalid context preview sizes", async () => {
    const preview = await previewWaveContext({
      waveId: "mock-command-wave",
      includeAllHistory: true,
      maxMessages: Number.NaN,
    });

    expect(preview.context.maxMessages).toBe(500);
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

  it("ignores malformed related wave entries", async () => {
    const context = await fetchWaveContext({
      waveId: "mock-command-wave",
      includeAllHistory: true,
      relatedWaves: [
        null,
        42,
        { waveId: "" },
        { waveId: "mock-command-wave" },
        { waveId: "mock-related-wave", label: "  Side chat  " },
      ] as unknown as Parameters<typeof fetchWaveContext>[0]["relatedWaves"],
    });

    expect(context.context.sources).toHaveLength(2);
    expect(context.context.sources[1]).toMatchObject({
      waveId: "mock-related-wave",
      label: "Side chat",
      primary: false,
    });
  });

  it("rejects non-string context window values", async () => {
    await expect(
      fetchWaveContext({
        waveId: "mock-command-wave",
        contextFrom: 123 as unknown as string,
      }),
    ).rejects.toMatchObject({
      message: "Context window start must be an ISO date string.",
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
