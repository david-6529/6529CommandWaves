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
  identity: "each builder",
  enforcedBy: "daemon",
} as const;

export type ChatPostPace = {
  maxPosts: number;
  windowSeconds: number;
  identity: string;
  enforcedBy: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function minutesLabel(seconds: number) {
  const minutes = seconds / 60;

  return Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1).replace(/\.0$/, "");
}

export function chatPostPaceShortLabel(pace: ChatPostPace) {
  return `${pace.maxPosts} messages every ${minutesLabel(pace.windowSeconds)} min`;
}

export function chatPostPaceDetail(pace: ChatPostPace) {
  return `Current chat limit: ${pace.maxPosts} messages every ${minutesLabel(pace.windowSeconds)} minutes for ${pace.identity}. ${pace.enforcedBy} enforces it.`;
}

export function chatPostPaceIdentity(input: ChatPostPaceInput) {
  return text(input.senderId) || text(input.walletAddress) || text(input.author) || "anonymous-builder";
}
