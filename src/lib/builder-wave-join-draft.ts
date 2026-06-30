export function createBuilderWaveJoinDraft(handle: string) {
  const cleanHandle = handle.trim().replace(/\s+/g, " ");
  const handleLine = cleanHandle ? `Handle: ${cleanHandle}.` : "Handle: not set yet.";

  return [
    "I would like to help with this hook.",
    handleLine,
    "I can help with discussion, review, tests, or a small PR.",
    "What should I take next?",
  ].join("\n");
}
