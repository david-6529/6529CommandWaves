import { describe, expect, it } from "vitest";
import { createBuilderWaveDecisionDraft } from "./builder-wave-decision-draft";
import { demoWave } from "./demo-wave";

const placeholderRepoText = "GitHub repo placeholder (The GitHub repo is a placeholder until the pilot repo is selected.)";

describe("build project decision draft", () => {
  it("creates a concise decision request for the builder wave", () => {
    const draft = createBuilderWaveDecisionDraft({
      wave: demoWave,
      proposal: demoWave.proposals[0],
      poll: demoWave.polls[0],
    });

    expect(draft).toContain("Project decision request");
    expect(draft).toContain(`Project chat: ${demoWave.waveUrl}`);
    expect(draft).toContain(`GitHub repo: ${placeholderRepoText}`);
    expect(draft).toContain(`Proposal: ${demoWave.proposals[0].id} - ${demoWave.proposals[0].title}`);
    expect(draft).toContain("Local tally: 5 yes, 1 no.");
    expect(draft).toContain("Decision needed: approve, reject, or ask for edits");
    expect(draft).toContain("link the project decision URL back into the app");
    expect(draft).not.toContain("\u2014");
  });

  it("does not require a local tally to request a wave decision", () => {
    const draft = createBuilderWaveDecisionDraft({
      wave: demoWave,
      proposal: demoWave.proposals[0],
      poll: null,
    });

    expect(draft).toContain("Local tally: not started in the app.");
  });
});
