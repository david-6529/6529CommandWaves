export function projectChatAuthorLabel(author: string) {
  const normalized = author.trim();

  if (!normalized) {
    return "unknown";
  }

  if (normalized.toLowerCase() === "wave-poll") {
    return "decision";
  }

  return normalized;
}
