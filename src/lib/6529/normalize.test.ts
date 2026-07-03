import { describe, expect, it } from "vitest";
import { normalizeWaveId } from "./client";
import { normalizeWaveDrop, normalizeWaveDropsResponse } from "./normalize";

describe("6529 normalization", () => {
  it("normalizes pasted wave URLs into wave IDs", () => {
    expect(normalizeWaveId("https://6529.io/waves/49f0e595-ec7c-4235-8695-a527f61b69f4?tab=latest")).toBe(
      "49f0e595-ec7c-4235-8695-a527f61b69f4",
    );
    expect(normalizeWaveId("  raw-wave-id  ")).toBe("raw-wave-id");
  });

  it("rejects oversized wave IDs", () => {
    expect(() => normalizeWaveId("x".repeat(161))).toThrow("6529 wave id must be 160 characters or less.");
    expect(() => normalizeWaveId(`https://6529.io/waves/${"x".repeat(161)}`)).toThrow(
      "6529 wave id must be 160 characters or less.",
    );
  });

  it("rejects malformed wave IDs", () => {
    expect(() => normalizeWaveId("bad wave")).toThrow(
      "6529 wave id can only include letters, numbers, hyphens, underscores, or periods.",
    );
    expect(() => normalizeWaveId("../other-wave")).toThrow(
      "6529 wave id can only include letters, numbers, hyphens, underscores, or periods.",
    );
  });

  it("normalizes drop content, author, serial, and timestamps", () => {
    const drop = normalizeWaveDrop({
      drop_id: "drop-1",
      serial_no: "42",
      created_at: "2026-06-20T12:00:00.000Z",
      parts: [{ content: "First part" }, { content: "Second part" }],
      author: { handle: "tester" },
    });

    expect(drop).toMatchObject({
      id: "drop-1",
      serial_no: 42,
      content: "First part\n\nSecond part",
      author: { handle: "tester" },
    });
    expect(drop.created_at).toBe(Date.parse("2026-06-20T12:00:00.000Z"));
  });

  it("normalizes wrapped drop arrays", () => {
    const response = normalizeWaveDropsResponse({
      result: {
        wave: { id: "wave-1", name: "Wave One" },
        items: [{ id: "drop-1", content: "hello" }],
      },
    });

    expect(response.wave).toMatchObject({ id: "wave-1" });
    expect(response.drops).toHaveLength(1);
    expect(response.drops[0]).toMatchObject({ id: "drop-1", content: "hello" });
  });
});
