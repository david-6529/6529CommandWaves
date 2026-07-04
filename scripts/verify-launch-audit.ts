import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fetchJsonWithTimeout } from "../src/lib/http-fetch";
import { launchAuditRemoteEnabled, launchAuditUrlFromAppUrl } from "../src/lib/launch-audit-url";
import { verifyLaunchAuditPayload } from "../src/lib/launch-audit-verifier";

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

async function loadLaunchAuditPayload() {
  const auditPath = process.env.LAUNCH_AUDIT_PATH;
  const auditUrl =
    process.env.LAUNCH_AUDIT_URL?.trim() ||
    launchAuditUrlFromAppUrl(process.env.NEXT_PUBLIC_APP_URL, {
      remote: launchAuditRemoteEnabled(process.env.LAUNCH_AUDIT_REMOTE),
    });

  if (auditPath?.trim()) {
    return readJsonFile<unknown>(resolve(auditPath));
  }

  if (auditUrl) {
    return readJsonUrl<unknown>(auditUrl);
  }

  throw new Error("Set LAUNCH_AUDIT_PATH, LAUNCH_AUDIT_URL, or NEXT_PUBLIC_APP_URL before running launch audit verification.");
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
  const payload = await loadLaunchAuditPayload();
  const result = verifyLaunchAuditPayload(payload);

  writeResult(process.env.LAUNCH_AUDIT_VERIFICATION_PATH, result);

  console.log(`Launch audit verification: ${result.status}`);
  console.log(`Launch status: ${result.launchStatus}`);
  console.log(`Project: ${result.projectName ?? "unknown"}`);
  console.log(`Generated: ${result.generatedAt ?? "unknown"}`);

  if (result.nextAction) {
    console.log(`Next action: ${result.nextAction.title}`);
    console.log(result.nextAction.detail);
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

  if (result.status !== "pass") {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
