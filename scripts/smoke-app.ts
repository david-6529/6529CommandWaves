import { fetchJsonWithTimeout, fetchTextWithTimeout } from "../src/lib/http-fetch";
import { commandWaveProductCopy } from "../src/lib/product-copy";
import { hashValue } from "../src/lib/run-manifest";

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
    "daemon updates",
    "This pilot is the shared workspace for the 6529 AMM hook.",
    "Builders use chat to ask questions, suggest work, record decisions, and move approved changes into GitHub PRs.",
    "Draft the non-upgradeable hook scaffold",
    "Next: PR work waits until maintainers select the GitHub repo.",
    "GitHub repo is still a placeholder, so PR work waits.",
    "Latest change: Builders approved the hook scaffold with 5 yes and 1 no.",
    "daemon keeps the log current.",
    "Reviewer process is a placeholder for this phase.",
    "The GitHub repo is a placeholder until the pilot repo is selected.",
    "GitHub repo placeholder",
    "Changelog",
    "How this works",
    "Flow",
    "Project, Discuss, Decide, PR, Review, Log",
    "Active projects",
    "Start with the pilot hook. More hook projects can appear here after this loop works.",
    "Hook Build",
    "6529-hook-builder",
    "Message builders",
    "Who can join?",
    "How do I join?",
    "How does work start?",
    "How are PRs approved?",
    "Who merges?",
    "Everything starts in chat.",
    "daemon labels risk and keeps scope small.",
    "A reviewer check must pass before humans merge.",
    "Connect wallet if you want, then use Request access in chat.",
    "Current work",
    "Draft hook scaffold",
    "Repo placeholder",
    "View setup",
    "Builders approved with 5 yes and 1 no.",
    "GitHub repo",
    "id=\"project-repo-url\"",
    "placeholder=\"Select later, owner/repo or GitHub URL\"",
    "id=\"project-access-key\"",
    "The GitHub repo is a placeholder until the pilot repo is selected.",
    "No GitHub repo is selected yet. Select the pilot repo before creating PR work.",
    "PR build waits until maintainers select the GitHub repo.",
    "Project chat",
    "id=\"project-chat-tab-general\"",
    "aria-controls=\"project-chat-panel-general\"",
    "id=\"project-chat-panel-general\"",
    "role=\"tabpanel\"",
    "General",
    "Build",
    "Review",
    "Questions, ideas, risks, and work all start here.",
    "Repo placeholder",
    "Post to chat",
    "Save proposal",
    "Recent chat",
    "Builders",
    "Profiles show visible chat, PR, and review activity.",
    "Visible contribution",
    "Decision links: 2 report points",
    "Builder details",
    "Access notes, reports, and code checks for builders who want the details.",
    "The group records a project decision before PR work starts.",
    "Review approval is manual in this phase.",
    "Report points summarize visible work only.",
    "They do not grant access, payouts, or merge rights.",
    "Start in chat so builders can shape the idea.",
    "Save the proposal once builders can see it.",
    "Use GitHub PRs once the repo is connected.",
    "Propose work",
    "Boundaries and success criteria",
    "Details",
    "Project log",
    "/api/command-wave/verification/manifest",
    "Visible activity report",
    "Maintainer tools",
    "Server key needed before launch",
    "Set ADMIN_API_KEY on the server.",
    "Copy env checklist",
  ]) {
    assertIncludes("Home page", renderedHtml, label);
  }
  assert(!renderedHtml.includes("1 report points"), "Home page contains an incorrect singular report point label.");
  assert(!renderedHtml.includes("Use Codex to draft"), "Home page should describe pilot work for builders, not as a Codex task.");
  assert(!renderedHtml.includes("6529 decision receipt"), "Home page should not expose internal decision receipt language.");
  assert(!renderedHtml.includes("Decision receipt"), "Home page should not expose decision receipt labels.");
  assert(!renderedHtml.includes("Decision receipts"), "Home page should not expose decision receipt labels.");
  assert(!renderedHtml.includes("cmd-001 passed"), "Home page should summarize decisions in human-readable language.");
  assert(!renderedHtml.includes("https://github.com/6529-Collections/6529-hook"), "Home page still includes the old concrete hook repo.");
  assert(
    !renderedHtml.includes("value=\"https://github.com/your-org/your-hook-repo\""),
    "Home page must not render the placeholder GitHub URL as a selected repo.",
  );
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
  const launchProject = objectValue(audit, "project");

  assertJsonObject("Launch audit state evidence", stateEvidence);
  assertJsonObject("Launch audit project", launchProject);
  assert(
    objectValue(launchProject, "repoUrl") === null,
    "Launch audit project should not expose the placeholder repo URL as a selected repo.",
  );
  assertSha256("Launch audit wave state hash", objectValue(stateEvidence, "waveStateHash"));
  assertSha256("Launch audit rules hash", objectValue(stateEvidence, "rulesHash"));
  assertString("Launch audit status draft", statusDraft);
  for (const label of ["Project launch status", "Operator checklist:", "Verification:", "Guardrails:"]) {
    assertIncludes("Launch audit status draft", statusDraft, label);
  }
  assertIncludes("Launch audit status draft", statusDraft, "Verification manifest:");
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
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "configuredUrl");
  assert(
    !JSON.stringify(launchPayload).includes("https://github.com/your-org/your-hook-repo"),
    "Launch audit response should not expose the placeholder repo URL as a selected repo.",
  );
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "projectIndexUrl");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "contributionReportUrl");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "verificationManifestUrl");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "chatLaunchUrl");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "/api/command-wave/verification/manifest");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "/api/command-wave/projects");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "/api/command-wave/reports/contribution");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "/api/command-wave/launch/chat");
  assertIncludes(
    "Launch audit response",
    JSON.stringify(launchPayload),
    "Repo: GitHub repo placeholder (The GitHub repo is a placeholder until the pilot repo is selected.)",
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
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "chatPosts");
  assert(!JSON.stringify(launchPayload).includes("roomPosts"), "Launch audit response still includes roomPosts.");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "Project decision link");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "flow_project_decision_link");
  assert(
    !JSON.stringify(launchPayload).includes("Project decision receipt"),
    "Launch audit response still exposes decision receipt labels.",
  );
  assert(
    !JSON.stringify(launchPayload).includes("flow_wave_decision_receipt"),
    "Launch audit response still exposes the old decision receipt item id.",
  );
  assert(
    !JSON.stringify(launchPayload).includes("Receipt recorded"),
    "Launch audit response still exposes stale receipt copy.",
  );
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "No automatic payouts.");
  assertNoEmDash("Launch audit response", JSON.stringify(launchPayload));

  const chatLaunchPayload = await fetchJson("/api/command-wave/launch/chat");
  const chatLaunchAudit = objectValue(chatLaunchPayload, "audit");

  assertJsonObject("Chat launch response audit", chatLaunchAudit);
  assert(objectValue(chatLaunchAudit, "version") === "command-wave-chat-launch-v0.1", "Chat launch returned the wrong version.");
  assertSha256("Chat launch hash", objectValue(chatLaunchAudit, "chatLaunchHash"));
  assertSha256("Chat launch source audit hash", objectValue(chatLaunchAudit, "sourceAuditHash"));
  assert(
    objectValue(chatLaunchAudit, "chatLaunchHash") ===
      hashValue(Object.fromEntries(Object.entries(chatLaunchAudit).filter(([key]) => key !== "chatLaunchHash"))),
    "Chat launch hash did not match payload.",
  );
  assertIncludes("Chat launch response", JSON.stringify(chatLaunchPayload), "stateEvidence");
  assertIncludes("Chat launch response", JSON.stringify(chatLaunchPayload), "verificationManifestUrl");
  assertIncludes("Chat launch response", JSON.stringify(chatLaunchPayload), "/api/command-wave/verification/manifest");
  assertIncludes("Chat launch response", JSON.stringify(chatLaunchPayload), "chatLaunch");
  assertIncludes("Chat launch response", JSON.stringify(chatLaunchPayload), "prLoop");
  assertNoEmDash("Chat launch response", JSON.stringify(chatLaunchPayload));

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
  assertIncludes("State response", JSON.stringify(statePayload), "configuredUrl");
  assert(
    !JSON.stringify(statePayload).includes("https://github.com/your-org/your-hook-repo"),
    "State response should not expose the placeholder repo URL as a selected repo.",
  );
  assert(
    !JSON.stringify(statePayload).includes("https://github.com/6529-Collections/6529-hook"),
    "State response still includes the old concrete hook repo.",
  );
  assertIncludes("State response", JSON.stringify(statePayload), "Discuss in chat");
  assertIncludes("State response", JSON.stringify(statePayload), "accessStatus");
  assert(!JSON.stringify(statePayload).includes("gateStatus"), "State response still includes gateStatus.");
  assertIncludes("State response", JSON.stringify(statePayload), "Builders approved with 5 yes and 1 no.");
  assert(
    !JSON.stringify(statePayload).includes("Project decision link recorded"),
    "State response still exposes stale decision link copy.",
  );
  assertIncludes("State response", JSON.stringify(statePayload), "Visible activity report");
  assertIncludes("State response", JSON.stringify(statePayload), "Informational only");
  assertIncludes("State response", JSON.stringify(statePayload), "chatPosts");
  assert(!JSON.stringify(statePayload).includes("roomPosts"), "State response still includes roomPosts.");
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
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "Repo placeholder");
  assert(
    !JSON.stringify(projectsPayload).includes("https://github.com/your-org/your-hook-repo"),
    "Projects response should not expose the placeholder repo URL as a selected repo.",
  );
  assert(
    !JSON.stringify(projectsPayload).includes("https://github.com/6529-Collections/6529-hook"),
    "Projects response still includes the old concrete hook repo.",
  );
  assertNoEmDash("Projects response", JSON.stringify(projectsPayload));

  const contributionReportPayload = await fetchJson("/api/command-wave/reports/contribution");

  assert(
    objectValue(contributionReportPayload, "version") === "command-wave-contribution-report-v0.1",
    "Contribution report returned the wrong version.",
  );
  assertSha256("Contribution report hash", objectValue(contributionReportPayload, "reportHash"));
  assert(
    objectValue(contributionReportPayload, "reportHash") ===
      hashValue(Object.fromEntries(Object.entries(contributionReportPayload).filter(([key]) => key !== "reportHash"))),
    "Contribution report hash did not match payload.",
  );
  const contributionProject = objectValue(contributionReportPayload, "project");
  const contributionAuthority = objectValue(contributionReportPayload, "authority");
  const contributionReport = objectValue(contributionReportPayload, "report");

  assertJsonObject("Contribution report project", contributionProject);
  assertJsonObject("Contribution report authority", contributionAuthority);
  assertJsonObject("Contribution report body", contributionReport);
  assertIncludes("Contribution report", JSON.stringify(contributionReportPayload), "daemon");
  assertIncludes("Contribution report", JSON.stringify(contributionReportPayload), "review-agent");
  assertIncludes("Contribution report", JSON.stringify(contributionReportPayload), "GitHub repo placeholder");
  assertIncludes("Contribution report", JSON.stringify(contributionReportPayload), "informational");
  assertIncludes("Contribution report", JSON.stringify(contributionReportPayload), "Visible activity report");
  assertIncludes("Contribution report", JSON.stringify(contributionReportPayload), "Merge rights");
  assertIncludes("Contribution report", JSON.stringify(contributionReportPayload), "Token weight");
  assert(
    !JSON.stringify(contributionReportPayload).includes("https://github.com/6529-Collections/6529-hook"),
    "Contribution report still includes the old concrete hook repo.",
  );
  assertNoEmDash("Contribution report", JSON.stringify(contributionReportPayload));

  const verificationManifestPayload = await fetchJson("/api/command-wave/verification/manifest");
  const verificationManifest = objectValue(verificationManifestPayload, "manifest");

  assertJsonObject("Verification manifest", verificationManifest);
  assert(
    objectValue(verificationManifest, "version") === "command-wave-verification-manifest-v0.1",
    "Verification manifest returned the wrong version.",
  );
  assertSha256("Verification manifest hash", objectValue(verificationManifest, "manifestHash"));
  assert(
    objectValue(verificationManifest, "manifestHash") ===
      hashValue(Object.fromEntries(Object.entries(verificationManifest).filter(([key]) => key !== "manifestHash"))),
    "Verification manifest hash did not match payload.",
  );
  const stableAnchors = objectValue(verificationManifest, "stableAnchors");

  assertJsonObject("Verification manifest stable anchors", stableAnchors);
  assert(objectValue(stableAnchors, "waveStateHash") === objectValue(stateEvidence, "waveStateHash"), "Verification manifest wave hash does not match launch audit.");
  assert(objectValue(stableAnchors, "projectIndexHash") === objectValue(projectsPayload, "projectsHash"), "Verification manifest project hash does not match project index.");
  assertIncludes("Verification manifest", JSON.stringify(verificationManifestPayload), "/api/command-wave/setup/proof");
  assertIncludes("Verification manifest", JSON.stringify(verificationManifestPayload), "/api/command-wave/verification/manifest");
  assertIncludes("Verification manifest", JSON.stringify(verificationManifestPayload), "/api/command-wave/state");
  assertIncludes("Verification manifest", JSON.stringify(verificationManifestPayload), "/api/command-wave/projects");
  assertIncludes("Verification manifest", JSON.stringify(verificationManifestPayload), "/api/command-wave/reports/contribution");
  assertIncludes("Verification manifest", JSON.stringify(verificationManifestPayload), "/api/command-wave/launch/audit");
  assertIncludes("Verification manifest", JSON.stringify(verificationManifestPayload), "/api/command-wave/launch/chat");
  assertIncludes("Verification manifest", JSON.stringify(verificationManifestPayload), "reportHash");
  assertIncludes("Verification manifest", JSON.stringify(verificationManifestPayload), "chatLaunchHash");
  assertIncludes("Verification manifest", JSON.stringify(verificationManifestPayload), "sourceAuditHash");
  const manifestEndpoints = objectValue(verificationManifest, "endpoints");

  assert(Array.isArray(manifestEndpoints), "Verification manifest endpoints are missing.");
  const contributionEndpoint = manifestEndpoints.find(
    (endpoint): endpoint is JsonObject =>
      typeof endpoint === "object" &&
      endpoint !== null &&
      objectValue(endpoint as JsonObject, "id") === "contribution_report",
  );

  assertJsonObject("Verification manifest contribution endpoint", contributionEndpoint);
  const contributionEndpointHashes = objectValue(contributionEndpoint, "hashes");

  assertJsonObject("Verification manifest contribution hashes", contributionEndpointHashes);
  assert(
    objectValue(contributionEndpointHashes, "generated") === objectValue(contributionReportPayload, "reportHash"),
    "Verification manifest contribution report hash does not match report endpoint.",
  );
  assertNoEmDash("Verification manifest", JSON.stringify(verificationManifestPayload));

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
