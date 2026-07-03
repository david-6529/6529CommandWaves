import { search6529WavesByName } from "./client";
import type { JsonRecord } from "./types";

export type WaveSearchResult = {
  id: string;
  name: string;
  description: string | null;
  source: "6529";
};

const maxWaveSearchQueryLength = 120;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function pickText(source: JsonRecord | null | undefined, keys: string[]) {
  if (!source) {
    return undefined;
  }

  for (const key of keys) {
    const value = asText(source[key]);

    if (value) {
      return value;
    }
  }

  return undefined;
}

function extractDescription(rawWave: JsonRecord | null) {
  const direct = pickText(rawWave, ["description", "overview", "summary", "about"]);

  if (direct) {
    return direct;
  }

  const descriptionDrop = isRecord(rawWave?.["description_drop"])
    ? rawWave["description_drop"]
    : isRecord(rawWave?.["descriptionDrop"])
      ? rawWave["descriptionDrop"]
      : null;

  if (!descriptionDrop) {
    return null;
  }

  const parts = Array.isArray(descriptionDrop["parts"]) ? descriptionDrop["parts"] : [];

  return parts
    .filter(isRecord)
    .map((part) => asText(part["content"]))
    .filter((part): part is string => Boolean(part))
    .join("\n\n") || null;
}

export function normalizeWaveSearchResult(rawWave: unknown): WaveSearchResult | null {
  const wave = isRecord(rawWave) ? rawWave : null;
  const id = pickText(wave, ["id", "wave_id", "waveId", "uuid"]);

  if (!id) {
    return null;
  }

  return {
    id,
    name: pickText(wave, ["name", "title", "wave_name", "waveName", "label"]) ?? id,
    description: extractDescription(wave),
    source: "6529",
  };
}

export async function searchWaves(query: string, params: { limit?: number } = {}) {
  const normalizedQuery = query.trim();
  const limit = Math.min(Math.max(params.limit ?? 8, 1), 20);

  if (normalizedQuery.length > maxWaveSearchQueryLength) {
    throw Object.assign(new Error(`Wave search must be ${maxWaveSearchQueryLength} characters or less.`), {
      status: 400,
    });
  }

  if (normalizedQuery.length < 2) {
    return [];
  }

  return (await search6529WavesByName(normalizedQuery, { limit }))
    .map(normalizeWaveSearchResult)
    .filter((result): result is WaveSearchResult => Boolean(result))
    .slice(0, limit);
}
