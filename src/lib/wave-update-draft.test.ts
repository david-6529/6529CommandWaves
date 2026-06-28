import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createWaveUpdateDraft } from "./wave-update-draft";

describe("wave update draft", () => {
  it("summarizes the current hook project without claiming live posting or authority", () => {
    const proposal = demoWave.proposals[0];
    const draft = createWaveUpdateDraft({
      wave: demoWave,
      proposal,
      poll: demoWave.polls[0],
      execution: demoWave.executions[0],
      review: demoWave.reviews[0],
    });

    expect(draft).toContain("6529 Hook Builder update");
    expect(draft).toContain(`Command: ${proposal.id} - ${proposal.title}`);
    expect(draft).toContain("Decision: passed with 5 yes, 1 no");
    expect(draft).toContain("humans keep merge, deploy, payment, and governance authority");
    expect(draft).toContain("Scores are informational only.");
    expect(draft).toContain("post it in the builder wave if it matches the work");
    expect(draft).not.toContain("automatically posted");
  });

  it("handles early setup before a proposal has run", () => {
    const draft = createWaveUpdateDraft({
      wave: {
        ...demoWave,
        proposals: [],
        polls: [],
        executions: [],
        reviews: [],
      },
      proposal: null,
      poll: null,
      execution: null,
      review: null,
    });

    expect(draft).toContain("Command: none selected yet.");
    expect(draft).toContain("Build: waiting for an approved PR command.");
    expect(draft).toContain("Review: waiting for execution evidence.");
  });
});
