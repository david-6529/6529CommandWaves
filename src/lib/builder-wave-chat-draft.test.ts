import { describe, expect, it } from "vitest";
import { createBuilderWaveChatDraft } from "./builder-wave-chat-draft";
import { demoWave } from "./demo-wave";
import { createPhaseChecklist } from "./phase-checklist";
import { createPhaseNextAction } from "./phase-next-action";

describe("builder wave chat draft", () => {
  it("creates a concise note for the builder wave", () => {
    const nextAction = createPhaseNextAction(createPhaseChecklist(demoWave));
    const draft = createBuilderWaveChatDraft(demoWave, nextAction);

    expect(draft).toContain("6529 hook wave note");
    expect(draft).toContain(`Builder wave: ${demoWave.waveUrl}`);
    expect(draft).toContain(`GitHub repo: ${demoWave.repoUrl}`);
    expect(draft).toContain(`Focus: ${nextAction.title}`);
    expect(draft).toContain(`Current status: ${nextAction.detail}`);
    expect(draft).toContain("Question or reply:");
    expect(draft).toContain("- Keep this tied to one PR-sized hook change.");
    expect(draft).toContain("Do not treat this note as a vote, payout, deploy, or governance approval.");
    expect(draft).toContain("Record the decision URL only if the wave approves work.");
    expect(draft).not.toContain("\u2014");
  });
});
