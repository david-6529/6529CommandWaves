import { getWaveDrops, normalizeWaveId } from "./client";
import { dropCreatedAtMs } from "./normalize";
import type { JsonRecord, WaveDrop } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const WAVE_DROPS_PAGE_SIZE = 200;
const DEFAULT_RECENT_CONTEXT_CAP = 10_000;
const DEFAULT_FULL_HISTORY_CONTEXT_CAP = 20_000;
const MAX_RELATED_WAVES = 8;

export type RelatedWaveContextParams = {
  waveId: string;
  label?: string;
};

export type WaveContextParams = {
  waveId: string;
  contextFrom?: string;
  contextTo?: string;
  maxMessages?: number;
  includeAllHistory?: boolean;
  relatedWaves?: RelatedWaveContextParams[];
};

export type WaveContextResult = Awaited<ReturnType<typeof fetchWaveContext>>;

type WaveContextSource = {
  waveId: string;
  label: string;
  primary: boolean;
};

type WindowParams = {
  fromMs?: number;
  toMs?: number;
  maxMessages: number;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseWindowDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    throw Object.assign(new Error(`Invalid context window date: ${value}`), { status: 400 });
  }

  return timestamp;
}

function normalizeSourceLabel(value: string | undefined, fallback: string) {
  const normalized = value?.trim().replace(/\s+/g, " ");

  return normalized || fallback;
}

function primaryWaveId(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw Object.assign(new Error("Paste a 6529 wave link or wave id."), { status: 400 });
  }

  return normalizeWaveId(value);
}

function buildContextSources(params: WaveContextParams): WaveContextSource[] {
  const sources: WaveContextSource[] = [
    {
      waveId: primaryWaveId(params.waveId),
      label: "Primary wave",
      primary: true,
    },
  ];
  const seen = new Set(sources.map((source) => source.waveId));

  for (const related of params.relatedWaves?.slice(0, MAX_RELATED_WAVES) ?? []) {
    const waveId = typeof related.waveId === "string" ? normalizeWaveId(related.waveId) : "";

    if (!waveId || seen.has(waveId)) {
      continue;
    }

    seen.add(waveId);
    sources.push({
      waveId,
      label: normalizeSourceLabel(related.label, "Related wave"),
      primary: false,
    });
  }

  return sources;
}

