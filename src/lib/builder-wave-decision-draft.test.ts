import { describe, expect, it } from "vitest";
import { createBuilderWaveDecisionDraft } from "./builder-wave-decision-draft";
import { demoWave } from "./demo-wave";

describe("build room decision draft", () => {
  it("creates a concise decision request for the builder wave", () => {
    const draft = createBuilderWaveDecisionDraft({
      wave: demoWave,
      proposal: demoWave.proposals[0],
      poll: demoWave.polls[0],
    });

    expect(draft).toContain("Build room decision request");
    expect(draft).toContain(`Project room: ${demoWave.waveUrl}`);
    expect(draft).toContain(`Code repo: ${demoWave.repoUrl}`);
    expect(draft).toContain(`Proposal: ${demoWave.proposals[0].id} - ${demoWave.proposals[0].title}`);
    expect(draft).toContain("Local tally: 5 yes, 1 no.");
    expect(draft).toContain("Decision needed: approve, reject, or ask for edits");
    expect(draft).toContain("link the room decision URL back into the app");
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
