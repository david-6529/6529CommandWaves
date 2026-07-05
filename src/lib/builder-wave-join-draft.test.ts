import { describe, expect, it } from "vitest";
import { createBuilderWaveJoinDraft } from "./builder-wave-join-draft";

describe("build room join draft", () => {
  it("creates a short join request with the builder handle", () => {
    const draft = createBuilderWaveJoinDraft(" david ");

    expect(draft).toContain("I would like to help with this hook.");
    expect(draft).toContain("Handle: david.");
    expect(draft).toContain("Access notes: Manual builder review for phase 1; REP or TDH gates are planned, not enforced here.");
    expect(draft).toContain("access is reviewed manually");
    expect(draft).toContain("discussion, review, tests, or a small PR");
    expect(draft).toContain("visible room decision before PR work starts");
    expect(draft).toContain("What should I take next?");
    expect(draft).not.toContain("\u2014");
  });

  it("keeps missing handles explicit", () => {
    const draft = createBuilderWaveJoinDraft("");

    expect(draft).toContain("Handle: not set yet.");
    expect(draft).not.toContain("\u2014");
  });

  it("normalizes custom holder access notes as manual notes", () => {
    const draft = createBuilderWaveJoinDraft("sam", ["REP 10000", "Answer hook cap question"]);

    expect(draft).toContain("REP 10000 (manual note only, not enforced by this app)");
    expect(draft).toContain("Answer hook cap question");
    expect(draft).not.toContain("\u2014");
  });
});
