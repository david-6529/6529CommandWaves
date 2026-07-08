import { describe, expect, it } from "vitest";
import { createBuilderWaveReviewRequestDraft } from "./builder-wave-review-request-draft";
import { demoWave } from "./demo-wave";

const placeholderRepoText = "GitHub repo placeholder (No GitHub repo is selected yet. PR work stays blocked until maintainers choose the repo.)";

describe("project review request draft", () => {
  it("creates a manual review request from an approved PR record", () => {
    const draft = createBuilderWaveReviewRequestDraft({
      wave: demoWave,
      proposal: demoWave.proposals[0],
      execution: demoWave.executions[0],
    });

    expect(draft).toContain("Project review request");
    expect(draft).toContain(`Project chat: ${demoWave.waveUrl}`);
    expect(draft).toContain(`GitHub repo: ${placeholderRepoText}`);
    expect(draft).toContain(`Work: ${demoWave.proposals[0].id} - ${demoWave.proposals[0].title}`);
    expect(draft).toContain(`PR: ${demoWave.repoUrl}/pull/12`);
    expect(draft).toContain("Build record:");
    expect(draft).toContain("- Command Waves manifest and project decision link are present.");
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
