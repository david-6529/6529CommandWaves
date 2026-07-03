import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { normalizeWaveSearchResult, searchWaves } from "./wave-search";

describe("6529 wave search", () => {
  const previousMockMode = process.env["6529_MOCK_MODE"];

  beforeEach(() => {
    process.env["6529_MOCK_MODE"] = "true";
  });

  afterEach(() => {
    if (previousMockMode === undefined) {
      delete process.env["6529_MOCK_MODE"];
    } else {
      process.env["6529_MOCK_MODE"] = previousMockMode;
    }
  });

  it("normalizes common wave result shapes", () => {
    expect(
      normalizeWaveSearchResult({
        wave_id: "wave-1",
        wave_name: "Wave One",
        description_drop: {
          parts: [{ content: "A useful wave." }],
        },
      }),
    ).toEqual({
      id: "wave-1",
      name: "Wave One",
      description: "A useful wave.",
      source: "6529",
    });
  });

  it("uses mock 6529 search in mock mode", async () => {
    await expect(searchWaves("mock")).resolves.toEqual([
      {
        id: "mock-command-wave",
        name: "Mock Command Wave",
        description: null,
        source: "6529",
      },
    ]);
  });

  it("ignores one-character searches", async () => {
    await expect(searchWaves("m")).resolves.toEqual([]);
  });

  it("rejects oversized search queries", async () => {
    await expect(searchWaves("x".repeat(121))).rejects.toMatchObject({
      message: "Wave search must be 120 characters or less.",
      status: 400,
    });
  });
});
