import { normalizeParticipationGates } from "./participation-gates";

type BuilderWaveJoinDraftOptions = {
  walletAddress?: string;
};

export function createBuilderWaveJoinDraft(handle: string, gates?: unknown, options: BuilderWaveJoinDraftOptions = {}) {
  const cleanHandle = handle.trim().replace(/\s+/g, " ");
  const cleanWalletAddress = options.walletAddress?.trim().replace(/\s+/g, "") ?? "";
  const handleLine = cleanHandle ? `Handle: ${cleanHandle}.` : "Handle: not set yet.";
  const walletLine = cleanWalletAddress ? [`Wallet: ${cleanWalletAddress}.`] : [];
  const joinNotes = normalizeParticipationGates(gates).slice(0, 2).join("; ");

  return [
    "I would like to help build this hook.",
    handleLine,
    ...walletLine,
    `Join notes: ${joinNotes}.`,
    "I understand a maintainer reviews who can contribute for now.",
    "I can help with discussion, tests, review, or a small PR.",
    "I will wait for a visible project decision before PR work starts.",
    "What should I take next?",
  ].join("\n");
}
