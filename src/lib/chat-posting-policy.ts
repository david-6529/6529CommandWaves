export type ChatPostPaceInput = {
  senderId?: unknown;
  walletAddress?: unknown;
  author?: unknown;
  content?: unknown;
};

export const directChatPostPace = {
  maxPosts: 3,
  windowMs: 5 * 60_000,
  windowSeconds: 5 * 60,
  identity: "builder identity",
  enforcedBy: "daemon",
} as const;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function chatPostPaceIdentity(input: ChatPostPaceInput) {
  return text(input.senderId) || text(input.walletAddress) || text(input.author) || "anonymous-builder";
}
