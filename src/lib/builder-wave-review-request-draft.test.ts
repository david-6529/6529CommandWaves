import { describe, expect, it } from "vitest";
import { createBuilderWaveReviewRequestDraft } from "./builder-wave-review-request-draft";
import { demoWave } from "./demo-wave";

describe("builder wave review request draft", () => {
  it("creates a manual review request from an approved PR record", () => {
    const draft = createBuilderWaveReviewRequestDraft({
      wave: demoWave,
      proposal: demoWave.proposals[0],
      execution: demoWave.executions[0],
    });

    expect(draft).toContain("6529 hook review request");
    expect(draft).toContain(`6529 discussion: ${demoWave.waveUrl}`);
    expect(draft).toContain(`GitHub repo: ${demoWave.repoUrl}`);
    expect(draft).toContain(`Work: ${demoWave.proposals[0].id} - ${demoWave.proposals[0].title}`);
    expect(draft).toContain("PR: https://github.com/6529-Collections/6529-hook/pull/12");
    expect(draft).toContain("Build record:");
    expect(draft).toContain("- Command Waves manifest and 6529 decision receipt are present.");
    expect(draft).toContain("- No proxy, delegatecall, deploy, payment, or governance change is introduced.");
    expect(draft).toContain("does not merge, deploy, approve payouts, or change governance");
    expect(draft).not.toContain("\u2014");
  });

  it("keeps the request draft explicit when the PR record is missing", () => {
    const draft = createBuilderWaveReviewRequestDraft({
      wave: demoWave,
      proposal: demoWave.proposals[0],
      execution: null,
    });

    expect(draft).toContain("PR: not recorded yet");
    expect(draft).toContain("- PR record is not attached yet.");
    expect(draft).not.toContain("\u2014");
  });
});
