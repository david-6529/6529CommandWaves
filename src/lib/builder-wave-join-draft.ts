import { normalizeParticipationGates } from "./participation-gates";

type BuilderWaveJoinDraftOptions = {
  walletAddress?: string;
};

export function createBuilderWaveJoinDraft(handle: string, gates?: unknown, options: BuilderWaveJoinDraftOptions = {}) {
  const cleanHandle = handle.trim().replace(/\s+/g, " ");
  const cleanWalletAddress = options.walletAddress?.trim().replace(/\s+/g, "") ?? "";
  const handleLine = cleanHandle ? `Handle: ${cleanHandle}.` : "Handle: not set yet.";
  const walletLine = cleanWalletAddress ? [`Wallet: ${cleanWalletAddress}.`] : [];
  const accessNotes = normalizeParticipationGates(gates).slice(0, 2).join("; ");

  return [
    "I would like to help with this hook.",
    handleLine,
    ...walletLine,
    `Access notes: ${accessNotes}.`,
    "I understand access is reviewed manually for this first phase.",
    "I can help with discussion, review, tests, or a small PR.",
    "I will wait for a visible project decision before PR work starts.",
    "What should I take next?",
  ].join("\n");
}
