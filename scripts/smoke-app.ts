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

function normalizeHydrationMarkers(value: string) {
  return value.replace(/<!--(?:[^-]|-(?!->))*-->/g, "");
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
  const renderedHtml = normalizeHydrationMarkers(html);

  assertIncludes("Home page", renderedHtml, commandWaveProductCopy.headline);
  for (const label of [
    "dark-app",
    "bg-zinc-950",
    "Decentralized Coding: Beta",
    "Pilot: 6529 AMM hook",
    "Join a swarm of builders creating a hook together through chat, decisions, pull requests, and reviews.",
    "Wallet",
    "Access is manual for now.",
    "Connect wallet",
    "Project summary",
    "daemon managed",
    "This page is the working snapshot for the 6529 AMM hook build.",
    "Builders use chat to shape ideas, record decisions, attach pull requests, and review the result.",
    "Draft the non-upgradeable hook scaffold",
    "Next step: Select the GitHub repo before PR work can run.",
    "PR work waits until the repo is selected.",
    "daemon keeps this summary and changelog current.",
    "Review agent is a placeholder for this phase.",
    "GitHub repo is a placeholder until the hook repo is selected.",
    "GitHub repo placeholder",
    "Changelog",
    "Rules",
    "Who can join?",
    "How do I join?",
    "How does work start?",
    "How are PRs approved?",
    "Who merges?",
    "Everything starts in chat.",
    "Connect wallet if you want, then use Request access in chat.",
    "Current work",
    "Select the repo",
    "Select repo",
    "5 yes, 1 no. Decision link recorded.",
    "GitHub repo",
    "id=\"project-repo-url\"",
    "id=\"project-access-key\"",
    "Placeholder until selected.",
    "This default is only a placeholder. Select the real hook repo before creating PR work.",
    "Select the GitHub repo before the PR build step.",
    "Repo setup needed",
    "Project chat",
    "id=\"project-chat-tab-general\"",
    "aria-controls=\"project-chat-panel-general\"",
    "id=\"project-chat-panel-general\"",
    "role=\"tabpanel\"",
    "General",
    "Build",
    "Review",
    "Questions, ideas, risks, and work all start here.",
    "Repo setup",
    "Save work item",
    "Post message",
    "Recent chat",
    "Builders",
    "Profiles show visible chat, PR, and review activity.",
    "Visible contribution",
    "Build reference",
    "Access notes, reports, and code checks for builders who want the details.",
    "The group records a project decision before PR work starts.",
    "Review approval is manual in this phase.",
    "Report points summarize visible work only.",
    "They do not grant access, payouts, or merge rights.",
    "Start in chat so builders can shape the idea.",
    "Save the scoped work once builders can see it.",
    "Use GitHub PRs once the repo is connected.",
    "Scope work",
    "Save scoped work",
    "Project log",
    "Visible activity report",
    "Maintainer tools",
    "Server key needed before launch",
    "Set ADMIN_API_KEY on the server.",
    "Copy env checklist",
  ]) {
    assertIncludes("Home page", renderedHtml, label);
  }
  assert(!renderedHtml.includes("1 report points"), "Home page contains an incorrect singular report point label.");
  assert(!renderedHtml.includes("https://github.com/6529-Collections/6529-hook"), "Home page still includes the old concrete hook repo.");
  assertNoEmDash("Home page", renderedHtml);

  const readiness = await fetchJson("/api/readiness");
  const readinessChecks = objectValue(readiness, "checks");

  assert(Array.isArray(readinessChecks), "Readiness response is missing checks.");
  assert(readinessChecks.length > 0, "Readiness response has no checks.");
  assertNoEmDash("Readiness response", JSON.stringify(readiness));

  const launchPayload = await fetchJson("/api/command-wave/launch/audit");
  const audit = objectValue(launchPayload, "audit");

  assertJsonObject("Launch audit response audit", audit);
  assert(objectValue(audit, "version") === "command-wave-launch-audit-v0.1", "Launch audit returned the wrong version.");
  assertSha256("Launch audit bundle hash", objectValue(audit, "auditHash"));

  const stateEvidence = objectValue(audit, "stateEvidence");
  const statusDraft = objectValue(audit, "statusDraft");
  const launchPacket = objectValue(audit, "launchPacket");
  const reports = objectValue(audit, "reports");

  assertJsonObject("Launch audit state evidence", stateEvidence);
  assertSha256("Launch audit wave state hash", objectValue(stateEvidence, "waveStateHash"));
  assertSha256("Launch audit rules hash", objectValue(stateEvidence, "rulesHash"));
  assertString("Launch audit status draft", statusDraft);
  for (const label of ["Project launch status", "Operator checklist:", "Verification:", "Guardrails:"]) {
    assertIncludes("Launch audit status draft", statusDraft, label);
  }
  assertJsonObject("Launch audit launch packet", launchPacket);
  assertSha256("Launch audit launch packet hash", objectValue(launchPacket, "packetHash"));
  assertJsonObject("Launch audit reports", reports);
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "auditHash");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "projectSnapshot");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "hookSafety");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "Hook contracts are immutable by default");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "bound-focused tests");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "delegatecall");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "workflowProof");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "Public proof of the chat, decision, PR, review, and log path");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "launchPacket");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "# Project launch packet");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "## Workflow Proof");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "## Authority Limits");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "Pull request");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "currentWork");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "nextStep");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "latestChanges");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "updatedAt");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "productContract");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "Ask in chat to join. Access is reviewed manually for now.");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "daemon");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "review-agent");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "githubRepo");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "https://github.com/your-org/your-hook-repo");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "projectIndexUrl");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "/api/command-wave/projects");
  assertIncludes(
    "Launch audit response",
    JSON.stringify(launchPayload),
    "Repo: GitHub repo placeholder (Select the hook repo before PR work can run.)",
  );
  assert(
    !JSON.stringify(launchPayload).includes("https://github.com/6529-Collections/6529-hook"),
    "Launch audit response still includes the old concrete hook repo.",
  );
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "Discuss in chat");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "authorityBoundary");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "accessStatus");
  assert(!JSON.stringify(launchPayload).includes("gateStatus"), "Launch audit response still includes gateStatus.");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "Auto-merge PRs");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "Visible activity report");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "No automatic payouts.");
  assertNoEmDash("Launch audit response", JSON.stringify(launchPayload));

  const statePayload = await fetchJson("/api/command-wave/state");

  assert(objectValue(statePayload, "version") === "command-wave-state-v0.1", "State endpoint returned the wrong version.");
  assert(objectValue(statePayload, "waveStateHash") === objectValue(stateEvidence, "waveStateHash"), "Launch audit state hash does not match public state hash.");
  assertSha256("State response snapshot hash", objectValue(statePayload, "stateHash"));
  assertIncludes("State response", JSON.stringify(statePayload), "projectSnapshot");
  assertIncludes("State response", JSON.stringify(statePayload), "hookSafety");
  assertIncludes("State response", JSON.stringify(statePayload), "Hook contracts are immutable by default");
  assertIncludes("State response", JSON.stringify(statePayload), "bound-focused tests");
  assertIncludes("State response", JSON.stringify(statePayload), "delegatecall");
  assertIncludes("State response", JSON.stringify(statePayload), "workflowProof");
  assertIncludes("State response", JSON.stringify(statePayload), "Public proof of the chat, decision, PR, review, and log path");
  assertIncludes("State response", JSON.stringify(statePayload), "Pull request");
  assertIncludes("State response", JSON.stringify(statePayload), "currentWork");
  assertIncludes("State response", JSON.stringify(statePayload), "nextStep");
  assertIncludes("State response", JSON.stringify(statePayload), "latestChanges");
  assertIncludes("State response", JSON.stringify(statePayload), "updatedAt");
  assertIncludes("State response", JSON.stringify(statePayload), "productContract");
  assertIncludes("State response", JSON.stringify(statePayload), "Ask in chat to join. Access is reviewed manually for now.");
  assertIncludes("State response", JSON.stringify(statePayload), "daemon");
  assertIncludes("State response", JSON.stringify(statePayload), "review-agent");
  assertIncludes("State response", JSON.stringify(statePayload), "githubRepo");
  assertIncludes("State response", JSON.stringify(statePayload), "https://github.com/your-org/your-hook-repo");
  assert(
    !JSON.stringify(statePayload).includes("https://github.com/6529-Collections/6529-hook"),
    "State response still includes the old concrete hook repo.",
  );
  assertIncludes("State response", JSON.stringify(statePayload), "Discuss in chat");
  assertIncludes("State response", JSON.stringify(statePayload), "accessStatus");
  assert(!JSON.stringify(statePayload).includes("gateStatus"), "State response still includes gateStatus.");
  assertIncludes("State response", JSON.stringify(statePayload), "Visible activity report");
  assertIncludes("State response", JSON.stringify(statePayload), "Informational only");
  assertIncludes("State response", JSON.stringify(statePayload), "stateHash");
  assertIncludes("State response", JSON.stringify(statePayload), "humansControl");
  assertIncludes("State response", JSON.stringify(statePayload), "Auto-merge PRs");
  assertNoEmDash("State response", JSON.stringify(statePayload));

  const projectsPayload = await fetchJson("/api/command-wave/projects");

  assert(objectValue(projectsPayload, "version") === "command-wave-projects-v0.1", "Projects endpoint returned the wrong version.");
  assertSha256("Projects response hash", objectValue(projectsPayload, "projectsHash"));
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "Hook Build");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "6529-hook-builder");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "GitHub repo placeholder");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "Select the repo");
  assert(
    !JSON.stringify(projectsPayload).includes("https://github.com/6529-Collections/6529-hook"),
    "Projects response still includes the old concrete hook repo.",
  );
  assertNoEmDash("Projects response", JSON.stringify(projectsPayload));

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
