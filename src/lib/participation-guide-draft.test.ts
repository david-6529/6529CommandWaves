import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createParticipationGuideDraft } from "./participation-guide-draft";

describe("participation guide draft", () => {
  it("creates a copyable participation guide for the builder wave", () => {
    const draft = createParticipationGuideDraft(demoWave);

    expect(draft).toContain("Build room participation guide");
    expect(draft).toContain(`Project room: ${demoWave.waveUrl}`);
    expect(draft).toContain(`Code repo: ${demoWave.repoUrl}`);
    expect(draft).toContain("Contributor rules: https://github.com/6529-Collections/6529-hook/blob/main/CONTRIBUTING.md");
    expect(draft).toContain("Participation notes:");
    expect(draft).toContain("Builder loop:");
    expect(draft).toContain("Orchestration rules classify risk");
    expect(draft).toContain("Reviewer CI checks the PR before humans merge.");
    expect(draft).toContain("Propose one PR-sized hook change with limits and tests.");
    expect(draft).toContain("Wait for a room decision URL before PR work starts.");
    expect(draft).toContain("Contribution report scores are informational, not permissions or payments.");
    expect(draft).not.toContain("\u2014");
  });

  it("keeps REP, TDH, holder, allowlist, and QnA gates advisory", () => {
    const draft = createParticipationGuideDraft({
      ...demoWave,
      gates: ["30% of TDH holders can contribute", "AMM QnA pass required", "Builder allowlist"],
    });

    expect(draft).toContain("30% of TDH holders can contribute (manual note only, not enforced by this app)");
    expect(draft).toContain("AMM QnA pass required (manual note only, not enforced by this app)");
    expect(draft).toContain("Builder allowlist (manual note only, not enforced by this app)");
    expect(draft).toContain("Manual QnA prompt:");
    expect(draft).toContain("Reputation, token, holder, allowlist, and QnA notes are advisory until live enforcement is wired.");
  });

  it("omits contributor rules for non-GitHub repos", () => {
    const draft = createParticipationGuideDraft({
      ...demoWave,
      repoUrl: "not a repo",
    });

    expect(draft).toContain("Code repo: not a repo");
    expect(draft).not.toContain("Contributor rules:");
  });
});
