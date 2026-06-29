import { describe, expect, it } from "vitest";
import { createBuilderWaveLaunchDraft } from "./builder-wave-launch-draft";
import { demoWave } from "./demo-wave";

describe("builder wave launch draft", () => {
  it("creates a concise first post for the hook builder wave", () => {
    const draft = createBuilderWaveLaunchDraft(demoWave);

    expect(draft).toContain("6529 hook launch brief");
    expect(draft).toContain(`6529 discussion: ${demoWave.waveUrl}`);
    expect(draft).toContain(`GitHub repo: ${demoWave.repoUrl}`);
    expect(draft).toContain("Contributor rules: https://github.com/6529-Collections/6529-hook/blob/main/CONTRIBUTING.md");
    expect(draft).toContain("coordinate the first public build for a non-upgradeable 6529 hook");
    expect(draft).toContain("Wait for a 6529 decision before PR work starts.");
    expect(draft).toContain("Open draft PRs with the repo template and Command Waves manifest.");
    expect(draft).toContain("Let reviewer CI check the PR before humans merge.");
    expect(draft).toContain("Gates decide who can play");
    expect(draft).toContain("Orchestration rules classify risk");
    expect(draft).toContain("No proxy, delegatecall, deployment, spending, payouts, or governance changes in phase 1.");
    expect(draft).toContain("Participation notes (advisory):");
    expect(draft).toContain("not REP, TDH, payments, permissions, or merge rights");
    expect(draft).not.toContain("\u2014");
  });

  it("handles projects without participation notes", () => {
    const draft = createBuilderWaveLaunchDraft({
      ...demoWave,
      gates: [],
    });

    expect(draft).toContain("Participation notes: none recorded yet.");
    expect(draft).not.toContain("Participation notes (advisory):");
  });

  it("omits contributor rules when the repo is not a GitHub repo", () => {
    const draft = createBuilderWaveLaunchDraft({
      ...demoWave,
      repoUrl: "not a repo",
    });

    expect(draft).toContain("GitHub repo: not a repo");
    expect(draft).not.toContain("Contributor rules:");
  });
});
