import type { CommandWave } from "./command-waves";
import type { PhaseNextAction } from "./phase-next-action";

export function createBuilderWaveChatDraft(wave: CommandWave, nextAction: PhaseNextAction) {
  return [
    "I want to talk about the 6529 hook build.",
    "",
    "Message:",
    "[Write the question, answer, or small change here.]",
    "",
    "Current context:",
    `- Focus: ${nextAction.title}`,
    `- Status: ${nextAction.detail}`,
    `- Repo: ${wave.repoUrl}`,
    `- Builder wave: ${wave.waveUrl}`,
    "",
    "Rules I am following:",
    "- Keep this tied to one PR-sized hook change.",
    "- Do not treat this message as a vote, payout, deploy, or governance approval.",
    "",
    "Next step: post this in the builder wave. Record a decision URL only if the swarm approves work.",
  ].join("\n");
}
