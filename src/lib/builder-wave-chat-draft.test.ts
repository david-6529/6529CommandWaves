import { describe, expect, it } from "vitest";
import { createBuilderWaveChatDraft } from "./builder-wave-chat-draft";
import { demoWave } from "./demo-wave";
import { createPhaseChecklist } from "./phase-checklist";
import { createPhaseNextAction } from "./phase-next-action";

const placeholderRepoText = "Placeholder repo (Connect the real hook repo before PR work can run.)";

describe("build room chat draft", () => {
  it("creates a concise message for the project chat", () => {
    const nextAction = createPhaseNextAction(createPhaseChecklist(demoWave));
    const draft = createBuilderWaveChatDraft(demoWave, nextAction, "I can review the fee cap tests.");

    expect(draft).toContain("Project chat message");
    expect(draft).toContain("I can review the fee cap tests.");
    expect(draft).toContain(`Project chat: ${demoWave.waveUrl}`);
    expect(draft).toContain(`Repo: ${placeholderRepoText}`);
    expect(draft).toContain(`Current hook change: ${nextAction.title}`);
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
