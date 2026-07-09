import type { CommandWave } from "./command-waves";
import type { PhaseNextAction } from "./phase-next-action";

export function createBuilderWaveChatDraft(_wave: CommandWave, _nextAction: PhaseNextAction, message = "") {
  return message.trim() || "[Write your message here.]";
}