function waveName(wave: unknown) {
  if (!isRecord(wave)) {
    return null;
  }

  const name = wave["name"];

  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function waveTotalDrops(wave: unknown) {
  if (!isRecord(wave)) {
    return null;
  }

  const total = wave["total_drops_count"] ?? wave["totalDropsCount"] ?? wave["drops_count"];

  return typeof total === "number" && Number.isFinite(total) ? total : null;
}

function isWithinWindow(drop: WaveDrop, fromMs?: number, toMs?: number) {
  const createdAt = dropCreatedAtMs(drop);

  if (!createdAt) {
    return !fromMs && !toMs;
  }

  return (!fromMs || createdAt >= fromMs) && (!toMs || createdAt <= toMs);
}

function dropAuthor(drop: WaveDrop) {
  return drop.author?.handle ?? drop.author?.display ?? drop.author?.primary_wallet ?? "unknown";
}

function sortDropsChronologically(drops: WaveDrop[]) {
  return [...drops].sort((a, b) => {
    const aCreated = dropCreatedAtMs(a) ?? 0;
    const bCreated = dropCreatedAtMs(b) ?? 0;

    if (aCreated !== bCreated) {
      return aCreated - bCreated;
    }

    return (a.serial_no ?? 0) - (b.serial_no ?? 0);
  });
}

function dropRange(drops: WaveDrop[]) {
  const timestamps = drops
    .map(dropCreatedAtMs)
    .filter((timestamp): timestamp is number => typeof timestamp === "number");

  if (!timestamps.length) {
    return {
      oldestDropAt: null,
      newestDropAt: null,
    };
  }

  return {
    oldestDropAt: new Date(Math.min(...timestamps)).toISOString(),
    newestDropAt: new Date(Math.max(...timestamps)).toISOString(),
  };
}

async function fetchSingleWaveContext(source: WaveContextSource, windowParams: WindowParams) {
  const collected: WaveDrop[] = [];
  let searchedMessages = 0;
  let serialNoLimit: number | undefined;
  let lastOldestSerial: number | undefined;
  let wave: unknown;
  let reachedWindowStart = false;
  let exhaustedHistory = false;
  let stoppedByDuplicateCursor = false;

  while (searchedMessages < windowParams.maxMessages) {
    const limit = Math.min(WAVE_DROPS_PAGE_SIZE, windowParams.maxMessages - searchedMessages);
    const page = await getWaveDrops(source.waveId, {
      limit,
      serialNoLimit,
      searchStrategy: serialNoLimit ? "FIND_OLDER" : undefined,
    });
    const pageDrops = page.drops ?? [];

    wave ??= page.wave ?? null;

    if (!pageDrops.length) {
      exhaustedHistory = true;
      break;
    }

    searchedMessages += pageDrops.length;
    collected.push(...pageDrops.filter((drop) => isWithinWindow(drop, windowParams.fromMs, windowParams.toMs)));

    const pageSerials = pageDrops
      .map((drop) => drop.serial_no)
      .filter((serial): serial is number => typeof serial === "number");
    const oldestSerial = pageSerials.length ? Math.min(...pageSerials) : undefined;
    reachedWindowStart = Boolean(
      windowParams.fromMs &&
        pageDrops.some((drop) => {
          const createdAt = dropCreatedAtMs(drop);
          return createdAt ? createdAt < windowParams.fromMs! : false;
        }),
    );

    stoppedByDuplicateCursor = Boolean(!oldestSerial || oldestSerial === lastOldestSerial);
    exhaustedHistory = pageDrops.length < limit;

    if (reachedWindowStart || exhaustedHistory || stoppedByDuplicateCursor) {
      break;
    }

    lastOldestSerial = oldestSerial;
    serialNoLimit = oldestSerial;
  }

  const availableDropCount = waveTotalDrops(wave);
  const hitCap =
    searchedMessages >= windowParams.maxMessages &&
    !reachedWindowStart &&
    !exhaustedHistory &&
    !stoppedByDuplicateCursor &&
    (availableDropCount == null || searchedMessages < availableDropCount);
  const range = dropRange(collected);

  return {
    wave,
    drops: collected.slice(0, windowParams.maxMessages).map((drop) => ({
      ...drop,
      source_wave_id: source.waveId,
      source_wave_name: waveName(wave),
      source_wave_role: source.label,
    })),
    context: {
      availableDropCount,
      hitCap,
      reachedWindowStart,
      searchedMessages,
      ...range,
    },
  };
}

export async function fetchWaveContext(params: WaveContextParams) {
  const now = Date.now();
  const explicitWindow = Boolean(params.contextFrom || params.contextTo);
  const includeAllHistory = params.includeAllHistory === true;

  if (includeAllHistory && explicitWindow) {
    throw Object.assign(new Error("Use either all available history or a date window, not both."), {
      status: 400,
    });
  }

  const fromMs = explicitWindow ? parseWindowDate(params.contextFrom) : includeAllHistory ? undefined : now - DAY_MS;
  const toMs = explicitWindow ? parseWindowDate(params.contextTo) : includeAllHistory ? undefined : now;

  if (fromMs && toMs && fromMs > toMs) {
    throw Object.assign(new Error("Context window start must be before context window end."), {
      status: 400,
    });
  }

  const maxMessages = params.maxMessages ?? (includeAllHistory ? DEFAULT_FULL_HISTORY_CONTEXT_CAP : DEFAULT_RECENT_CONTEXT_CAP);
  const sources = buildContextSources(params);
  const maxMessagesPerWave = Math.max(1, Math.ceil(maxMessages / sources.length));
  const sourceResults: Array<Awaited<ReturnType<typeof fetchSingleWaveContext>>> = [];

  for (const source of sources) {
    sourceResults.push(
      await fetchSingleWaveContext(source, {
        fromMs,
        toMs,
        maxMessages: maxMessagesPerWave,
      }),
    );
  }

  const drops = sortDropsChronologically(sourceResults.flatMap((result) => result.drops)).slice(-maxMessages);
  const sourcesContext = sourceResults.map((result, index) => ({
    waveId: sources[index]!.waveId,
    label: sources[index]!.label,
    primary: sources[index]!.primary,
    name: waveName(result.wave),
    availableDropCount: result.context.availableDropCount,
    dropCount: result.drops.length,
    hitCap: result.context.hitCap,
    oldestDropAt: result.context.oldestDropAt,
    newestDropAt: result.context.newestDropAt,
    searchedMessages: result.context.searchedMessages,
  }));
  const hitCap = sourceResults.some((result) => result.context.hitCap);

  return {
    wave: sourceResults[0]?.wave ?? null,
    relatedWaves: sourceResults.slice(1).map((result, index) => ({
      wave: result.wave ?? null,
      ...sourcesContext[index + 1],
    })),
    drops,
    context: {
      from: fromMs ? new Date(fromMs).toISOString() : null,
      to: toMs ? new Date(toMs).toISOString() : null,
      mode: includeAllHistory ? "all" : explicitWindow ? "window" : "recent",
      includeAllHistory,
      maxMessages,
      maxMessagesPerWave,
      searchedMessages: sourceResults.reduce((sum, result) => sum + result.context.searchedMessages, 0),
      hitCap,
      explicitWindow,
      sources: sourcesContext,
    },
  };
}

export async function previewWaveContext(params: WaveContextParams) {
  const waveContext = await fetchWaveContext(params);
  const ordered = sortDropsChronologically(waveContext.drops);

  return {
    waveId: normalizeWaveId(params.waveId),
    dropCount: ordered.length,
    fromDropId: ordered[0]?.id ?? null,
    toDropId: ordered.at(-1)?.id ?? null,
    context: waveContext.context,
    sampleDrops: ordered.slice(-5).map((drop) => ({
      id: drop.id,
      serialNo: drop.serial_no ?? null,
      author: dropAuthor(drop),
      createdAt: drop.created_at ? new Date(drop.created_at).toISOString() : null,
      sourceWaveId: drop.source_wave_id ?? normalizeWaveId(params.waveId),
      sourceWaveName: drop.source_wave_name ?? null,
      sourceWaveRole: drop.source_wave_role ?? null,
      preview: (drop.content ?? "").replace(/\s+/g, " ").trim().slice(0, 220),
    })),
  };
}
