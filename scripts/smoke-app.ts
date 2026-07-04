import { fetchJsonWithTimeout, fetchTextWithTimeout } from "../src/lib/http-fetch";
import { commandWaveProductCopy } from "../src/lib/product-copy";

type JsonObject = Record<string, unknown>;

const baseUrl = normalizeBaseUrl(
  process.env.SMOKE_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
);

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function appUrl(path: string) {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNoEmDash(label: string, value: string) {
  assert(!value.includes("\u2014"), `${label} contains an em dash.`);
}

function assertIncludes(label: string, value: string, expected: string) {
  assert(value.includes(expected), `${label} did not include ${expected}.`);
}

async function fetchText(path: string) {
  return fetchTextWithTimeout(appUrl(path), {
    headers: {
      accept: "application/json, text/html;q=0.9",
    },
  });
}

async function fetchJson(path: string) {
  const json = await fetchJsonWithTimeout<unknown>(appUrl(path), {
    headers: {
      accept: "application/json",
    },
  });

  assert(typeof json === "object" && json !== null && !Array.isArray(json), `${path} did not return a JSON object.`);

  return json as JsonObject;
}

function objectValue(value: JsonObject, key: string) {
  return value[key];
}

async function main() {
  const html = await fetchText("/");

  assertIncludes("Home page", html, commandWaveProductCopy.headline);
  assertIncludes("Home page", html, commandWaveProductCopy.subhead);
  for (const flowStep of commandWaveProductCopy.simpleFlow.split(", ")) {
    assertIncludes("Home page", html, flowStep);
  }
  for (const label of [
    commandWaveProductCopy.projectContext,
    "Discuss the work, decide in the room",
    "Project overview",
    "Work and decisions",
    "What needs attention",
    "Current work",
    "Queue",
    "Talk to the swarm",
    "Latest from the room",
    "Recent signals",
    "Latest log",
    "Who is building",
    "Activity report:",
    "not access or merge authority",
    "Project rules",
    "The orchestration agent labels risk",
    "Humans still merge and deploy",
    "Hook guardrails",
    "Suggest work",
    "Work type",
    "Safety checks",
    "Copy draft",
    "Report method",
    "Visible activity report",
    "Maintainer tools",
  ]) {
    assertIncludes("Home page", html, label);
  }
  assertNoEmDash("Home page", html);

  const readiness = await fetchJson("/api/readiness");
  const readinessChecks = objectValue(readiness, "checks");

  assert(Array.isArray(readinessChecks), "Readiness response is missing checks.");
  assert(readinessChecks.length > 0, "Readiness response has no checks.");
  assertNoEmDash("Readiness response", JSON.stringify(readiness));

  const launchPayload = await fetchJson("/api/command-wave/launch/audit");
  const audit = objectValue(launchPayload, "audit");

  assert(typeof audit === "object" && audit !== null && !Array.isArray(audit), "Launch audit response is missing audit.");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "productContract");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "Discuss work");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "authorityBoundary");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "Auto-merge PRs");
  assertNoEmDash("Launch audit response", JSON.stringify(launchPayload));

  const statePayload = await fetchJson("/api/command-wave/state");

  assert(objectValue(statePayload, "version") === "command-wave-state-v0.1", "State endpoint returned the wrong version.");
  assertIncludes("State response", JSON.stringify(statePayload), "productContract");
  assertIncludes("State response", JSON.stringify(statePayload), "Discuss work");
  assertIncludes("State response", JSON.stringify(statePayload), "Visible activity report");
  assertIncludes("State response", JSON.stringify(statePayload), "Informational only");
  assertIncludes("State response", JSON.stringify(statePayload), "humansControl");
  assertIncludes("State response", JSON.stringify(statePayload), "Auto-merge PRs");
  assertNoEmDash("State response", JSON.stringify(statePayload));

  const setupProofPayload = await fetchJson("/api/command-wave/setup/proof");
  const proof = objectValue(setupProofPayload, "proof");

  assert(
    typeof proof === "object" &&
      proof !== null &&
      !Array.isArray(proof) &&
      objectValue(proof as JsonObject, "version") === "command-wave-setup-v0.1",
    "Setup proof endpoint returned the wrong version.",
  );
  assertNoEmDash("Setup proof response", JSON.stringify(setupProofPayload));

  console.log(`App smoke check passed for ${baseUrl}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown smoke check failure.";

  console.error(`App smoke check failed: ${message}`);
  process.exitCode = 1;
});
