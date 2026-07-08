import { normalizeWaveId, postDrop } from "./client";

type ChatPostInput = {
  waveUrl?: unknown;
  waveId?: unknown;
  content?: unknown;
};

type ChatPostDrop = {
  id?: unknown;
  drop_id?: unknown;
  wave_id?: unknown;
};

export type ChatPostResult = {
  waveId: string;
  dropId: string | null;
  url: string | null;
  mode: "mock" | "live";
};

export type ChatPostingCapability = {
  canPost: boolean;
  mode: "mock" | "live" | "manual";
  message: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isMockMode(env: Record<string, string | undefined> = process.env) {
  return env["6529_MOCK_MODE"] !== "false";
}

function postingConfigured(env: Record<string, string | undefined> = process.env) {
  return (
    isMockMode(env) ||
    (Boolean(env["6529_BOT_BEARER_TOKEN"]?.trim()) && Boolean(env["6529_BOT_WALLET_ADDRESS"]?.trim()))
  );
}

export function getChatPostingCapability(env: Record<string, string | undefined> = process.env): ChatPostingCapability {
  if (isMockMode(env)) {
    return {
      canPost: true,
      mode: "mock",
      message: "Local chat posting is active.",
    };
  }

  if (postingConfigured(env)) {
    return {
      canPost: true,
      mode: "live",
      message: "Project chat posting is configured.",
    };
  }

  return {
    canPost: false,
    mode: "manual",
    message: "Direct chat posting is not configured. Copy the draft instead.",
  };
}

function dropIdFromResult(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const drop = value as ChatPostDrop;
  const dropId = typeof drop.id === "string" ? drop.id : typeof drop.drop_id === "string" ? drop.drop_id : "";

  return dropId.trim() || null;
}

function dropUrl(waveId: string, dropId: string | null) {
  return dropId
    ? `https://6529.io/waves/${encodeURIComponent(waveId)}/drops/${encodeURIComponent(dropId)}`
    : null;
}

export async function postChatMessage(input: ChatPostInput): Promise<ChatPostResult> {
  const target = text(input.waveUrl) || text(input.waveId);
  const content = text(input.content);

  if (!target) {
    throw Object.assign(new Error("Choose project chat before posting."), { status: 400 });
  }

  if (!content) {
    throw Object.assign(new Error("Write a message before posting."), { status: 400 });
  }

  if (content.length > 4000) {
    throw Object.assign(new Error("Keep chat messages under 4000 characters."), { status: 400 });
  }

  if (!postingConfigured()) {
    throw Object.assign(new Error("Chat posting is not configured. Copy the draft instead."), { status: 409 });
  }

  const waveId = normalizeWaveId(target);
  const posted = await postDrop(waveId, content, { dropType: "CHAT" });
  const dropId = dropIdFromResult(posted);

  return {
    waveId,
    dropId,
    url: dropUrl(waveId, dropId),
    mode: isMockMode() ? "mock" : "live",
  };
}
