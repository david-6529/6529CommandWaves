import type { CommandWave } from "./command-waves";
import type { PhaseNextAction } from "./phase-next-action";

export function createBuilderWaveChatDraft(wave: CommandWave, nextAction: PhaseNextAction, message = "") {
  const body = message.trim() || "[Write your message here.]";

  return [
    "Build room message",
    "",
    body,
    "",
    `Current hook change: ${nextAction.title}`,
    `- Status: ${nextAction.detail}`,
    `- Repo: ${wave.repoUrl}`,
    `- Project room: ${wave.waveUrl}`,
  ].join("\n");
}
