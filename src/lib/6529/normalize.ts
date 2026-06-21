import type { JsonRecord, WaveDrop, WaveDropsResponse, WaveIdentity } from "./types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function pickRecord(source: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (isRecord(value)) {
      return value;
    }
  }

  return undefined;
}

function pickArray(source: unknown, keys: string[]) {
  if (Array.isArray(source)) {
    return source;
  }

  if (!isRecord(source)) {
    return [];
  }

  for (const key of keys) {
    const value = source[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function pickNestedArray(source: unknown, keys: string[]) {
  const direct = pickArray(source, keys);

  if (direct.length || !isRecord(source)) {
    return direct;
  }

  for (const envelopeKey of ["data", "result", "response"]) {
    const nested = source[envelopeKey];
    const nestedArray = pickArray(nested, keys);

    if (nestedArray.length) {
      return nestedArray;
    }
  }

  return [];
}

function pickString(source: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = asString(source[key]);

    if (value) {
      return value;
    }
  }

  return undefined;
}

function pickNumber(source: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = asNumber(source[key]);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function normalizeTimestamp(value: unknown) {
  const numeric = asNumber(value);

  if (numeric !== undefined) {
    return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  }

  const stringValue = asString(value);

  if (!stringValue) {
    return undefined;
  }

  const parsed = Date.parse(stringValue);

  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeIdentity(raw: unknown): WaveIdentity | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    handle: pickString(raw, ["handle", "username", "name", "display_name"]),
    display: pickString(raw, ["display", "display_name", "classification", "handle"]),
    pfp: pickString(raw, ["pfp", "profile_image", "avatar", "avatar_url"]),
    primary_wallet: pickString(raw, ["primary_wallet", "wallet", "address", "wallet_address"]),
  };
}

function normalizeParts(raw: UnknownRecord) {
  return pickArray(raw, ["parts", "drop_parts", "content_parts"])
    .filter(isRecord)
    .map((part, index) => ({
      id: pickString(part, ["id", "part_id"]) ?? String(index + 1),
      content: pickString(part, ["content", "text", "body", "value"]) ?? "",
    }))
    .filter((part) => part.content);
}

function normalizeContent(raw: UnknownRecord, parts: WaveDrop["parts"]) {
  const direct = pickString(raw, ["content", "text", "body", "message", "html", "markdown"]);

  if (direct) {
    return direct;
  }

  if (parts?.length) {
    return parts.map((part) => part.content).join("\n\n");
  }

  return null;
}

export function normalizeWaveDrop(raw: unknown): WaveDrop {
  if (!isRecord(raw)) {
    return {
      id: String(raw ?? "unknown"),
      content: null,
      raw: { value: raw },
    };
  }

  const parts = normalizeParts(raw);
  const id =
    pickString(raw, ["id", "drop_id", "dropId"]) ??
    String(pickNumber(raw, ["serial_no", "serialNo", "serial"]) ?? crypto.randomUUID());
  const author = normalizeIdentity(
    pickRecord(raw, ["author", "creator", "profile", "identity", "user"]) ?? raw["author"],
  );
  const createdAt = normalizeTimestamp(
    raw["created_at"] ?? raw["createdAt"] ?? raw["created"] ?? raw["timestamp"] ?? raw["created_time"],
  );

  return {
    id,
    serial_no: pickNumber(raw, ["serial_no", "serialNo", "serial"]),
    created_at: createdAt,
    updated_at: normalizeTimestamp(raw["updated_at"] ?? raw["updatedAt"] ?? raw["updated"]),
    title: pickString(raw, ["title", "name"]) ?? null,
    content: normalizeContent(raw, parts),
    author,
    drop_type: pickString(raw, ["drop_type", "dropType", "type"]),
    poll: (isRecord(raw["poll"]) ? raw["poll"] : null) as JsonRecord | null,
    reactions: pickArray(raw, ["reactions", "reaction_counts"]).filter(isRecord) as JsonRecord[],
    parts,
    raw: raw as JsonRecord,
  };
}

export function normalizeWaveDropsResponse(raw: unknown): WaveDropsResponse {
  const source = isRecord(raw) ? raw : {};
  const nestedSource = pickRecord(source, ["data", "result", "response"]);
  const drops = pickNestedArray(raw, ["drops", "data", "items", "results"]).map(normalizeWaveDrop);

  return {
    wave: (source["wave"] ?? nestedSource?.["wave"] ?? source["metadata"] ?? null) as JsonRecord | null,
    drops,
    root_drop: source["root_drop"]
      ? normalizeWaveDrop(source["root_drop"])
      : nestedSource?.["root_drop"]
        ? normalizeWaveDrop(nestedSource["root_drop"])
        : undefined,
    trace: pickNestedArray(raw, ["trace"]).filter(isRecord) as JsonRecord[],
    raw: isRecord(raw) ? (raw as JsonRecord) : { value: raw },
  };
}

export function dropCreatedAtMs(drop: WaveDrop) {
  return normalizeTimestamp(drop.created_at);
}
