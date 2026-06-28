export const phaseOneStateReplacementMessage =
  "Full state replacement is outside phase 1. Use setup, proposal, vote, decision, PR run, and review routes.";

export function rejectPhaseOneStateReplacement(): never {
  throw Object.assign(new Error(phaseOneStateReplacementMessage), { status: 405 });
}
