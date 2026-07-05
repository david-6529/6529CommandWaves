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
      verificationTargets: {
        setupProofUrl: "https://hooks.example/api/command-wave/setup/proof",
        commandWaveStateUrl: "https://hooks.example/api/command-wave/state",
        launchAuditUrl: "https://hooks.example/api/command-wave/launch/audit",
      },
    });

    expect(draft).toContain("Build room update");
    expect(draft).toContain(`Work: ${proposal.id} - ${proposal.title}`);
    expect(draft).toContain("Decision: passed with 5 yes, 1 no");
    expect(draft).toContain("receipt https://6529.io/waves/6529-hook-builder/drops/drop-cmd-001-approval.");
    expect(draft).toContain("PR: https://github.com/6529-Collections/6529-hook/pull/12");
    expect(draft).toContain(
      `Review proof: ${demoWave.reviews[0].proof?.verifierVersion} / ${demoWave.reviews[0].proof?.attestationHash}`,
    );
    expect(draft).toContain("Verification: setup proof https://hooks.example/api/command-wave/setup/proof");
    expect(draft).toContain("state https://hooks.example/api/command-wave/state");
    expect(draft).toContain("launch audit https://hooks.example/api/command-wave/launch/audit.");
    expect(draft).toContain("humans keep merge, deploy, payment, and governance authority");
    expect(draft).toContain("Report scores are informational only.");
    expect(draft).toContain("Developer fee plan:");
    expect(draft).toContain("No automatic payouts.");
    expect(draft).toContain("post it manually in the room if it matches the work");
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

    expect(draft).toContain("Work: none selected yet.");
    expect(draft).toContain("Build: waiting for an approved PR change.");
    expect(draft).toContain("Review: waiting for a PR record.");
  });

  it("keeps local vote approval waiting for a room decision receipt", () => {
    const draft = createWaveUpdateDraft({
      wave: demoWave,
      proposal: {
        ...demoWave.proposals[0],
        status: "ready_for_vote",
      },
      poll: {
        ...demoWave.polls[0],
        decision: null,
      },
      execution: null,
      review: null,
    });

    expect(draft).toContain("Decision: passed with 5 yes, 1 no");
    expect(draft).toContain("Build: waiting for a recorded room decision.");
  });
});
