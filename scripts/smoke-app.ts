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

async function fetchResponse(path: string) {
  const response = await fetch(appUrl(path), {
    headers: {
      accept: "application/json, text/html;q=0.9",
    },
  });

  assert(response.ok, `${path} returned ${response.status}.`);

  return response;
}

async function fetchText(path: string) {
  return (await fetchResponse(path)).text();
}

async function fetchJson(path: string) {
  const json = await (await fetchResponse(path)).json();

  assert(typeof json === "object" && json !== null && !Array.isArray(json), `${path} did not return a JSON object.`);

  return json as JsonObject;
}

function objectValue(value: JsonObject, key: string) {
  return value[key];
}

async function main() {
  const html = await fetchText("/");

  assert(html.includes(commandWaveProductCopy.headline), "Home page did not include the product headline.");
  assert(html.includes(commandWaveProductCopy.subhead), "Home page did not include the product subhead.");
  assertNoEmDash("Home page", html);

  const readiness = await fetchJson("/api/readiness");
  const readinessChecks = objectValue(readiness, "checks");

  assert(Array.isArray(readinessChecks), "Readiness response is missing checks.");
  assert(readinessChecks.length > 0, "Readiness response has no checks.");
  assertNoEmDash("Readiness response", JSON.stringify(readiness));

  const launchPayload = await fetchJson("/api/command-wave/launch/audit");
  const audit = objectValue(launchPayload, "audit");

  assert(typeof audit === "object" && audit !== null && !Array.isArray(audit), "Launch audit response is missing audit.");
  assertNoEmDash("Launch audit response", JSON.stringify(launchPayload));

  console.log(`App smoke check passed for ${baseUrl}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown smoke check failure.";

  console.error(`App smoke check failed: ${message}`);
  process.exitCode = 1;
});
