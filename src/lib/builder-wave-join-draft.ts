export function createBuilderWaveJoinDraft(handle: string) {
  const cleanHandle = handle.trim().replace(/\s+/g, " ");
  const handleLine = cleanHandle ? `Handle: ${cleanHandle}.` : "Handle: not set yet.";

  return [
    "I would like to join the 6529 hook build.",
    handleLine,
    "I can help with tests, review, discussion, or a small PR.",
    "Please let me know the best next step.",
  ].join("\n");
}
