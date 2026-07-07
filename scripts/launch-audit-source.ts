import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fetchJsonWithTimeout, type TimedFetchError } from "../src/lib/http-fetch";
import {
  chatLaunchUrlFromAppUrl,
  defaultLocalAppUrl,
  launchAuditRemoteEnabled,
  launchAuditUrlFromAppUrl,
} from "../src/lib/launch-audit-url";

export type LoadedLaunchAudit = {
  payload: unknown;
  sourceUrl: string | null;
};

type LaunchAuditTargetFetchErrorPayload = {
  launchAuditTargetFetchError: {
    url: string;
    status: number;
    statusText: string;
  };
};

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

async function readJsonUrl<T>(url: string): Promise<T> {
  return fetchJsonWithTimeout<T>(url, {
    headers: {
      accept: "application/json",
    },
  });
}

export async function readOptionalJsonUrl(url: string): Promise<unknown> {
  try {
    return await readJsonUrl<unknown>(url);
  } catch (error) {
    const fetchError = error as TimedFetchError;

    return {
      launchAuditTargetFetchError: {
        url: fetchError.url ?? url,
        status: fetchError.status ?? 0,
        statusText: fetchError.statusText ?? (error instanceof Error ? error.message : "Fetch failed"),
      },
    } satisfies LaunchAuditTargetFetchErrorPayload;
  }
}

export async function loadLaunchAuditPayload(): Promise<LoadedLaunchAudit> {
  const auditPath = process.env.LAUNCH_AUDIT_PATH;
  const localAppUrl = process.env.LOCAL_APP_URL?.trim() || defaultLocalAppUrl;
  const auditUrl =
    process.env.LAUNCH_AUDIT_URL?.trim() ||
    launchAuditUrlFromAppUrl(process.env.NEXT_PUBLIC_APP_URL, {
      remote: launchAuditRemoteEnabled(process.env.LAUNCH_AUDIT_REMOTE),
    }) ||
    launchAuditUrlFromAppUrl(localAppUrl, { remote: false });

  if (auditPath?.trim()) {
    return {
      payload: readJsonFile<unknown>(resolve(auditPath)),
      sourceUrl: null,
    };
  }

  if (auditUrl) {
    return {
      payload: await readJsonUrl<unknown>(auditUrl),
      sourceUrl: auditUrl,
    };
  }

  throw new Error(
    "Set LAUNCH_AUDIT_PATH, LAUNCH_AUDIT_URL, NEXT_PUBLIC_APP_URL, or run the local app before launch audit verification.",
  );
}

export async function loadChatLaunchPayload(): Promise<LoadedLaunchAudit> {
  const auditPath = process.env.CHAT_LAUNCH_PATH?.trim() || process.env.LAUNCH_AUDIT_PATH?.trim();
  const localAppUrl = process.env.LOCAL_APP_URL?.trim() || defaultLocalAppUrl;
  const auditUrl =
    process.env.CHAT_LAUNCH_URL?.trim() ||
    process.env.LAUNCH_AUDIT_URL?.trim() ||
    chatLaunchUrlFromAppUrl(process.env.NEXT_PUBLIC_APP_URL, {
      remote: launchAuditRemoteEnabled(process.env.CHAT_LAUNCH_REMOTE ?? process.env.LAUNCH_AUDIT_REMOTE),
    }) ||
    chatLaunchUrlFromAppUrl(localAppUrl, { remote: false });

  if (auditPath) {
    return {
      payload: readJsonFile<unknown>(resolve(auditPath)),
      sourceUrl: null,
    };
  }

  if (auditUrl) {
    return {
      payload: await readJsonUrl<unknown>(auditUrl),
      sourceUrl: auditUrl,
    };
  }

  throw new Error(
    "Set CHAT_LAUNCH_PATH, CHAT_LAUNCH_URL, NEXT_PUBLIC_APP_URL, or run the local app before chat launch verification.",
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function unwrapAudit(payload: unknown) {
  const record = isRecord(payload) ? payload : null;

  return isRecord(record?.audit) ? record.audit : record;
}

export function resolveVerificationTargetUrl(
  payload: unknown,
  sourceUrl: string | null,
  envName: string,
  targetName: string,
) {
  const explicitUrl = process.env[envName]?.trim();

  if (explicitUrl) {
    return explicitUrl;
  }

  const audit = unwrapAudit(payload);
  const targets = isRecord(audit?.verificationTargets) ? audit.verificationTargets : null;
  const targetUrl = asString(targets?.[targetName]);

  if (!targetUrl) {
    return null;
  }

  try {
    if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
      return targetUrl;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || sourceUrl;

    return baseUrl ? new URL(targetUrl, baseUrl).toString() : null;
  } catch {
    return null;
  }
}

export function writeJsonResult(path: string | undefined, value: unknown) {
  if (!path?.trim()) {
    return;
  }

  const outputPath = resolve(path);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`);
}
