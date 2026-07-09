import { fetchJsonWithTimeout, fetchTextResponseWithTimeout, fetchTextWithTimeout } from "../src/lib/http-fetch";
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

function assertNoForbiddenDash(label: string, value: string) {
  assert(!value.includes("\u2014"), `${label} contains an em dash.`);
  assert(!value.includes("\u2013"), `${label} contains an en dash.`);
}

const forbiddenPublicRepoPayloadFragments = [
  "https://github.com/your-org/your-hook-repo",
  "https://github.com/6529-Collections/6529-hook",
  "Built cmd-001 through Codex",
  "Review passed the hook scaffold",
];

function assertNoPublicRepoLeaks(label: string, value: string) {
  for (const fragment of forbiddenPublicRepoPayloadFragments) {
    assert(!value.includes(fragment), `${label} contains stale repo-bound placeholder data.`);
  }
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

  for (const label of [
    "dark-app",
    "Decentralized Coding: Beta",
    "Design preview",
    "Pilot: 6529 AMM Hook",
    "50 builders. One immutable hook. Fees shared by accepted contribution.",
    "Connect wallet",
    "Builders",
    "50 max",
    "Enrollment not open",
    "Contributor share",
    "Needs approval",
    "Repository",
    "Not connected",
    "Reviewer",
    "Not selected",
    "Approve the pilot rules",
    "Review proposed rules",
    "Freeze the project rules",
    "Open work",
    "Define immutable fee behavior",
    "Connect the hook repository",
    "Draft the hook scaffold",
    "Not claimable",
    "View work",
    "Live discussion",
    "Build together",
    "Discussion filters",
    "daemon summary",
    "No live builder messages yet",
    "Message the builders",
    "Send",
    "Source not connected",
    "Pull requests",
    "No real pull requests yet",
    "Contributors",
    "Raw chat activity does not determine rewards.",
    "Builder enrollment has not opened",
    "Project brief and rules",
    "Public proof",
    "Agents cannot vote, merge, deploy, finalize rewards, or move funds.",
  ]) {
    assertIncludes("Home page", renderedHtml, label);
  }
  for (const removedPublicControl of [
    "Current loop",
    "Launch checklist",
    "Maintainer setup",
    "Proposal tools",
    "project-access-key",
    "Copy env checklist",
    "Report: 1 report point",
    "Voting: yes on cmd-001",
    "gpebbles",
    "blocknoob",
    "runtime-check",
    "preview-redaction",
  ]) {
    assert(
      !renderedHtml.includes(removedPublicControl),
      `Home page should not render removed public content: ${removedPublicControl}.`,
    );
  }
  assertIncludes("Home page", renderedHtml, 'href="/work/work-01"');
  assertNoPublicRepoLeaks("Home page", renderedHtml);
  assertNoForbiddenDash("Home page", renderedHtml);

  const workHtml = normalizeHydrationMarkers(await fetchText("/work/work-01"));

  for (const label of [
    "dark-app",
    "Back to project",
    "Decentralized Coding: Beta",
    "Pilot: 6529 AMM Hook",
    "WORK 01",
    "Define immutable fee behavior",
    "Join discussion",
    "What this should deliver",
    "Constraints",
    "No proxy or delegatecall upgrade path.",
    "Roles",
    "Not open",
    "Reward state",
    "Not claimable",
    "Group decision",
    "Needs group decision",
    "Code and review",
    "Evidence",
    "No group decision, pull request, or repo-bound review proof is recorded for this work.",
  ]) {
    assertIncludes("Work page", workHtml, label);
  }
  assertIncludes("Work page", workHtml, "Work | Decentralized Coding: Beta");
  assertIncludes("Work page", workHtml, 'href="/#discussion"');
  for (const unavailableControl of ["Claim work", "Open pull request", "Open repository"]) {
    assert(!workHtml.includes(unavailableControl), `Work page should not render unavailable control: ${unavailableControl}.`);
  }
  assertNoPublicRepoLeaks("Work page", workHtml);
  assertNoForbiddenDash("Work page", workHtml);

  const missingWork = await fetchTextResponseWithTimeout(appUrl("/work/missing"), {
    allowedStatuses: [404],
    headers: { accept: "text/html" },
  });

  assert(missingWork.status === 404, "Missing work route should return 404.");
  assertIncludes("Missing work page", missingWork.text, "Work not found");
  assertNoForbiddenDash("Missing work page", missingWork.text);

  const staleDecisionCopy = "decision " + "receipt";
  const staleProofRecorded = "Rece" + "ipt recorded";
  const staleBuilderDecision = "Builder decision required";

  const readiness = await fetchJson("/api/readiness");
  const readinessChecks = objectValue(readiness, "checks");

  assert(Array.isArray(readinessChecks), "Readiness response is missing checks.");
  assert(readinessChecks.length > 0, "Readiness response has no checks.");
  assertNoForbiddenDash("Readiness response", JSON.stringify(readiness));

  const chatPostingCapabilityPayload = await fetchJson("/api/6529/chat-post");
  const chatPostingCapability = objectValue(chatPostingCapabilityPayload, "capability");

  assert(
    objectValue(chatPostingCapabilityPayload, "version") === "command-wave-chat-posting-capability-v0.1",
    "Chat posting capability returned the wrong version.",
  );
  assertSha256("Chat posting capability hash", objectValue(chatPostingCapabilityPayload, "capabilityHash"));
  assert(
    objectValue(chatPostingCapabilityPayload, "capabilityHash") ===
      hashValue(Object.fromEntries(Object.entries(chatPostingCapabilityPayload).filter(([key]) => key !== "capabilityHash"))),
    "Chat posting capability hash did not match payload.",
  );
  assertJsonObject("Chat posting capability", chatPostingCapability);
  assert(
    typeof objectValue(chatPostingCapability, "canPost") === "boolean",
    "Chat posting capability is missing canPost.",
  );
  assertString("Chat posting capability mode", objectValue(chatPostingCapability, "mode"));
  assertString("Chat posting capability message", objectValue(chatPostingCapability, "message"));
  const chatPostingPace = objectValue(chatPostingCapability, "pace");

  assertJsonObject("Chat posting pace", chatPostingPace);
  assert(objectValue(chatPostingPace, "maxPosts") === 3, "Chat posting pace maxPosts is wrong.");
  assert(objectValue(chatPostingPace, "windowSeconds") === 300, "Chat posting pace windowSeconds is wrong.");
  assert(objectValue(chatPostingPace, "identity") === "each builder", "Chat posting pace identity is wrong.");
  assert(objectValue(chatPostingPace, "enforcedBy") === "daemon", "Chat posting pace enforcer is wrong.");
  assert(!JSON.stringify(chatPostingCapabilityPayload).includes("6529_BOT"), "Chat posting capability exposes env names.");
  assert(!JSON.stringify(chatPostingCapabilityPayload).includes("windowMs"), "Chat posting capability exposes internal windowMs.");
  assertNoForbiddenDash("Chat posting capability", JSON.stringify(chatPostingCapabilityPayload));

  const wavePayload = await fetchJson("/api/command-wave");
  const publicWave = objectValue(wavePayload, "wave");

  assertJsonObject("Public project read wave", publicWave);
  assert(
    objectValue(publicWave, "repoUrl") === null,
    "Public project read response should publish null while the GitHub repo is a placeholder.",
  );
  assert(
    !JSON.stringify(wavePayload).includes("https://github.com/your-org/your-hook-repo"),
    "Public project read response should not expose the placeholder repo URL.",
  );
  assertNoPublicRepoLeaks("Public project read response", JSON.stringify(wavePayload));
  assertNoForbiddenDash("Public project read response", JSON.stringify(wavePayload));

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
  for (const label of ["Staged project status", "Chat launch:", "PR loop:", "Operator checklist:", "Verification:", "Guardrails:"]) {
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
    "Repo: GitHub repo placeholder (No GitHub repo is selected yet. PR work stays blocked until maintainers choose the repo.)",
  );
  assert(
    !JSON.stringify(launchPayload).includes("https://github.com/6529-Collections/6529-hook"),
    "Launch audit response still includes the old concrete hook repo.",
  );
  assertNoPublicRepoLeaks("Launch audit response", JSON.stringify(launchPayload));
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
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "flow_discussion_signal");
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "Group discussion");
  assert(
    !JSON.stringify(launchPayload).includes(`Project ${staleDecisionCopy}`),
    "Launch audit response still exposes legacy decision-link labels.",
  );
  assert(
    !JSON.stringify(launchPayload).includes("flow_wave_decision_receipt"),
    "Launch audit response still exposes the old decision-link item id.",
  );
  assert(
    !JSON.stringify(launchPayload).includes(staleProofRecorded),
    "Launch audit response still exposes stale decision-link copy.",
  );
  assertIncludes("Launch audit response", JSON.stringify(launchPayload), "No automatic payouts.");
  assertNoForbiddenDash("Launch audit response", JSON.stringify(launchPayload));

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
  assertIncludes("Chat launch response", JSON.stringify(chatLaunchPayload), "flow_discussion_signal");
  assertIncludes("Chat launch response", JSON.stringify(chatLaunchPayload), "Group discussion");
  assertNoPublicRepoLeaks("Chat launch response", JSON.stringify(chatLaunchPayload));
  assertNoForbiddenDash("Chat launch response", JSON.stringify(chatLaunchPayload));

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
  assertIncludes("State response", JSON.stringify(statePayload), "currentVote");
  assertIncludes("State response", JSON.stringify(statePayload), "currentDecisionRequest");
  assertIncludes("State response", JSON.stringify(statePayload), "discussionTopics");
  assertIncludes("State response", JSON.stringify(statePayload), "\"chat\"");
  assertIncludes("State response", JSON.stringify(statePayload), "group_chat");
  assertIncludes(
    "State response",
    JSON.stringify(statePayload),
    "Send normal messages. daemon parses the group chat for work, decisions, PR links, and review notes.",
  );
  assertIncludes("State response", JSON.stringify(statePayload), "3 messages every 5 min");
  assertIncludes("State response", JSON.stringify(statePayload), "pullRequests");
  assertIncludes("State response", JSON.stringify(statePayload), "rules");
  assertIncludes("State response", JSON.stringify(statePayload), "How are PRs approved?");
  assertIncludes("State response", JSON.stringify(statePayload), "Reviewer status is shown on each PR.");
  assertIncludes("State response", JSON.stringify(statePayload), "managedBy");
  assertIncludes("State response", JSON.stringify(statePayload), "voteSummary");
  assertIncludes("State response", JSON.stringify(statePayload), "latestVote");
  assertIncludes("State response", JSON.stringify(statePayload), "Select the pilot GitHub repo");
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
  assert(
    !JSON.stringify(statePayload).includes(staleBuilderDecision),
    "State response still exposes stale decision requirement copy.",
  );
  assertIncludes("State response", JSON.stringify(statePayload), "Visible activity report");
  assertIncludes("State response", JSON.stringify(statePayload), "Informational only");
  assertIncludes("State response", JSON.stringify(statePayload), "chatPosts");
  assert(!JSON.stringify(statePayload).includes("roomPosts"), "State response still includes roomPosts.");
  assertIncludes("State response", JSON.stringify(statePayload), "stateHash");
  assertIncludes("State response", JSON.stringify(statePayload), "humansControl");
  assertIncludes("State response", JSON.stringify(statePayload), "Auto-merge PRs");
  assertNoPublicRepoLeaks("State response", JSON.stringify(statePayload));
  assertNoForbiddenDash("State response", JSON.stringify(statePayload));

  const projectsPayload = await fetchJson("/api/command-wave/projects");

  assert(objectValue(projectsPayload, "version") === "command-wave-projects-v0.1", "Projects endpoint returned the wrong version.");
  assertSha256("Projects response hash", objectValue(projectsPayload, "projectsHash"));
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "6529 AMM hook");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "6529-hook-builder");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "GitHub repo placeholder");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "latestChanges");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "currentVote");
  const projects = objectValue(projectsPayload, "projects");
  assert(Array.isArray(projects), "Projects response is missing projects.");
  const activeProject = projects[0];
  assertJsonObject("Projects response active project", activeProject);
  assert(objectValue(activeProject, "status") === "active", "Projects response should mark the selected chat project active.");
  assert(objectValue(activeProject, "statusLabel") === "active", "Projects response active project label is wrong.");
  const projectCurrentVote = objectValue(activeProject, "currentVote");
  assertJsonObject("Projects response current vote", projectCurrentVote);
  assert(objectValue(projectCurrentVote, "yesVotes") === 5, "Projects response current vote yes count is wrong.");
  assert(objectValue(projectCurrentVote, "noVotes") === 1, "Projects response current vote no count is wrong.");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "discussionTopics");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "\"chat\"");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "group_chat");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "pullRequests");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "rules");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "How are PRs approved?");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "managedBy");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "members");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "voteSummary");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "daemon");
  assertIncludes("Projects response", JSON.stringify(projectsPayload), "review-agent");
  assert(
    !JSON.stringify(projectsPayload).includes("https://github.com/your-org/your-hook-repo"),
    "Projects response should not expose the placeholder repo URL as a selected repo.",
  );
  assert(
    !JSON.stringify(projectsPayload).includes("https://github.com/6529-Collections/6529-hook"),
    "Projects response still includes the old concrete hook repo.",
  );
  assert(
    !JSON.stringify(projectsPayload).includes(staleBuilderDecision),
    "Projects response still exposes stale decision requirement copy.",
  );
  assertNoPublicRepoLeaks("Projects response", JSON.stringify(projectsPayload));
  assertNoForbiddenDash("Projects response", JSON.stringify(projectsPayload));

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
  assertIncludes("Contribution report", JSON.stringify(contributionReportPayload), "voteSummary");
  assertIncludes("Contribution report", JSON.stringify(contributionReportPayload), "latestVote");
  assertIncludes("Contribution report", JSON.stringify(contributionReportPayload), "Merge rights");
  assertIncludes("Contribution report", JSON.stringify(contributionReportPayload), "Token weight");
  assert(
    !JSON.stringify(contributionReportPayload).includes("https://github.com/6529-Collections/6529-hook"),
    "Contribution report still includes the old concrete hook repo.",
  );
  assert(
    !JSON.stringify(contributionReportPayload).includes(staleBuilderDecision),
    "Contribution report still exposes stale decision requirement copy.",
  );
  assertNoPublicRepoLeaks("Contribution report", JSON.stringify(contributionReportPayload));
  assertNoForbiddenDash("Contribution report", JSON.stringify(contributionReportPayload));

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
  assertIncludes("Verification manifest", JSON.stringify(verificationManifestPayload), "/api/6529/chat-post");
  assertIncludes("Verification manifest", JSON.stringify(verificationManifestPayload), "reportHash");
  assertIncludes("Verification manifest", JSON.stringify(verificationManifestPayload), "chatLaunchHash");
  assertIncludes("Verification manifest", JSON.stringify(verificationManifestPayload), "sourceAuditHash");
  assertIncludes("Verification manifest", JSON.stringify(verificationManifestPayload), "capabilityHash");
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
  const chatPostingEndpoint = manifestEndpoints.find(
    (endpoint): endpoint is JsonObject =>
      typeof endpoint === "object" &&
      endpoint !== null &&
      objectValue(endpoint as JsonObject, "id") === "chat_posting_capability",
  );

  assertJsonObject("Verification manifest chat posting endpoint", chatPostingEndpoint);
  const chatPostingEndpointHashes = objectValue(chatPostingEndpoint, "hashes");

  assertJsonObject("Verification manifest chat posting hashes", chatPostingEndpointHashes);
  assert(
    objectValue(chatPostingEndpointHashes, "stable") === objectValue(chatPostingCapabilityPayload, "capabilityHash"),
    "Verification manifest chat posting hash does not match capability endpoint.",
  );
  assertNoPublicRepoLeaks("Verification manifest", JSON.stringify(verificationManifestPayload));
  assert(!JSON.stringify(verificationManifestPayload).includes("6529_BOT"), "Verification manifest exposes chat posting env names.");
  assert(!JSON.stringify(verificationManifestPayload).includes("windowMs"), "Verification manifest exposes internal chat posting windowMs.");
  assertNoForbiddenDash("Verification manifest", JSON.stringify(verificationManifestPayload));

  const setupProofPayload = await fetchJson("/api/command-wave/setup/proof");
  const proof = objectValue(setupProofPayload, "proof");

  assert(
    typeof proof === "object" &&
      proof !== null &&
      !Array.isArray(proof) &&
      objectValue(proof as JsonObject, "version") === "command-wave-setup-v0.1",
    "Setup proof endpoint returned the wrong version.",
  );
  assertNoPublicRepoLeaks("Setup proof response", JSON.stringify(setupProofPayload));
  assertNoForbiddenDash("Setup proof response", JSON.stringify(setupProofPayload));

  console.log(`App smoke check passed for ${baseUrl}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown smoke check failure.";

  console.error(`App smoke check failed: ${message}`);
  process.exitCode = 1;
});
