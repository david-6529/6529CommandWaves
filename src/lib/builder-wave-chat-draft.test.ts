import { describe, expect, it } from "vitest";
import { createBuilderWaveChatDraft } from "./builder-wave-chat-draft";
import { demoWave } from "./demo-wave";
import { createPhaseChecklist } from "./phase-checklist";
import { createPhaseNextAction } from "./phase-next-action";

describe("builder wave chat draft", () => {
  it("creates a concise message for the builder wave", () => {
    const nextAction = createPhaseNextAction(createPhaseChecklist(demoWave));
    const draft = createBuilderWaveChatDraft(demoWave, nextAction);

    expect(draft).toContain("I want to talk about the 6529 hook build.");
    expect(draft).toContain(`Builder wave: ${demoWave.waveUrl}`);
    expect(draft).toContain(`Repo: ${demoWave.repoUrl}`);
    expect(draft).toContain(`Focus: ${nextAction.title}`);
    expect(draft).toContain(`Status: ${nextAction.detail}`);
    expect(draft).toContain("Message:");
    expect(draft).toContain("- Keep this tied to one PR-sized hook change.");
    expect(draft).toContain("Do not treat this message as a vote, payout, deploy, or governance approval.");
    expect(draft).toContain("post this in the builder wave");
    expect(draft).toContain("Record a decision URL only if the swarm approves work.");
    expect(draft).not.toContain("\u2014");
  });
});
