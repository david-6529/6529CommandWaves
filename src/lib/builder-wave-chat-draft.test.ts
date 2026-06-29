import { describe, expect, it } from "vitest";
import { createBuilderWaveChatDraft } from "./builder-wave-chat-draft";
import { demoWave } from "./demo-wave";
import { createPhaseChecklist } from "./phase-checklist";
import { createPhaseNextAction } from "./phase-next-action";

describe("6529 discussion chat draft", () => {
  it("creates a concise message for the 6529 discussion", () => {
    const nextAction = createPhaseNextAction(createPhaseChecklist(demoWave));
    const draft = createBuilderWaveChatDraft(demoWave, nextAction, "I can review the fee cap tests.");

    expect(draft).toContain("6529 hook message");
    expect(draft).toContain("I can review the fee cap tests.");
    expect(draft).toContain(`6529 discussion: ${demoWave.waveUrl}`);
    expect(draft).toContain(`Repo: ${demoWave.repoUrl}`);
    expect(draft).toContain(`Current task: ${nextAction.title}`);
    expect(draft).toContain(`Status: ${nextAction.detail}`);
    expect(draft).not.toContain("Rules I am following");
    expect(draft).not.toContain("\u2014");
  });

  it("keeps an empty message explicit", () => {
    const nextAction = createPhaseNextAction(createPhaseChecklist(demoWave));
    const draft = createBuilderWaveChatDraft(demoWave, nextAction);

    expect(draft).toContain("[Write your message here.]");
    expect(draft).not.toContain("\u2014");
  });
});
