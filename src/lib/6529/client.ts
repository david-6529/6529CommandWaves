import { getMockPollDrop, getMockPostDrop, getMockWave, getMockWaveDrops, is6529MockMode } from "./mock";
import { normalizeWaveDropsResponse } from "./normalize";
import type { DropPollRequest, PostDropOptions } from "./types";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  searchParams?: Record<string, string | number | boolean | undefined>;
};

export function get6529ApiBaseUrl() {
  return process.env["6529_API_BASE_URL"] ?? "https://api.6529.io";
}

export function normalizeWaveId(value: string) {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/\/waves\/([^/?#\s]+)/);

  return (urlMatch?.[1] ?? trimmed).trim();
}

async function apiFetch<T>(path: string, options: RequestOptions = {}) {
  const url = new URL(`${get6529ApiBaseUrl()}${path}`);

  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");

    throw Object.assign(
      new Error(`6529 API request failed: ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ""}`),
      { status: response.status },
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getWave(waveIdOrUrl: string) {
  const waveId = normalizeWaveId(waveIdOrUrl);

  if (is6529MockMode()) {
    return getMockWave(waveId);
  }

  return apiFetch(`/waves/${encodeURIComponent(waveId)}`);
}

export async function search6529WavesByName(query: string, params: { limit?: number } = {}) {
  if (is6529MockMode()) {
    return [getMockWave("mock-command-wave")];
  }

  return apiFetch<unknown[]>("/waves", {
    searchParams: {
      name: query,
      limit: params.limit ?? 8,
    },
  });
}

export async function getWaveDrops(
  waveIdOrUrl: string,
  params: {
    limit?: number;
    serialNoLimit?: number;
    searchStrategy?: "FIND_OLDER" | "FIND_NEWER";
    dropType?: "CHAT" | "PARTICIPATORY" | "WINNER";
  } = {},
) {
  const waveId = normalizeWaveId(waveIdOrUrl);

  if (is6529MockMode()) {
    return getMockWaveDrops(waveId);
  }

  const raw = await apiFetch<unknown>(`/v2/waves/${encodeURIComponent(waveId)}/drops`, {
    searchParams: {
      limit: params.limit ?? 30,
      serial_no_limit: params.serialNoLimit,
      search_strategy: params.searchStrategy,
      drop_type: params.dropType,
    },
  });

  return normalizeWaveDropsResponse(raw);
}

function getPostingToken() {
  return process.env["6529_BOT_BEARER_TOKEN"];
}

export async function postDrop(waveIdOrUrl: string, content: string, options: PostDropOptions = {}) {
  const waveId = normalizeWaveId(waveIdOrUrl);

  if (is6529MockMode()) {
    return getMockPostDrop(waveId, content, options);
  }

  const token = getPostingToken();
  const signerAddress = process.env["6529_BOT_WALLET_ADDRESS"];

  if (!token || !signerAddress) {
    throw Object.assign(new Error("6529 posting requires 6529_BOT_BEARER_TOKEN and 6529_BOT_WALLET_ADDRESS."), {
      status: 503,
    });
  }

  return apiFetch("/drops", {
    method: "POST",
    token,
    body: {
      title: null,
      wave_id: waveId,
      drop_type: options.dropType ?? (options.poll ? "PARTICIPATORY" : "CHAT"),
      parts: [
        {
          content,
          quoted_drop: null,
          media: [],
          attachments: [],
        },
      ],
      referenced_nfts: [],
      mentioned_users: [],
      mentioned_waves: [],
      metadata: [],
      signature: null,
      is_safe_signature: false,
      signer_address: signerAddress,
      reply_to: options.replyToDropId
        ? {
            drop_id: options.replyToDropId,
            drop_part_id: 1,
          }
        : undefined,
      poll: options.poll,
    },
  });
}

export async function createPollDrop(
  waveIdOrUrl: string,
  content: string,
  poll: DropPollRequest,
  options: Omit<PostDropOptions, "poll" | "dropType"> = {},
) {
  const waveId = normalizeWaveId(waveIdOrUrl);

  if (is6529MockMode()) {
    return getMockPollDrop(waveId, content, poll, options);
  }

  return postDrop(waveId, content, {
    ...options,
    poll,
    dropType: "PARTICIPATORY",
  });
}
