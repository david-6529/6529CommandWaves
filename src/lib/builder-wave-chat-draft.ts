import type { CommandWave } from "./command-waves";
import type { PhaseNextAction } from "./phase-next-action";

export function createBuilderWaveChatDraft(wave: CommandWave, nextAction: PhaseNextAction) {
  return [
    "6529 hook wave note",
    "",
    `Builder wave: ${wave.waveUrl}`,
    `GitHub repo: ${wave.repoUrl}`,
    `Focus: ${nextAction.title}`,
    `Current status: ${nextAction.detail}`,
    "",
    "Question or reply:",
    "[Write the question, answer, or project note here.]",
    "",
    "Guardrails:",
    "- Keep this tied to one PR-sized hook change.",
    "- Do not treat this note as a vote, payout, deploy, or governance approval.",
    "",
    "Next step: post this in the builder wave. Record the decision URL only if the wave approves work.",
  ].join("\n");
}
