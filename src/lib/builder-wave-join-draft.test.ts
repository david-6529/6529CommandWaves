import { describe, expect, it } from "vitest";
import { createBuilderWaveJoinDraft } from "./builder-wave-join-draft";

describe("6529 discussion join draft", () => {
  it("creates a short join request with the builder handle", () => {
    const draft = createBuilderWaveJoinDraft(" david ");

    expect(draft).toContain("I would like to help with this hook.");
    expect(draft).toContain("Handle: david.");
    expect(draft).toContain("access is reviewed manually");
    expect(draft).toContain("discussion, review, tests, or a small PR");
    expect(draft).toContain("visible 6529 decision before PR work starts");
    expect(draft).toContain("What should I take next?");
    expect(draft).not.toContain("\u2014");
  });

  it("keeps missing handles explicit", () => {
    const draft = createBuilderWaveJoinDraft("");

    expect(draft).toContain("Handle: not set yet.");
    expect(draft).not.toContain("\u2014");
  });
});
