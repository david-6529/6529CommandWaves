import { describe, expect, it } from "vitest";
import { createBuilderWaveJoinDraft } from "./builder-wave-join-draft";

describe("6529 discussion join draft", () => {
  it("creates a short join request with the builder handle", () => {
    const draft = createBuilderWaveJoinDraft(" david ");

    expect(draft).toContain("I would like to join the 6529 hook build.");
    expect(draft).toContain("Handle: david.");
    expect(draft).toContain("tests, review, discussion, or a small PR");
    expect(draft).not.toContain("\u2014");
  });

  it("keeps missing handles explicit", () => {
    const draft = createBuilderWaveJoinDraft("");

    expect(draft).toContain("Handle: not set yet.");
    expect(draft).not.toContain("\u2014");
  });
});
