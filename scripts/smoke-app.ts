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

function assertJsonObject(label: string, value: unknown): asserts value is JsonObject {
  assert(typeof value === "object" && value !== null && !Array.isArray(value), `${label} is missing or is not a JSON object.`);
}

function assertString(label: string, value: unknown): asserts value is string {
  assert(typeof value === "string" && value.trim().length > 0, `${label} is missing or is not a string.`);
}

function assertSha256(label: string, value: unknown): asserts value is string {
  assertString(label, value);
  assert(/^[a-f0-9]{64}$/.test(value), `${label} is not a SHA-256 hash.`);
}

async function main() {
  const html = await fetchText("/");

  assertIncludes("Home page", html, commandWaveProductCopy.headline);
  for (const label of [
    "dark-app",
    "bg-zinc-950",
    "Decentralized Coding: Beta",
    "Pilot: 6529 AMM hook",
    "Join a swarm of builders creating a hook together through chat, decisions, pull requests, and reviews.",
    "Project summary",
    "orchestrator managed",
    "This pilot coordinates the design of a 6529 AMM hook through group chat",
    "Current work:",
    "The orchestrator keeps this summary and changelog current",
    "Builders can discuss ideas here, submit pull requests",
    "Open the code repo",
    "Changelog",
    "Rules",
    "Who can join?",
    "How do I join?",
    "How does work start?",
    "How are PRs approved?",
    "Who merges?",
    "Everything starts in chat.",
    "Use Request access in chat.",
    "Current focus",
    "Work",
    "Being discussed",
    "Chat with builders",
    "Discuss PR",
    "Save work item",
    "Latest posts",
    "Latest activity",
    "Builders",
    "Profiles show visible activity in chat and GitHub.",
    "Visible contribution",
    "Build details",
    "The top Rules accordion is the plain-English source.",
    "The group records a project decision before approved PR work starts.",
    "Report points summarize visible work only.",
    "They do not grant access, payouts, or merge rights.",
    "Code guardrails",
    "Start in chat so builders can shape the idea.",
    "Use GitHub PRs for code changes.",
    "Work type",
    "Safety checks",
    "Proposal draft",
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

  assertJsonObject("Launch audit response audit", audit);
  assert(objectValue(audit, "version") === "command-wave-launch-audit-v0.1", "Launch audit returned the wrong version.");

  const stateEvidence = objectValue(audit, "stateEvidence");
  const statusDraft = objectValue(audit, "statusDraft");
  const reports = objectValue(audit, "reports");

  assertJsonObject("Launch audit state evidence", stateEvidence);
  assertSha256("Launch audit wave state hash", objectValue(stateEvidence, "waveStateHash"));
  assertSha256("Launch audit rules hash", objectValue(stateEvidence, "rulesHash"));
  assertString("Launch audit status draft", statusDraft);
  for (const label of ["Project launch status", "Operator checklist:", "Verification:", "Guardrails:"]) {
    assertIncludes("Launch audit status draft", statusDraft, label);
  }
  assertJsonObject("Launch audit reports", reports);
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "productContract");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "Discuss work");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "authorityBoundary");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "Auto-merge PRs");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "Visible activity report");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "No automatic payouts.");
  assertNoEmDash("Launch audit response", JSON.stringify(launchPayload));

  const statePayload = await fetchJson("/api/command-wave/state");

  assert(objectValue(statePayload, "version") === "command-wave-state-v0.1", "State endpoint returned the wrong version.");
  assert(objectValue(statePayload, "waveStateHash") === objectValue(stateEvidence, "waveStateHash"), "Launch audit state hash does not match public state hash.");
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
