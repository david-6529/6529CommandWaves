import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fetchJsonWithTimeout, type TimedFetchError } from "../src/lib/http-fetch";
import {
  defaultLocalAppUrl,
  launchAuditRemoteEnabled,
  launchAuditUrlFromAppUrl,
} from "../src/lib/launch-audit-url";
import { verifyLaunchAuditPayload } from "../src/lib/launch-audit-verifier";

type LoadedLaunchAudit = {
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

async function readOptionalJsonUrl(url: string): Promise<unknown> {
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

async function loadLaunchAuditPayload(): Promise<LoadedLaunchAudit> {
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

function resolveVerificationTargetUrl(
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

function writeResult(path: string | undefined, value: unknown) {
  if (!path?.trim()) {
    return;
  }

  const outputPath = resolve(path);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const { payload, sourceUrl } = await loadLaunchAuditPayload();
  const stateUrl = resolveVerificationTargetUrl(payload, sourceUrl, "LAUNCH_AUDIT_STATE_URL", "commandWaveStateUrl");
  const projectIndexUrl = resolveVerificationTargetUrl(
    payload,
    sourceUrl,
    "LAUNCH_AUDIT_PROJECT_INDEX_URL",
    "projectIndexUrl",
  );
  const [commandWaveState, projectIndex] = await Promise.all([
    stateUrl ? readOptionalJsonUrl(stateUrl) : undefined,
    projectIndexUrl ? readOptionalJsonUrl(projectIndexUrl) : undefined,
  ]);
  const result = verifyLaunchAuditPayload(payload, {
    commandWaveState,
    requirePublicState: Boolean(stateUrl),
    projectIndex,
    requireProjectIndex: Boolean(projectIndexUrl),
  });

  writeResult(process.env.LAUNCH_AUDIT_VERIFICATION_PATH, result);

  console.log(`Launch audit verification: ${result.status}`);
  console.log(`Launch status: ${result.launchStatus}`);
  console.log(`Project: ${result.projectName ?? "unknown"}`);
  console.log(`Generated: ${result.generatedAt ?? "unknown"}`);
  if (stateUrl) {
    console.log(`Public state target: ${stateUrl}`);
  }
  if (projectIndexUrl) {
    console.log(`Project index target: ${projectIndexUrl}`);
  }

  if (result.nextAction) {
    console.log(`Next action: ${result.nextAction.title}`);
    console.log(result.nextAction.detail);
  }

  if (result.statusDraft) {
    console.log("Status draft:");
    console.log(result.statusDraft);
  }

  if (result.stateEvidence) {
    console.log("State evidence:");
    console.log(`Wave state hash: ${result.stateEvidence.waveStateHash}`);
    console.log(`Rules hash: ${result.stateEvidence.rulesHash}`);
    console.log(
      `Records: ${result.stateEvidence.proposalCount} proposals, ${result.stateEvidence.reviewCount} reviews, ${result.stateEvidence.ledgerEventCount} ledger events.`,
    );
  }

  if (result.publicState) {
    console.log(`State snapshot hash: ${result.publicState.stateHash}`);
  }
  if (result.publicProjectIndex) {
    console.log(`Project index hash: ${result.publicProjectIndex.projectsHash}`);
  }

  for (const item of result.checks) {
    console.log(`${item.status.toUpperCase()} ${item.id}: ${item.message}`);
  }

  if (result.blockers.length) {
    console.log("Blockers:");
    for (const item of result.blockers) {
      console.log(`- ${item}`);
    }
  }

  if (result.openItems.length) {
    console.log("Open items:");
    for (const item of result.openItems) {
      console.log(`- ${item}`);
    }
  }

  if (result.operatorChecklist.length) {
    console.log("Operator checklist:");
    for (const item of result.operatorChecklist) {
      console.log(item);
    }
  }

  if (result.status !== "pass") {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
