import { normalizeParticipationGates } from "./participation-gates";

export function createBuilderWaveJoinDraft(handle: string, gates?: unknown) {
  const cleanHandle = handle.trim().replace(/\s+/g, " ");
  const handleLine = cleanHandle ? `Handle: ${cleanHandle}.` : "Handle: not set yet.";
  const accessNotes = normalizeParticipationGates(gates).slice(0, 2).join("; ");

  return [
    "I would like to help with this hook.",
    handleLine,
    `Access notes: ${accessNotes}.`,
    "I understand access is reviewed manually for this first phase.",
    "I can help with discussion, review, tests, or a small PR.",
    "I will wait for a visible 6529 decision before PR work starts.",
    "What should I take next?",
  ].join("\n");
}
