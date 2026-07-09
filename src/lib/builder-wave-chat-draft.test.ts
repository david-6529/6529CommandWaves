import { describe, expect, it } from "vitest";
import { createBuilderWaveChatDraft } from "./builder-wave-chat-draft";
import { demoWave } from "./demo-wave";
import { createPhaseChecklist } from "./phase-checklist";
import { createPhaseNextAction } from "./phase-next-action";

describe("project chat draft", () => {
  it("keeps chat posts as plain group messages", () => {
    const nextAction = createPhaseNextAction(createPhaseChecklist(demoWave));
    const draft = createBuilderWaveChatDraft(demoWave, nextAction, "I can review the fee cap tests.");

    expect(draft).toBe("I can review the fee cap tests.");
    expect(draft).not.toContain("Project chat message");
    expect(draft).not.toContain(`Project chat: ${demoWave.waveUrl}`);
    expect(draft).not.toContain(`Current hook change: ${nextAction.title}`);
    expect(draft).not.toContain(`Status: ${nextAction.detail}`);
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
