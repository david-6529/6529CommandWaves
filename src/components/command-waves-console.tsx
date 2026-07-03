"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { attachAdminApiKey } from "@/lib/admin-client";
import { formatApiError, type ApiErrorPayload } from "@/lib/api-error-copy";
import { createBuildTimeline, type BuildTimelineStatus } from "@/lib/build-timeline";
import { createHookProgress, type HookProgressStatus } from "@/lib/hook-progress";
import { createBuilderRoster } from "@/lib/builder-roster";
import { createBuilderWaveChatDraft } from "@/lib/builder-wave-chat-draft";
import { createBuilderWaveDecisionDraft } from "@/lib/builder-wave-decision-draft";
import { createBuilderWaveJoinDraft } from "@/lib/builder-wave-join-draft";
import { createBuilderWaveLaunchDraft } from "@/lib/builder-wave-launch-draft";
import { createBuilderWaveProposalDraft } from "@/lib/builder-wave-proposal-draft";
import { createBuilderWaveQuickPosts, type BuilderWaveQuickPost } from "@/lib/builder-wave-quick-posts";
import { createBuilderWaveReviewRequestDraft } from "@/lib/builder-wave-review-request-draft";
import { commandKindLabel } from "@/lib/command-kind-copy";
import { createCommandOrchestrationSummary } from "@/lib/command-orchestration-summary";
import {
  classifyRisk,
  evaluatePoll,
  pollApprovalPassedForWave,
  validateWaveDecisionReference,
  type CommandKind,
  type CommandWave,
} from "@/lib/command-waves";
import { createContributionReport, createContributionReportDraft } from "@/lib/contribution-report";
import { createDeveloperFeePlan, createDeveloperFeePlanDraft } from "@/lib/developer-fee-plan";
import { demoWave } from "@/lib/demo-wave";
import { commandWaveProductCopy } from "@/lib/product-copy";
import { humanizeLegacyCommandCopy } from "@/lib/legacy-copy";
import {
  createFirstPhaseLaunchAudit,
  type FirstPhaseLaunchAuditItem,
  type FirstPhaseLaunchAuditItemStatus,
  type FirstPhaseLaunchAuditStatus,
} from "@/lib/first-phase-launch-audit";
import { createHookProposalPreflight, type HookProposalPreflightCheck } from "@/lib/hook-proposal-preflight";
import { createActiveHookProjects } from "@/lib/hook-projects";
import { ledgerEventsByRecency } from "@/lib/ledger";
import { createLaunchPacket } from "@/lib/launch-packet";
import { createLaunchStatusDraft } from "@/lib/launch-status-draft";
import { createParticipationGuideDraft } from "@/lib/participation-guide-draft";
import { createParticipationAccessSnapshot, normalizeParticipationGates } from "@/lib/participation-gates";
import { createPhaseChecklist, type PhaseChecklistStatus } from "@/lib/phase-checklist";
import { createPhaseNextAction, type PhaseNextActionStatus } from "@/lib/phase-next-action";
import { firstPhaseScopeInventory } from "@/lib/phase-scope";
import { selectPhaseWork } from "@/lib/phase-work";
import { createRoomFeed } from "@/lib/room-feed";
import { hookParameterPolicySummary } from "@/lib/safety/hook-parameter-policy";
import { setupValidationNotice, type SetupValidation } from "@/lib/setup-validation";
import { toolPolicyForKind } from "@/lib/safety/tool-policy";
import { createWaveUpdateDraft } from "@/lib/wave-update-draft";

type CommandKindOption = { value: CommandKind; label: string; description: string };
type ProposalTypeOption = {
  kind: CommandKind;
  label: string;
  title: string;
  request: string;
  limits: string;
  requestLabel: string;
  limitsLabel: string;
  requestPlaceholder: string;
  limitsPlaceholder: string;
};

const commandKinds: CommandKindOption[] = [
  { value: "read_context", label: commandKindLabel("read_context"), description: "Summarize or inspect wave/repo state." },
  { value: "draft_response", label: commandKindLabel("draft_response"), description: "Draft text without posting it." },
  { value: "post_to_wave", label: commandKindLabel("post_to_wave"), description: "Draft a public update for human posting." },
  { value: "open_pr", label: commandKindLabel("open_pr"), description: "Use an agent harness to change code." },
  { value: "run_script", label: commandKindLabel("run_script"), description: "Execute an approved script or workflow." },
  { value: "deploy", label: commandKindLabel("deploy"), description: "Promote an approved change." },
  { value: "spend_money", label: commandKindLabel("spend_money"), description: "Use paid APIs, compute, bounties, or funds." },
  { value: "change_rules", label: commandKindLabel("change_rules"), description: "Modify governance or tool permissions." },
];

const firstPhaseProposalKindValues: CommandKind[] = ["open_pr", "draft_response", "post_to_wave", "read_context"];
const firstPhaseProposalKinds = firstPhaseProposalKindValues
  .map((value) => commandKinds.find((item) => item.value === value))
  .filter((item): item is CommandKindOption => Boolean(item));
const defaultProposalTitle = "Add fee cap tests";
const defaultProposalRequest =
  "Add tests that prove the 6529 hook fee parameter cannot exceed 100 bps and that zero fee still works.";
const defaultProposalLimits =
  "Test-only PR for the current hook contract. Keep the hook immutable. No deploy scripts, payments, owner changes, role changes, proxy, or delegatecall. Include bound-focused tests for the 100 bps max fee.";
const proposalTypeOptions: ProposalTypeOption[] = [
  {
    kind: "open_pr",
    label: "Code PR",
    title: defaultProposalTitle,
    request: defaultProposalRequest,
    limits: defaultProposalLimits,
    requestLabel: "Change",
    limitsLabel: "Boundaries and tests",
    requestPlaceholder: "Describe the exact hook change.",
    limitsPlaceholder: "Name caps, tests, and anything out of scope.",
  },
  {
    kind: "draft_response",
    label: "Question",
    title: "Clarify fee cap options",
    request: "Compare the simplest fee cap options for the hook and list the tradeoffs builders should discuss.",
    limits: "Keep it short. Do not propose code, deployment, ownership changes, or uncapped parameters.",
    requestLabel: "Question",
    limitsLabel: "Answer limits",
    requestPlaceholder: "Ask what builders should discuss or decide.",
    limitsPlaceholder: "Name what the answer should include or avoid.",
  },
  {
    kind: "post_to_wave",
    label: "Update",
    title: "Share current hook status",
    request: "Summarize the current hook change, decision status, PR status, and next move for the room.",
    limits: "Post manually. Do not claim a merge, deploy, payment, live REP gate, or final decision unless it is recorded.",
    requestLabel: "Update",
    limitsLabel: "Posting limits",
    requestPlaceholder: "Describe the room update to draft.",
    limitsPlaceholder: "Name claims to include or avoid.",
  },
  {
    kind: "read_context",
    label: "Context",
    title: "Read latest hook context",
    request: "Read the latest room activity and repo state, then summarize what changed and what needs attention.",
    limits: "Read only. Do not write posts, open PRs, run scripts, deploy, spend funds, or change rules.",
    requestLabel: "Context request",
    limitsLabel: "Read limits",
    requestPlaceholder: "Ask what context the room needs.",
    limitsPlaceholder: "Name what should stay out of scope.",
  },
];

const hookGuardrails = [
  "No upgradeable hook contracts by default.",
  ...hookParameterPolicySummary.slice(1),
  "Deployment, payments, and governance changes stay human controlled.",
  "Contribution report scores are not permissions.",
];
const buildRoomRules = [
  "Start with one small hook change.",
  "Talk in the builder room before code work starts.",
  "The orchestration agent labels risk and keeps work inside the rules.",
  "Important changes need a visible decision before a PR is built.",
  "The reviewer agent checks the PR before humans merge.",
];
const roomRuleSummary =
  "Talk first. Important code waits for approval. Humans review and merge.";
const publicLaunchSetupItems = [
  ["NEXT_PUBLIC_APP_URL", "Deployed app URL for public proof links."],
  ["ADMIN_API_KEY", "Protects setup, proposal, vote, run, review, and reset actions."],
  ["6529_MOCK_MODE=false", "Uses live 6529 reads instead of local mock data."],
  ["COMMAND_WAVE_STATE_URL", "Gives guardian PR checks the public room state."],
];
const hookProposalCheckPriority = [
  "hook_proposal_blocked_language",
  "hook_parameter_explicit_bound",
  "hook_parameter_bound_tests",
  "hook_parameter_live_holder_authority",
  "hook_parameter_immutable_default",
  "hook_parameter_not_requested",
];

function hookProposalCheckWeight(check: HookProposalPreflightCheck) {
  const index = hookProposalCheckPriority.indexOf(check.id);

  return index === -1 ? hookProposalCheckPriority.length : index;
}

function visibleHookProposalPreflightChecks(checks: HookProposalPreflightCheck[], failedOnly: boolean) {
  const filtered = failedOnly ? checks.filter((check) => check.status === "fail") : checks;

  return [...filtered]
    .sort((left, right) => hookProposalCheckWeight(left) - hookProposalCheckWeight(right))
    .slice(0, 4);
}

function shortTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function cloneDemoWave(): CommandWave {
  return JSON.parse(JSON.stringify(demoWave)) as CommandWave;
}

type WaveApiResponse = ApiErrorPayload & {
  wave?: CommandWave;
};

type WaveContextPreview = {
  waveId: string;
  dropCount: number;
  fromDropId: string | null;
  toDropId: string | null;
  context: {
    mode: string;
    maxMessages: number;
    searchedMessages: number;
    hitCap: boolean;
    sources: Array<{
      waveId: string;
      label: string;
      name: string | null;
      dropCount: number;
      hitCap: boolean;
    }>;
  };
  sampleDrops: Array<{
    id: string;
    url: string | null;
    author: string;
    createdAt: string | null;
    sourceWaveRole: string | null;
    preview: string;
  }>;
};

type ContextPreviewResponse = ApiErrorPayload & {
  preview?: WaveContextPreview;
};

type WaveSearchResult = {
  id: string;
  name: string;
  description: string | null;
  source: "6529";
};

type WaveSearchResponse = ApiErrorPayload & {
  results?: WaveSearchResult[];
};

type RoomPostResponse = ApiErrorPayload & {
  post?: {
    waveId: string;
    dropId: string | null;
    url: string | null;
    mode: "mock" | "live";
  };
};

type SetupValidationResponse = ApiErrorPayload & {
  validation?: SetupValidation;
};

type ReadinessCheck = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  message: string;
};

type ReadinessResponse = ApiErrorPayload & {
  summary: {
    pass: number;
    warn: number;
    fail: number;
  };
  checks: ReadinessCheck[];
};

type CodexWorkPacketResponse = ApiErrorPayload & {
  packet?: {
    proposalId: string;
    targetBranch: string;
    packetHash: string;
    text: string;
  };
};

const accessKeyStorageKey = "command-waves-access-key";
const wavePreviewMaxMessages = 50;
const setupProofPath = "/api/command-wave/setup/proof";
const commandWaveStatePath = "/api/command-wave/state";
const launchAuditPath = "/api/command-wave/launch/audit";
const remoteLaunchAuditPath = `${launchAuditPath}?remote=1`;

async function requestWave(path: string, init?: RequestInit, accessKey?: string) {
  const headers = new Headers(init?.headers);

  headers.set("content-type", "application/json");
  attachAdminApiKey(headers, accessKey);

  const response = await fetch(path, {
    ...init,
    headers,
  });
  const payload = (await response.json()) as WaveApiResponse;

  if (!response.ok || !payload.wave) {
    throw new Error(formatApiError(payload, "Project request failed."));
  }

  return payload.wave;
}

async function requestContextPreview(waveId: string) {
  const response = await fetch("/api/6529/context/preview", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      waveId,
      includeAllHistory: true,
      maxMessages: wavePreviewMaxMessages,
    }),
  });
  const payload = (await response.json()) as ContextPreviewResponse;

  if (!response.ok || !payload.preview) {
    throw new Error(formatApiError(payload, "Context preview failed."));
  }

  return payload.preview;
}

async function requestRoomPost(waveUrl: string, content: string, accessKey?: string) {
  const headers = new Headers();

  headers.set("content-type", "application/json");
  attachAdminApiKey(headers, accessKey);

  const response = await fetch("/api/6529/room-post", {
    method: "POST",
    headers,
    body: JSON.stringify({
      waveUrl,
      content,
    }),
  });
  const payload = (await response.json()) as RoomPostResponse;

  if (!response.ok || !payload.post) {
    throw new Error(formatApiError(payload, "Room post failed."));
  }

  return payload.post;
}

function contextModeLabel(preview: WaveContextPreview) {
  if (preview.context.mode === "all" && preview.context.maxMessages <= wavePreviewMaxMessages) {
    return "latest";
  }

  return preview.context.mode === "all" ? "all history" : preview.context.mode;
}

function postCountLabel(count: number) {
  return `${count} ${count === 1 ? "post" : "posts"}`;
}

async function requestWaveSearch(query: string) {
  const response = await fetch(`/api/6529/waves/search?q=${encodeURIComponent(query)}&limit=6`);
  const payload = (await response.json()) as WaveSearchResponse;

  if (!response.ok || !payload.results) {
    throw new Error(formatApiError(payload, "Room search failed."));
  }

  return payload.results;
}

async function requestSetupValidation(waveUrl: string, repoUrl: string) {
  const response = await fetch("/api/command-wave/setup/validate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ waveUrl, repoUrl }),
  });
  const payload = (await response.json()) as SetupValidationResponse;

  if (!response.ok || !payload.validation) {
    throw new Error(formatApiError(payload, "Setup check failed."));
  }

  return payload.validation;
}

async function requestReadiness() {
  const response = await fetch("/api/readiness", {
    headers: { accept: "application/json" },
  });
  const payload = (await response.json()) as ReadinessResponse;

  if (!response.ok || !payload.checks) {
    throw new Error(formatApiError(payload, "Readiness check failed."));
  }

  return payload;
}

async function requestCodexWorkPacket(proposalId: string, accessKey?: string) {
  const headers = new Headers();

  headers.set("content-type", "application/json");
  attachAdminApiKey(headers, accessKey);

  const response = await fetch("/api/command-wave/codex-packet", {
    method: "POST",
    headers,
    body: JSON.stringify({ proposalId }),
  });
  const payload = (await response.json()) as CodexWorkPacketResponse;

  if (!response.ok || !payload.packet) {
    throw new Error(formatApiError(payload, "Codex work packet failed."));
  }

  return payload.packet;
}

type BusyState =
  | "loading"
  | "saving"
  | "setup"
  | "readiness"
  | "search"
  | "context"
  | "roomPost"
  | "proposal"
  | "vote"
  | "decision"
  | "codex"
  | "execute"
  | "review"
  | "reset";

function riskClass(risk: string) {
  if (risk === "critical") {
    return "border-red-700 bg-red-950/45 text-red-100";
  }

  if (risk === "high") {
    return "border-orange-700 bg-orange-950/45 text-orange-100";
  }

  if (risk === "medium") {
    return "border-amber-700 bg-amber-950/45 text-amber-100";
  }

  return "border-emerald-700 bg-emerald-950/45 text-emerald-100";
}

function statusClass(status: string) {
  if (["approved", "passed", "complete", "pass"].includes(status)) {
    return "border-emerald-700 bg-emerald-950/45 text-emerald-100";
  }

  if (["rejected", "failed", "blocked", "rule_violation"].includes(status)) {
    return "border-red-700 bg-red-950/45 text-red-100";
  }

  if (["executing", "reviewing", "running", "open"].includes(status)) {
    return "border-cyan-700 bg-cyan-950/45 text-cyan-100";
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-200";
}

function checkStatusClass(status: "pass" | "warn" | "fail") {
  if (status === "pass") {
    return statusClass("pass");
  }

  if (status === "fail") {
    return statusClass("failed");
  }

  return riskClass("medium");
}

function phaseStatusClass(status: PhaseChecklistStatus) {
  if (status === "done") {
    return statusClass("complete");
  }

  if (status === "blocked") {
    return statusClass("blocked");
  }

  if (status === "active") {
    return statusClass("reviewing");
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-400";
}

function progressStatusClass(status: BuildTimelineStatus | HookProgressStatus) {
  if (status === "done") {
    return statusClass("complete");
  }

  if (status === "current") {
    return statusClass("reviewing");
  }

  if (status === "blocked") {
    return statusClass("blocked");
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-400";
}

function nextActionStatusClass(status: PhaseNextActionStatus) {
  if (status === "ready") {
    return statusClass("pass");
  }

  if (status === "blocked") {
    return statusClass("failed");
  }

  if (status === "action") {
    return statusClass("reviewing");
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-400";
}

function launchAuditStatusClass(status: FirstPhaseLaunchAuditStatus) {
  if (status === "ready") {
    return statusClass("pass");
  }

  if (status === "blocked") {
    return statusClass("failed");
  }

  return riskClass("medium");
}

function launchAuditItemClass(status: FirstPhaseLaunchAuditItemStatus) {
  if (status === "ready") {
    return statusClass("pass");
  }

  if (status === "blocked") {
    return statusClass("failed");
  }

  return riskClass("medium");
}

function isLaunchAuditEvidenceItem(item: FirstPhaseLaunchAuditItem) {
  return (
    item.id === "flow_wave_decision_receipt" ||
    item.id === "flow_audit_packet" ||
    item.source === "setup" ||
    item.source === "readiness"
  );
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-semibold ${className}`}>
      {children}
    </span>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/75 p-4 shadow-sm shadow-black/20">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="text-sm font-semibold uppercase tracking-normal text-cyan-300">{eyebrow}</p> : null}
          <h2 className="text-xl font-semibold text-zinc-50">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function CompactList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-black p-3">
      <p className="text-sm font-semibold uppercase tracking-normal text-zinc-500">{title}</p>
      <ul className="mt-2 grid gap-2 text-base leading-7 text-zinc-400">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-base font-semibold text-zinc-200">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-md border border-zinc-800 bg-black px-4 text-base font-normal text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-500 ${props.className ?? ""}`}
    />
  );
}

function Textarea({
  inputRef,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { inputRef?: React.Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      {...props}
      ref={inputRef}
      className={`min-h-28 w-full resize-y rounded-md border border-zinc-800 bg-black px-4 py-3 text-base font-normal leading-7 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-500 ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-12 w-full rounded-md border border-zinc-800 bg-black px-4 text-base font-normal text-zinc-100 outline-none transition focus:border-cyan-500 ${props.className ?? ""}`}
    />
  );
}

function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const variantClass =
    variant === "danger"
      ? "border-red-700 bg-red-600 text-white hover:bg-red-500"
      : variant === "secondary"
        ? "border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
        : "border-cyan-400 bg-cyan-300 text-zinc-950 hover:bg-cyan-200";

  return (
    <button
      {...props}
      className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-md border px-4 text-base font-semibold transition disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 ${variantClass} ${className}`}
    />
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-4 text-base font-semibold text-zinc-100 transition hover:bg-zinc-800"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}

function JumpLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-4 text-base font-semibold text-zinc-100 transition hover:bg-zinc-800"
      href={href}
    >
      {children}
    </a>
  );
}

function memberProfileUrl(identity: string) {
  const handle = identity.trim().replace(/^@/, "");

  return `https://6529.io/${encodeURIComponent(handle || "6529")}`;
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function openBlankDiscussionTab() {
  const tab = window.open("about:blank", "_blank");

  if (tab) {
    tab.opener = null;
  }

  return tab;
}

function openDiscussionInTab(tab: Window | null, url: string) {
  if (!tab) {
    return false;
  }

  tab.location.href = url;
  return true;
}

function appUrl(path: string) {
  if (typeof window === "undefined") {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}

function appUrlFromOrigin(path: string, origin: string) {
  return origin ? new URL(path, origin).toString() : path;
}

function subscribeToStaticOrigin() {
  return () => {};
}

function appOriginSnapshot() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

function emptyAppOriginSnapshot() {
  return "";
}

function modeLabel(mode: string) {
  if (mode === "auto") {
    return "can run";
  }

  if (mode === "poll") {
    return "needs vote";
  }

  if (mode === "blocked") {
    return "parked";
  }

  return mode;
}

function eventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    wave_created: "project created",
    rules_defined: "setup updated",
    proposal_submitted: "work proposed",
    rule_check: "safety check",
    poll_opened: "vote opened",
    poll_passed: "vote passed",
    execution_started: "run started",
    execution_logged: "run logged",
    guardian_reviewed: "review recorded",
  };

  return labels[type] ?? type.replaceAll("_", " ");
}

function artifactLabel(artifact: string) {
  if (artifact.startsWith("run-manifest:")) {
    return "run manifest recorded";
  }

  if (artifact.startsWith("agent-handoff:")) {
    return "agent handoff recorded";
  }

  if (artifact.startsWith("rules ")) {
    return "rules hash recorded";
  }

  if (artifact.startsWith("permissions ")) {
    return "tool permissions recorded";
  }

  if (artifact.startsWith("head ")) {
    return "head commit recorded";
  }

  if (artifact.startsWith("https://github.com/")) {
    return "PR link recorded";
  }

  if (artifact === "PR body includes Command Waves manifest") {
    return "PR manifest in body";
  }

  return artifact;
}

function countLabel(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

export function CommandWavesConsole() {
  const [wave, setWave] = useState<CommandWave>(() => cloneDemoWave());
  const [waveUrl, setWaveUrl] = useState(wave.waveUrl);
  const [repoUrl, setRepoUrl] = useState(wave.repoUrl);
  const [gateNotes, setGateNotes] = useState(() => wave.gates.join("\n"));
  const [waveSearchQuery, setWaveSearchQuery] = useState("");
  const [waveSearchResults, setWaveSearchResults] = useState<WaveSearchResult[]>([]);
  const [accessKey, setAccessKey] = useState(() =>
    typeof window === "undefined" ? "" : window.sessionStorage.getItem(accessKeyStorageKey) ?? "",
  );
  const [proposer, setProposer] = useState("david");
  const [kind, setKind] = useState<CommandKind>("open_pr");
  const [title, setTitle] = useState(defaultProposalTitle);
  const [prompt, setPrompt] = useState(defaultProposalRequest);
  const [spec, setSpec] = useState(defaultProposalLimits);
  const [budgetUsd, setBudgetUsd] = useState("10");
  const [decisionReference, setDecisionReference] = useState("");
  const [apiBusy, setApiBusy] = useState<BusyState | null>(null);
  const [apiNotice, setApiNotice] = useState("Project state is loading.");
  const [apiError, setApiError] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const [contributionReportNotice, setContributionReportNotice] = useState("");
  const [developerFeePlanNotice, setDeveloperFeePlanNotice] = useState("");
  const [waveRoomNotice, setWaveRoomNotice] = useState("");
  const [roomPostUrl, setRoomPostUrl] = useState("");
  const [waveRoomMessage, setWaveRoomMessage] = useState("");
  const [selectedMemberIdentity, setSelectedMemberIdentity] = useState("");
  const [launchBriefNotice, setLaunchBriefNotice] = useState("");
  const [participationGuideNotice, setParticipationGuideNotice] = useState("");
  const [launchStatusNotice, setLaunchStatusNotice] = useState("");
  const [launchLinkNotice, setLaunchLinkNotice] = useState("");
  const [decisionDraftNotice, setDecisionDraftNotice] = useState("");
  const [proposalDraftNotice, setProposalDraftNotice] = useState("");
  const [reviewRequestNotice, setReviewRequestNotice] = useState("");
  const [codexPacketNotice, setCodexPacketNotice] = useState("");
  const [projectContextPreviews, setProjectContextPreviews] = useState<Record<string, WaveContextPreview>>({});
  const [setupContextPreview, setSetupContextPreview] = useState<WaveContextPreview | null>(null);
  const [setupValidation, setSetupValidation] = useState<SetupValidation | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [setupControlsOpen, setSetupControlsOpen] = useState(false);
  const [readinessControlsOpen, setReadinessControlsOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [hookDetailsOpen, setHookDetailsOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [buildersOpen, setBuildersOpen] = useState(false);
  const publicAppOrigin = useSyncExternalStore(subscribeToStaticOrigin, appOriginSnapshot, emptyAppOriginSnapshot);
  const setupControlsRef = useRef<HTMLDetailsElement>(null);
  const suggestRef = useRef<HTMLDetailsElement>(null);
  const hookDetailsRef = useRef<HTMLDetailsElement>(null);
  const activityRef = useRef<HTMLDetailsElement>(null);
  const buildersRef = useRef<HTMLDetailsElement>(null);
  const waveUpdateDraftRef = useRef<HTMLTextAreaElement>(null);
  const autoPreviewKeysRef = useRef<Set<string>>(new Set());
  const selectedRule = wave.rules.rulesByKind[kind];
  const selectedProposalType = proposalTypeOptions.find((item) => item.kind === kind) ?? proposalTypeOptions[0];
  const classifiedRisk = useMemo(() => classifyRisk(kind, prompt), [kind, prompt]);
  const hookProposalPreflight = useMemo(
    () => createHookProposalPreflight({ command: prompt, criteria: spec }),
    [prompt, spec],
  );
  const hookProposalPreflightRequired = kind === "open_pr";
  const hookProposalPreflightBlocked = hookProposalPreflightRequired && hookProposalPreflight.status === "fail";
  const visibleHookProposalChecks = visibleHookProposalPreflightChecks(
    hookProposalPreflight.checks,
    hookProposalPreflightBlocked,
  );
  const firstHookProposalFailure = hookProposalPreflight.checks.find((check) => check.status === "fail") ?? null;
  const simpleDecisionRoute =
    selectedRule.mode === "poll" ? "Needs a decision" : selectedRule.mode === "auto" ? "Can be logged" : "Parked";
  const simplePreflightMessage =
    hookProposalPreflightRequired && hookProposalPreflightBlocked && firstHookProposalFailure
      ? firstHookProposalFailure.message
      : hookProposalPreflightRequired
        ? hookProposalPreflight.summary
        : "This support message does not open a PR.";
  const phaseWork = useMemo(() => selectPhaseWork(wave), [wave]);
  const activeProposal = phaseWork.prProposal ?? phaseWork.supportProposals[0] ?? null;
  const activePoll = activeProposal
    ? activeProposal.kind === "open_pr"
      ? phaseWork.prPoll
      : (wave.polls.find((poll) => poll.proposalId === activeProposal.id) ?? null)
    : null;
  const activeOrchestrationSummary = useMemo(
    () =>
      createCommandOrchestrationSummary({
        wave,
        proposal: activeProposal,
        poll: activePoll,
      }),
    [activePoll, activeProposal, wave],
  );
  const activeExecution = activeProposal
    ? activeProposal.kind === "open_pr"
      ? phaseWork.prExecution
      : (wave.executions.find((execution) => execution.proposalId === activeProposal.id) ?? null)
    : null;
  const activeExecutionPrUrl =
    activeExecution?.artifacts.find((artifact) =>
      /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+(?:[?#][^\s]*)?$/.test(artifact),
    ) ?? null;
  const activeReview = activeProposal
    ? activeProposal.kind === "open_pr"
      ? phaseWork.prReview
      : (wave.reviews.find((review) => review.proposalId === activeProposal.id) ?? null)
    : null;
  const readyForNextHookChange = activeReview?.status === "pass";
  const supportProposals = phaseWork.supportProposals.filter((proposal) => proposal.id !== activeProposal?.id);
  const visibleSupportProposals = supportProposals.slice(0, 3);
  const activeProposalIsPr = activeProposal?.kind === "open_pr";
  const activeSupportProposal = activeProposal && !activeProposalIsPr ? activeProposal : null;
  const activeSupportProposalLabel = activeSupportProposal
    ? (proposalTypeOptions.find((item) => item.kind === activeSupportProposal.kind)?.label ?? commandKindLabel(activeSupportProposal.kind))
    : "";
  const activeDecisionReferenceCheck = activePoll?.decision
    ? validateWaveDecisionReference({
        reference: activePoll.decision.url ?? activePoll.decision.dropId ?? "",
        waveUrl: wave.waveUrl,
        requireUrl: Boolean(activeProposalIsPr),
      })
    : null;
  const activePrHasWaveDecision = Boolean(
    activeProposalIsPr && pollApprovalPassedForWave(activePoll ?? null, wave.waveUrl, { requireUrl: true }),
  );
  const decisionReferencePlaceholder = activeProposalIsPr ? "6529 decision URL" : "6529 decision URL or drop id";
  const activePollNeedsWaveDecision = Boolean(
    activePoll?.status === "passed" && (!activePoll.decision || activeDecisionReferenceCheck?.ok === false),
  );
  const activePollDecisionRecorded = Boolean(activePoll?.decision && activeDecisionReferenceCheck?.ok !== false);
  const activePollCanVote = activePoll?.status === "open";
  const showDecisionRecorder = Boolean(activePoll && activePollNeedsWaveDecision);
  const activePollTitle = activePollNeedsWaveDecision
    ? "6529 decision needed"
    : activePollDecisionRecorded
      ? "6529 decision recorded"
      : activePoll?.status === "failed"
        ? "Vote failed"
        : activePoll?.status === "passed"
          ? "Vote passed"
          : "Vote open";
  const activePollDetail = activePollNeedsWaveDecision
    ? "Local vote passed. Record the 6529 decision receipt before work runs."
    : activePollDecisionRecorded
      ? `6529 decision recorded after ${activePoll?.yesVotes ?? 0} yes and ${activePoll?.noVotes ?? 0} no.`
      : `Local tally: ${activePoll?.yesVotes ?? 0} yes, ${activePoll?.noVotes ?? 0} no. Needs ${
          activePoll?.quorumRequired ?? 0
        } total votes and ${activePoll?.yesPercentRequired ?? 0}% yes.`;
  const currentBuildStatusLabel = readyForNextHookChange
    ? "needs room input"
    : activeExecution
      ? "PR logged"
      : activePollDecisionRecorded
        ? "decision recorded"
        : activePollNeedsWaveDecision
          ? "decision receipt needed"
          : activePoll?.status === "open"
            ? "decision open"
            : activeSupportProposal
              ? `${activeSupportProposalLabel.toLowerCase()} recorded`
            : activeProposal
              ? "proposal ready"
              : "waiting";
  const currentBuildStatusClass =
    readyForNextHookChange
      ? statusClass("reviewing")
      : activeExecution
        ? statusClass("complete")
        : activePollDecisionRecorded
          ? statusClass("complete")
          : activePollNeedsWaveDecision || activePoll?.status === "open"
            ? riskClass("medium")
            : activeProposal
              ? statusClass(activeProposal.status)
              : "border-zinc-700 bg-zinc-900 text-zinc-400";
  const currentFocusTitle =
    readyForNextHookChange
      ? title.trim() || "Pick the next hook change"
      : activeProposal?.title ?? "Pick the next hook change";
  const currentFocusDescription =
    readyForNextHookChange
      ? "Bring this draft to the room before saving it as a proposal."
      : activeProposal
        ? humanizeLegacyCommandCopy(activeProposal.prompt)
        : "Start with one small change builders can discuss and review.";
  const canBuildApprovedPr = Boolean(
    activeProposal &&
      activeProposal.kind === "open_pr" &&
      activeProposal.status === "approved" &&
      activePrHasWaveDecision &&
      !activeExecution,
  );
  const showBuildAction = Boolean(activeProposalIsPr && !activeExecution);
  const canRunReview = Boolean(activeExecution && activeProposal?.status === "reviewing" && !activeReview);
  const canCopyCodexPacket = Boolean(
    activeProposal &&
      activeProposalIsPr &&
      activePrHasWaveDecision &&
      !activeExecution &&
      ["approved", "reviewing", "complete"].includes(activeProposal.status),
  );
  const pollResult = activePoll ? evaluatePoll(activePoll) : null;
  const phaseChecklist = useMemo(() => createPhaseChecklist(wave), [wave]);
  const phaseNextAction = useMemo(() => createPhaseNextAction(phaseChecklist), [phaseChecklist]);
  const activeHookProjects = useMemo(() => createActiveHookProjects(wave), [wave]);
  const primaryHookProject = activeHookProjects[0] ?? null;
  const participationGateNotes = useMemo(() => normalizeParticipationGates(wave.gates), [wave.gates]);
  const participationAccess = useMemo(() => createParticipationAccessSnapshot(wave.gates), [wave.gates]);
  const primaryProjectContextPreview = primaryHookProject
    ? (projectContextPreviews[primaryHookProject.id] ?? null)
    : null;
  const hasRecentDiscussionPosts = Boolean(primaryProjectContextPreview?.sampleDrops.length);
  const roomRosterPosts = useMemo(
    () =>
      (primaryProjectContextPreview?.sampleDrops ?? []).map((drop) => ({
        author: drop.author,
        preview: drop.preview,
        createdAt: drop.createdAt,
      })),
    [primaryProjectContextPreview],
  );
  const contributionReport = useMemo(
    () => createContributionReport(wave, { roomPosts: roomRosterPosts }),
    [roomRosterPosts, wave],
  );
  const contributionReportDraft = useMemo(
    () => createContributionReportDraft(wave, { roomPosts: roomRosterPosts }),
    [roomRosterPosts, wave],
  );
  const developerFeePlan = useMemo(() => createDeveloperFeePlan(wave, contributionReport), [wave, contributionReport]);
  const developerFeePlanDraft = useMemo(
    () => createDeveloperFeePlanDraft(wave, contributionReport),
    [contributionReport, wave],
  );
  const builderRoster = useMemo(() => createBuilderRoster(contributionReport), [contributionReport]);
  const roomFeed = useMemo(
    () =>
      createRoomFeed(wave, {
        title,
        prompt,
        proposer,
      }),
    [prompt, proposer, title, wave],
  );
  const completedPhaseCount = phaseChecklist.filter((item) => item.status === "done").length;
  const launchAudit = useMemo(
    () =>
      createFirstPhaseLaunchAudit({
        phaseChecklist,
        readinessChecks: readiness?.checks ?? null,
        setupValidation,
        wave,
      }),
    [phaseChecklist, readiness, setupValidation, wave],
  );
  const launchAuditOpenItems = launchAudit.openItems.slice(0, 5);
  const launchAuditReadyEvidence = launchAudit.readyItems.filter(isLaunchAuditEvidenceItem).slice(0, 5);
  const launchVerificationTargets = useMemo(
    () => ({
      setupProofUrl: appUrlFromOrigin(setupProofPath, publicAppOrigin),
      commandWaveStateUrl: appUrlFromOrigin(commandWaveStatePath, publicAppOrigin),
      launchAuditUrl: appUrlFromOrigin(remoteLaunchAuditPath, publicAppOrigin),
    }),
    [publicAppOrigin],
  );
  const launchStatusDraft = useMemo(
    () =>
      createLaunchStatusDraft({
        wave,
        audit: launchAudit,
        verificationTargets: launchVerificationTargets,
      }),
    [launchAudit, launchVerificationTargets, wave],
  );
  const waveUpdateDraft = useMemo(
    () =>
      createWaveUpdateDraft({
        wave,
        proposal: activeProposal ?? null,
        poll: activePoll ?? null,
        execution: activeExecution ?? null,
        review: activeReview ?? null,
        verificationTargets: launchVerificationTargets,
      }),
    [activeExecution, activePoll, activeProposal, activeReview, launchVerificationTargets, wave],
  );
  const setupDraftWave = useMemo<CommandWave>(
    () => ({
      ...wave,
      waveUrl,
      repoUrl,
      gates: gateNotes.split("\n"),
    }),
    [gateNotes, repoUrl, wave, waveUrl],
  );
  const builderWaveLaunchDraft = useMemo(() => createBuilderWaveLaunchDraft(setupDraftWave), [setupDraftWave]);
  const participationGuideDraft = useMemo(() => createParticipationGuideDraft(setupDraftWave), [setupDraftWave]);
  const builderWaveChatDraft = useMemo(
    () => createBuilderWaveChatDraft(wave, phaseNextAction, waveRoomMessage),
    [phaseNextAction, wave, waveRoomMessage],
  );
  const roomPostTargetUrl = primaryHookProject?.waveUrl ?? wave.waveUrl;
  const hasRoomMessage = Boolean(waveRoomMessage.trim());
  const canPostRoomMessage = Boolean(hasRoomMessage && roomPostTargetUrl);
  const builderWaveQuickPosts = useMemo(
    () => createBuilderWaveQuickPosts({ handle: proposer, title: currentFocusTitle }),
    [currentFocusTitle, proposer],
  );
  const builderWaveProposalDraft = useMemo(
    () =>
      createBuilderWaveProposalDraft({
        wave,
        title,
        proposer,
        kind,
        request: prompt,
        limits: spec,
        budgetUsd,
        risk: classifiedRisk,
        decisionRoute: modeLabel(selectedRule.mode),
        ruleReason: selectedRule.reason,
      }),
    [budgetUsd, classifiedRisk, kind, prompt, proposer, selectedRule.mode, selectedRule.reason, spec, title, wave],
  );
  const builderWaveDecisionDraft = useMemo(
    () =>
      activeProposal
        ? createBuilderWaveDecisionDraft({
            wave,
            proposal: activeProposal,
            poll: activePoll ?? null,
          })
        : "",
    [activePoll, activeProposal, wave],
  );
  const builderWaveReviewRequestDraft = useMemo(
    () =>
      activeProposal
        ? createBuilderWaveReviewRequestDraft({
            wave,
            proposal: activeProposal,
            execution: activeExecution ?? null,
          })
        : "",
    [activeExecution, activeProposal, wave],
  );
  const launchPacket = useMemo(
    () =>
      createLaunchPacket({
        wave,
        proposal: activeProposal ?? null,
        poll: activePoll ?? null,
        execution: activeExecution ?? null,
        review: activeReview ?? null,
        verificationTargets: launchVerificationTargets,
      }),
    [activeExecution, activePoll, activeProposal, activeReview, launchVerificationTargets, wave],
  );
  const visibleReviewChecks = activeReview?.checks.slice(0, 4) ?? [];
  const hiddenReviewChecks = activeReview?.checks.slice(visibleReviewChecks.length) ?? [];
  const buildTimeline = useMemo(() => createBuildTimeline(wave, title), [title, wave]);
  const roomStatusItems = useMemo(() => createHookProgress(wave, title), [title, wave]);
  const orderedLedgerEvents = useMemo(() => ledgerEventsByRecency(wave.ledger), [wave.ledger]);
  const isBusy = apiBusy !== null;
  const showApiNotice = Boolean(apiError || isBusy || apiNotice !== "Project state loaded.");
  const launchNextActionItemId = launchAudit.nextAction.itemId;
  const launchActionRunsSetup = launchNextActionItemId === "setup_not_checked" || launchNextActionItemId === "setup_remote_check";
  const launchActionRunsReadiness = launchNextActionItemId === "readiness_not_checked";
  const launchActionButtonText = launchActionRunsSetup
    ? apiBusy === "setup"
      ? "Checking"
      : "Run setup check"
    : launchActionRunsReadiness
      ? apiBusy === "readiness"
        ? "Checking"
        : "Check readiness"
      : "Open launch controls";
  const roomNeedLabel = readyForNextHookChange
    ? "Room input"
    : activePollCanVote
      ? "Decision needed"
      : showDecisionRecorder
        ? "Add decision URL"
        : showBuildAction
          ? activePrHasWaveDecision
            ? "Build PR"
            : "Decision URL needed"
          : canRunReview
            ? "Review PR"
            : activeSupportProposal
              ? "Discuss support"
            : activeProposal
              ? "Keep moving"
              : "Pick a change";
  const roomNeedDetail = readyForNextHookChange
    ? "Get feedback on scope, then save the proposal."
    : activePollCanVote
      ? "Ask the room for a visible decision before code work starts."
      : showDecisionRecorder
        ? "Record the 6529 decision URL so the PR has a source of truth."
        : showBuildAction
          ? activePrHasWaveDecision
            ? "Use the approved packet and attach the PR record."
            : "Record the 6529 decision URL before PR work starts."
          : canRunReview
            ? "Check the PR against the approved proposal and room rules."
            : activeSupportProposal
              ? `${activeSupportProposalLabel} is recorded. Use the room to discuss it or propose the next code change.`
            : activeProposal
              ? "Follow the next open step for this hook change."
              : "Choose one small hook change the room can discuss.";
  const selectedMember =
    builderRoster.find((member) => member.identity === selectedMemberIdentity) ?? builderRoster[0] ?? null;
  const otherBuilderRoster = selectedMember
    ? builderRoster.filter((member) => member.identity !== selectedMember.identity)
    : builderRoster;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setApiBusy("loading");
      setApiError("");

      requestWave("/api/command-wave", { signal: controller.signal })
        .then((nextWave) => {
          setWave(nextWave);
          setWaveUrl(nextWave.waveUrl);
          setRepoUrl(nextWave.repoUrl);
          setApiNotice("Project state loaded.");
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setApiError(error instanceof Error ? error.message : "Could not load the project.");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setApiBusy(null);
          }
        });
    }, 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const project = activeHookProjects[0];

    if (!project?.waveUrl || projectContextPreviews[project.id]) {
      return;
    }

    const autoPreviewKey = `${project.id}:${project.waveUrl}`;

    if (autoPreviewKeysRef.current.has(autoPreviewKey)) {
      return;
    }

    autoPreviewKeysRef.current.add(autoPreviewKey);

    let isCurrent = true;

    requestContextPreview(project.waveUrl)
      .then((preview) => {
        if (!isCurrent) {
          return;
        }

        setProjectContextPreviews((previews) => ({
          ...previews,
          [project.id]: preview,
        }));
      })
      .catch(() => {
        if (isCurrent) {
          autoPreviewKeysRef.current.delete(autoPreviewKey);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [activeHookProjects, projectContextPreviews]);

  function updateAccessKey(value: string) {
    setAccessKey(value);

    if (value.trim()) {
      window.sessionStorage.setItem(accessKeyStorageKey, value);
    } else {
      window.sessionStorage.removeItem(accessKeyStorageKey);
    }
  }

  function applyWave(nextWave: CommandWave) {
    autoPreviewKeysRef.current.clear();
    setWave(nextWave);
    setWaveUrl(nextWave.waveUrl);
    setRepoUrl(nextWave.repoUrl);
    setGateNotes(nextWave.gates.join("\n"));
    setContributionReportNotice("");
    setDeveloperFeePlanNotice("");
    setWaveRoomNotice("");
    setRoomPostUrl("");
    setProjectContextPreviews({});
    setSetupContextPreview(null);
    setDecisionDraftNotice("");
    setLaunchBriefNotice("");
    setParticipationGuideNotice("");
    setLaunchStatusNotice("");
    setLaunchLinkNotice("");
    setProposalDraftNotice("");
    setReviewRequestNotice("");
    setCodexPacketNotice("");
  }

  async function runWaveAction(busy: BusyState, action: () => Promise<CommandWave>, success: string) {
    setApiBusy(busy);
    setApiError("");

    try {
      const nextWave = await action();

      applyWave(nextWave);
      setApiNotice(success);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Project action failed.");
    } finally {
      setApiBusy(null);
    }
  }

  async function previewContext(targetWaveUrl = waveUrl, target: "project" | "setup" = "setup", projectId?: string) {
    setApiBusy("context");
    setApiError("");

    try {
      const preview = await requestContextPreview(targetWaveUrl);

      if (target === "project") {
        setProjectContextPreviews((previews) => ({
          ...previews,
          [projectId ?? targetWaveUrl]: preview,
        }));
      } else {
        setSetupContextPreview(preview);
      }
      setApiNotice(`Room posts loaded: ${postCountLabel(preview.dropCount)}.`);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Context preview failed.");
    } finally {
      setApiBusy(null);
    }
  }

  async function searchProjectWaves() {
    const query = waveSearchQuery.trim();

    if (query.length < 2) {
      setApiError("Search needs at least 2 characters.");
      return;
    }

    setApiBusy("search");
    setApiError("");

    try {
      const results = await requestWaveSearch(query);

      setWaveSearchResults(results);
      setApiNotice(results.length ? `Found ${results.length} room option${results.length === 1 ? "" : "s"}.` : "No rooms found.");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Room search failed.");
    } finally {
      setApiBusy(null);
    }
  }

  function selectWaveResult(result: WaveSearchResult) {
    setWaveUrl(`https://6529.io/waves/${result.id}`);
    setSetupContextPreview(null);
    setSetupValidation(null);
    setApiNotice(`Selected ${result.name}.`);
  }

  async function checkSetup() {
    setApiBusy("setup");
    setApiError("");

    try {
      const validation = await requestSetupValidation(waveUrl, repoUrl);

      setSetupValidation(validation);
      setApiNotice(setupValidationNotice(validation));
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Setup check failed.");
    } finally {
      setApiBusy(null);
    }
  }

  async function checkReadiness() {
    setReadinessControlsOpen(true);
    setApiBusy("readiness");
    setApiError("");

    try {
      const result = await requestReadiness();

      setReadiness(result);
      setApiNotice(`Readiness checked: ${result.summary.fail} fail, ${result.summary.warn} warn.`);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Readiness check failed.");
    } finally {
      setApiBusy(null);
    }
  }

  function saveSetup() {
    void runWaveAction(
      "saving",
      () =>
        requestWave("/api/command-wave", {
          method: "PATCH",
          body: JSON.stringify({
            waveUrl,
            repoUrl,
            gates: gateNotes.split("\n"),
          }),
        }, accessKey),
      "Setup saved.",
    );
  }

  function resetStarterState() {
    void runWaveAction("reset", () => requestWave("/api/command-wave", { method: "DELETE" }, accessKey), "Starter state restored.");
  }

  function openSetupControls() {
    setSetupControlsOpen(true);
    window.requestAnimationFrame(() => {
      setupControlsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openFoldedSection(ref: React.RefObject<HTMLDetailsElement | null>, setOpen: (open: boolean) => void) {
    setOpen(true);
    window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openSuggestSection() {
    openFoldedSection(suggestRef, setSuggestOpen);
  }

  function openActivitySection() {
    openFoldedSection(activityRef, setActivityOpen);
  }

  function openBuildersSection() {
    openFoldedSection(buildersRef, setBuildersOpen);
  }

  function runLaunchNextAction() {
    if (launchActionRunsSetup) {
      openSetupControls();
      void checkSetup();
      return;
    }

    if (launchActionRunsReadiness) {
      openSetupControls();
      void checkReadiness();
      return;
    }

    openSetupControls();
  }

  async function copyWaveUpdateDraft() {
    setApiError("");

    try {
      await navigator.clipboard.writeText(waveUpdateDraftRef.current?.value ?? waveUpdateDraft);
      setCopyNotice("Draft copied.");
      setApiNotice("Room update copied.");
    } catch {
      setCopyNotice("Copy failed. Select the draft text and copy it manually.");
      setApiNotice("Copy failed. Select the room update draft and copy it manually.");
    }
  }

  function resetWaveUpdateDraft() {
    if (waveUpdateDraftRef.current) {
      waveUpdateDraftRef.current.value = waveUpdateDraft;
      setCopyNotice("Draft reset.");
    }
  }

  async function copyBuilderWaveLaunchDraft() {
    try {
      await navigator.clipboard.writeText(builderWaveLaunchDraft);
      setLaunchBriefNotice("Launch brief copied.");
    } catch {
      setLaunchBriefNotice("Copy failed. Select the launch brief text and copy it manually.");
    }
  }

  async function copyParticipationGuideDraft() {
    try {
      await navigator.clipboard.writeText(participationGuideDraft);
      setParticipationGuideNotice("Participation guide copied.");
    } catch {
      setParticipationGuideNotice("Copy failed. Select the participation guide text and copy it manually.");
    }
  }

  async function copyLaunchStatusDraft() {
    try {
      await navigator.clipboard.writeText(launchStatusDraft);
      setLaunchStatusNotice("Launch status copied.");
    } catch {
      setLaunchStatusNotice("Copy failed. Select the launch status manually.");
    }
  }

  async function copyBuilderWaveChatDraft({ openDiscussion = false } = {}) {
    if (!waveRoomMessage.trim()) {
      setWaveRoomNotice("Write a message first.");
      return;
    }

    const discussionTab = openDiscussion && wave.waveUrl ? openBlankDiscussionTab() : null;

    try {
      await navigator.clipboard.writeText(builderWaveChatDraft);
      if (openDiscussion && wave.waveUrl) {
        setWaveRoomNotice(
          openDiscussionInTab(discussionTab, wave.waveUrl)
            ? "Message copied. Opened room."
            : "Message copied. Open the room manually.",
        );
        return;
      }

      setWaveRoomNotice("Message copied.");
    } catch {
      discussionTab?.close();
      setWaveRoomNotice("Copy failed. Select the message and copy it manually.");
    }
  }

  async function postBuilderWaveChatDraft() {
    if (!waveRoomMessage.trim()) {
      setWaveRoomNotice("Write a message first.");
      return;
    }

    if (!roomPostTargetUrl) {
      setWaveRoomNotice("Choose a room before posting.");
      return;
    }

    setApiBusy("roomPost");
    setApiError("");
    setWaveRoomNotice("");
    setRoomPostUrl("");

    try {
      const post = await requestRoomPost(roomPostTargetUrl, builderWaveChatDraft, accessKey);
      let roomPreviewRefreshed = false;

      if (primaryHookProject) {
        try {
          const preview = await requestContextPreview(primaryHookProject.waveUrl);

          setProjectContextPreviews((previews) => ({
            ...previews,
            [primaryHookProject.id]: preview,
          }));
          roomPreviewRefreshed = true;
        } catch {
          roomPreviewRefreshed = false;
        }
      }

      setWaveRoomMessage("");
      setRoomPostUrl(post.url ?? "");
      setWaveRoomNotice(
        `${post.mode === "mock" ? "Posted to the mock room." : "Posted to the room."}${
          roomPreviewRefreshed ? " Room preview refreshed." : ""
        }`,
      );
    } catch (error) {
      setWaveRoomNotice(error instanceof Error ? error.message : "Room post failed.");
    } finally {
      setApiBusy(null);
    }
  }

  function resetBuilderWaveChatDraft() {
    setWaveRoomMessage("");
    setWaveRoomNotice("Message cleared.");
    setRoomPostUrl("");
  }

  function showMemberProfile(identity: string) {
    setSelectedMemberIdentity(identity);
    openBuildersSection();
  }

  function messageMember(identity: string) {
    setWaveRoomMessage(`@${identity} `);
    setWaveRoomNotice("Message draft ready.");
    window.requestAnimationFrame(() => {
      document.getElementById("wave-room")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function discussSupportProposal(proposal: NonNullable<typeof activeSupportProposal>) {
    setWaveRoomMessage([`${activeSupportProposalLabel}: ${proposal.title}`, "", proposal.prompt].join("\n"));
    setWaveRoomNotice("Room draft ready.");
    window.requestAnimationFrame(() => {
      document.getElementById("wave-room")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function proposalTemplateValues() {
    return new Set(proposalTypeOptions.flatMap((item) => [item.title, item.request, item.limits]));
  }

  function chooseProposalType(option: ProposalTypeOption) {
    const templateValues = proposalTemplateValues();

    setKind(option.kind);
    setProposalDraftNotice("");
    setApiError("");
    setTitle((current) => (!current.trim() || templateValues.has(current) ? option.title : current));
    setPrompt((current) => (!current.trim() || templateValues.has(current) ? option.request : current));
    setSpec((current) => (!current.trim() || templateValues.has(current) ? option.limits : current));
  }

  function prepareQuickPost(post: BuilderWaveQuickPost) {
    setWaveRoomMessage(post.message);
    setWaveRoomNotice(`${post.label} draft ready.`);
  }

  function prepareJoinRequest() {
    setWaveRoomMessage(createBuilderWaveJoinDraft(proposer));
    setWaveRoomNotice("Join message ready.");
    window.requestAnimationFrame(() => {
      document.getElementById("wave-room")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function copyBuilderWaveProposalDraft({ openDiscussion = false } = {}) {
    const discussionTab = openDiscussion && wave.waveUrl ? openBlankDiscussionTab() : null;

    try {
      await navigator.clipboard.writeText(builderWaveProposalDraft);
      if (openDiscussion && wave.waveUrl) {
        setProposalDraftNotice(
          openDiscussionInTab(discussionTab, wave.waveUrl)
            ? "Proposal copied. Opened room."
            : "Proposal copied. Open the room manually.",
        );
        return;
      }

      setProposalDraftNotice("Proposal copied.");
    } catch {
      discussionTab?.close();
      setProposalDraftNotice("Copy failed. Select the proposal text and copy it manually.");
    }
  }

  async function copyBuilderWaveDecisionDraft() {
    if (!builderWaveDecisionDraft) {
      return;
    }

    try {
      await navigator.clipboard.writeText(builderWaveDecisionDraft);
      setDecisionDraftNotice("Decision request copied.");
    } catch {
      setDecisionDraftNotice("Copy failed. Select the decision request and copy it manually.");
    }
  }

  async function copyBuilderWaveReviewRequestDraft() {
    if (!builderWaveReviewRequestDraft) {
      return;
    }

    try {
      await navigator.clipboard.writeText(builderWaveReviewRequestDraft);
      setReviewRequestNotice("Review request copied.");
    } catch {
      setReviewRequestNotice("Copy failed. Select the review request and copy it manually.");
    }
  }

  async function copyContributionReportDraft() {
    try {
      await navigator.clipboard.writeText(contributionReportDraft);
      setContributionReportNotice("Report copied.");
    } catch {
      setContributionReportNotice("Copy failed. Select the report text and copy it manually.");
    }
  }

  async function copyDeveloperFeePlanDraft() {
    try {
      await navigator.clipboard.writeText(developerFeePlanDraft);
      setDeveloperFeePlanNotice("Fee plan copied.");
    } catch {
      setDeveloperFeePlanNotice("Copy failed. Select the planning draft and copy it manually.");
    }
  }

  async function copyLaunchUrl(path: string, label: string) {
    try {
      await navigator.clipboard.writeText(appUrl(path));
      setLaunchLinkNotice(`${label} copied.`);
    } catch {
      setLaunchLinkNotice(`Copy failed. Select the ${label.toLowerCase()} manually.`);
    }
  }

  async function copyLaunchPacket() {
    try {
      await navigator.clipboard.writeText(launchPacket.text);
      setCopyNotice("Launch packet copied.");
    } catch {
      setCopyNotice("Copy failed. Select the packet text and copy it manually.");
    }
  }

  async function copyCodexWorkPacket() {
    if (!activeProposal) {
      return;
    }

    setApiBusy("codex");
    setApiError("");
    setCodexPacketNotice("");

    try {
      const packet = await requestCodexWorkPacket(activeProposal.id, accessKey);

      await navigator.clipboard.writeText(packet.text);
      setCodexPacketNotice(`Codex packet copied for ${packet.targetBranch}.`);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Codex packet copy failed.");
    } finally {
      setApiBusy(null);
    }
  }

  function submitProposal() {
    if (hookProposalPreflightBlocked) {
      setApiError("Fix hook proposal preflight before submitting PR work.");
      return;
    }

    void runWaveAction(
      "proposal",
      () =>
        requestWave("/api/command-wave/proposals", {
          method: "POST",
          body: JSON.stringify({
            title,
            proposer,
            kind,
            prompt,
            spec,
            budgetUsd,
          }),
        }, accessKey),
      "Proposal recorded and checked against the rules.",
    );
  }

  function vote(delta: "yes" | "no") {
    if (!activePoll) {
      return;
    }

    void runWaveAction(
      "vote",
      () =>
        requestWave("/api/command-wave/votes", {
          method: "POST",
          body: JSON.stringify({ proposalId: activePoll.proposalId, voterIdentity: proposer, vote: delta }),
        }, accessKey),
      `Recorded ${delta} vote.`,
    );
  }

  function recordWaveDecision() {
    if (!activePoll || !decisionReference.trim()) {
      return;
    }

    void runWaveAction(
      "decision",
      () =>
        requestWave("/api/command-wave/decision", {
          method: "POST",
          body: JSON.stringify({
            proposalId: activePoll.proposalId,
            reference: decisionReference,
            recordedBy: proposer,
          }),
        }, accessKey),
      "6529 decision receipt recorded.",
    );
  }

  function buildApprovedPr() {
    if (!activeProposal || !canBuildApprovedPr) {
      return;
    }

    void runWaveAction(
      "execute",
      () =>
        requestWave("/api/command-wave/execute", {
          method: "POST",
          body: JSON.stringify({ proposalId: activeProposal.id }),
        }, accessKey),
      "Agent build logged.",
    );
  }

  function runGuardianReview() {
    if (!activeProposal || !activeExecution) {
      return;
    }

    void runWaveAction(
      "review",
      () =>
        requestWave("/api/command-wave/review", {
          method: "POST",
          body: JSON.stringify({ proposalId: activeProposal.id }),
        }, accessKey),
      "Review recorded.",
    );
  }

  return (
    <main className="min-h-screen bg-black text-base text-zinc-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <header className="border-b border-zinc-800 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-normal text-zinc-50 sm:text-5xl">
                {commandWaveProductCopy.headline}
              </h1>
              <p className="mt-3 max-w-3xl text-xl leading-8 text-zinc-300">{commandWaveProductCopy.subhead}</p>
            </div>
          </div>

          <nav className="mt-4 flex flex-wrap gap-2" aria-label="Room actions">
            <JumpLink href="#wave-room">Chat</JumpLink>
            <Button type="button" variant="secondary" onClick={openSuggestSection}>
              Suggest work
            </Button>
            <Button type="button" variant="secondary" onClick={prepareJoinRequest}>
              Join
            </Button>
          </nav>
        </header>

        <section id="workspace" className="grid items-start gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <section id="current-build" className="order-1 scroll-mt-4 rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 lg:order-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-50">{currentFocusTitle}</h2>
              </div>
              <Badge className={currentBuildStatusClass}>{currentBuildStatusLabel}</Badge>
            </div>

            <div className="mt-3 border-t border-zinc-800 pt-3">
              <p className="text-base leading-7 text-zinc-300">
                <span className="font-semibold text-zinc-100">Next:</span> {roomNeedLabel}. {roomNeedDetail}
              </p>
            </div>

            <div className="mt-4 border-t border-zinc-800 pt-4">
              {!activeProposal ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="secondary" onClick={openSuggestSection}>
                    Suggest work
                  </Button>
                </div>
              ) : activePollCanVote ? (
                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => void copyBuilderWaveDecisionDraft()}>
                      Copy decision request
                    </Button>
                    {wave.waveUrl ? <LinkButton href={wave.waveUrl}>Open room</LinkButton> : null}
                  </div>
                  {decisionDraftNotice ? <p className="text-sm leading-6 text-zinc-500">{decisionDraftNotice}</p> : null}
                </div>
              ) : showDecisionRecorder ? (
                <div className="grid gap-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      value={decisionReference}
                      placeholder={decisionReferencePlaceholder}
                      onChange={(event) => setDecisionReference(event.target.value)}
                    />
                    <Button type="button" variant="secondary" disabled={isBusy || !decisionReference.trim()} onClick={recordWaveDecision}>
                      {apiBusy === "decision" ? "Recording" : "Record decision"}
                    </Button>
                  </div>
                </div>
              ) : showBuildAction ? (
                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" disabled={isBusy || !canBuildApprovedPr} onClick={buildApprovedPr}>
                      {apiBusy === "execute" ? "Building" : activePrHasWaveDecision ? "Build approved PR" : "Decision receipt needed"}
                    </Button>
                    {canCopyCodexPacket ? (
                      <Button type="button" variant="secondary" disabled={isBusy} onClick={() => void copyCodexWorkPacket()}>
                        {apiBusy === "codex" ? "Copying" : "Copy build packet"}
                      </Button>
                    ) : null}
                  </div>
                  {codexPacketNotice ? <p className="text-sm leading-6 text-cyan-300">{codexPacketNotice}</p> : null}
                </div>
              ) : canRunReview ? (
                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => void copyBuilderWaveReviewRequestDraft()}>
                      Copy review request
                    </Button>
                    {activeExecutionPrUrl ? <LinkButton href={activeExecutionPrUrl}>Open PR</LinkButton> : null}
                    <Button type="button" variant="secondary" disabled={isBusy} onClick={runGuardianReview}>
                      {apiBusy === "review" ? "Reviewing" : "Review result"}
                    </Button>
                  </div>
                  {reviewRequestNotice ? <p className="text-sm leading-6 text-zinc-500">{reviewRequestNotice}</p> : null}
                </div>
              ) : activeSupportProposal ? (
                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => discussSupportProposal(activeSupportProposal)}>
                      Discuss in room
                    </Button>
                    <Button type="button" variant="secondary" onClick={openSuggestSection}>
                      Propose code PR
                    </Button>
                    <Button type="button" variant="secondary" onClick={openActivitySection}>
                      History
                    </Button>
                  </div>
                </div>
              ) : readyForNextHookChange ? (
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      disabled={!wave.waveUrl}
                      onClick={() => void copyBuilderWaveProposalDraft({ openDiscussion: true })}
                    >
                      Discuss in room
                    </Button>
                    <Button type="button" variant="secondary" disabled={isBusy || hookProposalPreflightBlocked} onClick={submitProposal}>
                      {apiBusy === "proposal" ? "Saving" : "Save proposal"}
                    </Button>
                    <Button type="button" variant="secondary" onClick={openSuggestSection}>
                      Edit details
                    </Button>
                  </div>
                  {proposalDraftNotice ? <p className="text-sm leading-6 text-zinc-500">{proposalDraftNotice}</p> : null}
                  {apiError ? <p className="text-sm leading-6 text-red-300">{apiError}</p> : null}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="secondary" onClick={openSuggestSection}>
                    Suggest work
                  </Button>
                </div>
              )}
            </div>

            <details className="mt-4 border-t border-zinc-800 pt-3">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-zinc-100">
                <span>How this works</span>
                <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{participationAccess.label}</Badge>
              </summary>
              <div className="mt-3 grid gap-3">
                <p className="text-sm leading-6 text-zinc-400">{currentFocusDescription}</p>
                <dl className="grid gap-2 sm:grid-cols-4">
                  {roomStatusItems.map((item) => (
                    <div key={item.id} className="border-t border-zinc-800 pt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <dt className="text-sm font-semibold text-zinc-300">{item.label}</dt>
                        <Badge className={progressStatusClass(item.status)}>{item.status}</Badge>
                      </div>
                    </div>
                  ))}
                </dl>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="border-t border-zinc-800 pt-2">
                    <p className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Who can join</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">
                      {participationGateNotes[0] ?? "Participation gate is not set yet."}
                    </p>
                  </div>
                  <div className="border-t border-zinc-800 pt-2">
                    <p className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Rule</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{roomRuleSummary}</p>
                  </div>
                </div>
              </div>
            </details>
          </section>

          <section id="wave-room" className="order-2 scroll-mt-4 rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 lg:order-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-zinc-50">Chat</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {wave.waveUrl ? <LinkButton href={wave.waveUrl}>Open room</LinkButton> : null}
                <Button type="button" variant="secondary" onClick={openBuildersSection}>
                  Members
                </Button>
              </div>
            </div>

            <div className="mt-4 border-t border-zinc-800 pt-4">
              <Field label="Message">
                <Textarea
                  rows={3}
                  value={waveRoomMessage}
                  placeholder="Ask a question, share context, or suggest a small hook change."
                  onChange={(event) => {
                    setWaveRoomMessage(event.target.value);
                    setWaveRoomNotice("");
                  }}
                  className="min-h-28 resize-none"
                />
              </Field>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={canPostRoomMessage ? "primary" : "secondary"}
                  disabled={isBusy || !canPostRoomMessage}
                  onClick={() => void postBuilderWaveChatDraft()}
                >
                  {apiBusy === "roomPost" ? "Posting" : "Post to room"}
                </Button>
                {hasRoomMessage ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!wave.waveUrl}
                      onClick={() => void copyBuilderWaveChatDraft({ openDiscussion: true })}
                    >
                      Copy and open
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => void copyBuilderWaveChatDraft()}>
                      Copy only
                    </Button>
                    <Button type="button" variant="secondary" onClick={resetBuilderWaveChatDraft}>
                      Clear
                    </Button>
                  </>
                ) : null}
              </div>
              {waveRoomNotice ? <p className="mt-2 text-sm leading-6 text-zinc-500">{waveRoomNotice}</p> : null}
              {roomPostUrl ? (
                <a
                  className="mt-1 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                  href={roomPostUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open posted message
                </a>
              ) : null}
              <details className="mt-3 border-y border-zinc-800 py-2">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-300">Message ideas</summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {builderWaveQuickPosts.map((post) => (
                    <Button key={post.id} type="button" variant="secondary" onClick={() => prepareQuickPost(post)}>
                      {post.label}
                    </Button>
                  ))}
                </div>
              </details>
            </div>

            <details className="mt-4 border-t border-zinc-800 pt-3">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-zinc-100">
                <span>Latest activity</span>
                <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">
                  {hasRecentDiscussionPosts ? "room post" : "local log"}
                </Badge>
              </summary>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm leading-6 text-zinc-500">A short snapshot of what the room is discussing.</p>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isBusy || !primaryHookProject?.waveUrl}
                  onClick={() =>
                    void previewContext(primaryHookProject?.waveUrl ?? wave.waveUrl, "project", primaryHookProject?.id)
                  }
                >
                  {apiBusy === "context" ? "Loading" : "Refresh"}
                </Button>
              </div>
              {hasRecentDiscussionPosts && primaryProjectContextPreview ? (
                <div className="mt-3 grid gap-3">
                  {primaryProjectContextPreview.sampleDrops.slice(-1).map((drop) => (
                    <div key={drop.id} className="border-t border-zinc-800 pt-3 first:border-t-0 first:pt-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-300">{drop.author}</p>
                        {drop.url ? (
                          <a
                            className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                            href={drop.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open post
                          </a>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-400">{drop.preview}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 grid gap-3">
                  {roomFeed.slice(0, 1).map((item) => (
                    <div key={item.id} className="border-t border-zinc-800 pt-3 first:border-t-0 first:pt-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold uppercase tracking-normal text-zinc-500">{item.label}</p>
                        <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{item.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm font-semibold leading-6 text-zinc-100">
                        {humanizeLegacyCommandCopy(item.title)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-400">{humanizeLegacyCommandCopy(item.body)}</p>
                      {item.href ? (
                        <a
                          className="mt-2 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {item.hrefLabel ?? "Open"}
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </details>
          </section>
        </section>

        <details
          id="start-building"
          ref={suggestRef}
          className="scroll-mt-4 border-b border-zinc-800 pb-5"
          open={suggestOpen}
          onToggle={(event) => setSuggestOpen(event.currentTarget.open)}
        >
          <summary className="flex cursor-pointer items-center gap-3 text-lg font-semibold text-zinc-50">Suggest work</summary>
          <div className="mt-4 max-w-4xl">
            <div className="mt-4 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
                <div>
                  <p className="mb-2 text-base font-semibold text-zinc-200">Type</p>
                  <div className="flex flex-wrap gap-2">
                    {proposalTypeOptions.map((option) => {
                      const selected = option.kind === kind;

                      return (
                        <button
                          key={option.kind}
                          type="button"
                          aria-pressed={selected}
                          className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-md border px-4 text-base font-semibold transition ${
                            selected
                              ? "border-cyan-500 bg-cyan-950/35 text-zinc-50"
                              : "border-zinc-800 bg-black text-zinc-300 hover:border-cyan-800 hover:bg-zinc-950"
                          }`}
                          onClick={() => chooseProposalType(option)}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Field label="Handle">
                  <Input value={proposer} onChange={(event) => setProposer(event.target.value)} />
                </Field>
              </div>
              <Field label="Title">
                <Input
                  value={title}
                  placeholder={selectedProposalType.title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </Field>
              <Field label={selectedProposalType.requestLabel}>
                <Textarea
                  rows={4}
                  value={prompt}
                  placeholder={selectedProposalType.requestPlaceholder}
                  onChange={(event) => setPrompt(event.target.value)}
                  className="min-h-24"
                />
              </Field>
              <Field label={selectedProposalType.limitsLabel}>
                <Textarea
                  rows={4}
                  value={spec}
                  placeholder={selectedProposalType.limitsPlaceholder}
                  onChange={(event) => setSpec(event.target.value)}
                  className="min-h-24"
                />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!wave.waveUrl}
                onClick={() => void copyBuilderWaveProposalDraft({ openDiscussion: true })}
              >
                Copy and open
              </Button>
              <Button type="button" variant="secondary" onClick={() => void copyBuilderWaveProposalDraft()}>
                Copy only
              </Button>
              <Button type="button" variant="secondary" disabled={isBusy || hookProposalPreflightBlocked} onClick={submitProposal}>
                {apiBusy === "proposal" ? "Saving" : "Save proposal"}
              </Button>
              <JumpLink href="#wave-room">Chat</JumpLink>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Post to the room first. Save it here only after the room can see it.
            </p>
            {proposalDraftNotice ? <p className="mt-2 text-sm leading-6 text-zinc-500">{proposalDraftNotice}</p> : null}
            {apiError ? <p className="mt-2 text-sm leading-6 text-red-300">{apiError}</p> : null}
            <details className="mt-4 border-y border-zinc-800 py-3" open={hookProposalPreflightBlocked ? true : undefined}>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 text-base font-semibold text-zinc-100">
                <span>Checks</span>
                <span className="flex flex-wrap gap-2">
                  <Badge className={riskClass(classifiedRisk)}>{classifiedRisk} risk</Badge>
                  <Badge className={hookProposalPreflightRequired ? checkStatusClass(hookProposalPreflight.status) : statusClass("complete")}>
                    {hookProposalPreflightRequired ? hookProposalPreflight.statusLabel : "ready"}
                  </Badge>
                </span>
              </summary>
              <div className="mt-3 divide-y divide-zinc-800 border-t border-zinc-800">
                <div className="flex items-center justify-between gap-3 py-3">
                  <p className="text-base font-semibold text-zinc-100">Risk</p>
                  <Badge className={riskClass(classifiedRisk)}>{classifiedRisk}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3 py-3">
                  <p className="text-base font-semibold text-zinc-100">Decision</p>
                  <Badge className={statusClass(selectedRule.mode)}>{simpleDecisionRoute}</Badge>
                </div>
                <div className="flex items-center justify-between gap-3 py-3">
                  <p className="text-base font-semibold text-zinc-100">Hook rules</p>
                  <Badge className={hookProposalPreflightRequired ? checkStatusClass(hookProposalPreflight.status) : statusClass("complete")}>
                    {hookProposalPreflightRequired ? hookProposalPreflight.statusLabel : "ready"}
                  </Badge>
                </div>
                <div className="py-3">
                  <p className="text-base font-semibold text-zinc-100">Status</p>
                  <p className="mt-1 text-base leading-7 text-zinc-400">{simplePreflightMessage}</p>
                </div>
              </div>
            </details>
          </div>
        </details>

        <details
          id="active-hooks"
          ref={hookDetailsRef}
          className="scroll-mt-4 border-b border-zinc-800 pb-5"
          open={hookDetailsOpen}
          onToggle={(event) => setHookDetailsOpen(event.currentTarget.open)}
        >
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-lg font-semibold text-zinc-50">
            <span>Project snapshot</span>
            <Badge className="border-zinc-700 bg-zinc-950 text-zinc-300">
              {activeHookProjects.length} {activeHookProjects.length === 1 ? "hook" : "hooks"}
            </Badge>
          </summary>
          <div className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
            {activeHookProjects.map((project) => (
              <div key={project.id} className="grid gap-3 py-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-zinc-50">{project.name}</h3>
                    <Badge className={nextActionStatusClass(project.nextActionStatus)}>{project.nextActionLabel}</Badge>
                  </div>
                  <p className="mt-2 text-base leading-7 text-zinc-400">{project.currentFocus}</p>
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["Room", project.waveLabel],
                      ["Code", project.repoLabel],
                      ["Access", project.gateSnapshotLabel],
                      ["Review", project.reviewStatusLabel],
                    ].map(([label, value]) => (
                      <div key={label} className="border-t border-zinc-800 pt-2">
                        <dt className="text-sm font-semibold uppercase tracking-normal text-zinc-500">{label}</dt>
                        <dd className="mt-1 text-base font-semibold text-zinc-100">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {project.waveUrl ? <LinkButton href={project.waveUrl}>Room</LinkButton> : null}
                  {project.repoUrl ? <LinkButton href={project.repoUrl}>Code</LinkButton> : null}
                  <JumpLink href="#wave-room">Message</JumpLink>
                </div>
              </div>
            ))}
          </div>
        </details>

        <details
          id="recent-activity"
          ref={activityRef}
          className="scroll-mt-4 border-b border-zinc-800 pb-5"
          open={activityOpen}
          onToggle={(event) => setActivityOpen(event.currentTarget.open)}
        >
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-lg font-semibold text-zinc-50">
            <span>History</span>
            <Badge className="border-zinc-700 bg-zinc-950 text-zinc-300">{buildTimeline.length} steps</Badge>
          </summary>
          <div className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
            {buildTimeline.map((item) => (
              <div key={item.id} className="grid gap-3 py-4 md:grid-cols-[8rem_1fr_auto]">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-normal text-zinc-500">{item.label}</p>
                  <Badge className={progressStatusClass(item.status)}>{item.status}</Badge>
                </div>
                <div>
                  <p className="text-lg font-semibold text-zinc-50">{humanizeLegacyCommandCopy(item.title)}</p>
                  <p className="mt-1 text-base leading-7 text-zinc-400">{humanizeLegacyCommandCopy(item.detail)}</p>
                </div>
                {item.href && item.hrefLabel ? (
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <LinkButton href={item.href}>{item.hrefLabel}</LinkButton>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          {orderedLedgerEvents.length ? (
            <details className="mt-4 border-y border-zinc-800 py-3">
              <summary className="cursor-pointer text-base font-semibold text-zinc-100">Show raw log</summary>
              <div className="mt-3 divide-y divide-zinc-800 border-t border-zinc-800">
                {orderedLedgerEvents.map((event) => (
                  <div key={event.id} className="grid gap-2 py-3 md:grid-cols-[7rem_12rem_1fr]">
                    <p className="text-sm font-semibold text-zinc-500">{shortTime(event.at)}</p>
                    <p className="text-sm font-semibold text-zinc-300">{humanizeLegacyCommandCopy(event.actor)}</p>
                    <div>
                      <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{eventTypeLabel(event.type)}</Badge>
                      <p className="mt-1 text-sm leading-6 text-zinc-400">{humanizeLegacyCommandCopy(event.message)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </details>

        <details
          id="active-builders"
          ref={buildersRef}
          className="scroll-mt-4 border-b border-zinc-800 pb-5"
          open={buildersOpen}
          onToggle={(event) => setBuildersOpen(event.currentTarget.open)}
        >
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-lg font-semibold text-zinc-50">
            <span>Members</span>
            <Badge className="border-zinc-700 bg-zinc-950 text-zinc-300">{builderRoster.length}</Badge>
          </summary>
          {selectedMember ? (
            <div className="mt-4 grid gap-3 border-y border-zinc-800 py-4 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold uppercase tracking-normal text-zinc-500">Member</p>
                  <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{selectedMember.role}</Badge>
                  <Badge className="border-cyan-700 bg-cyan-950/45 text-cyan-100">{selectedMember.scoreLabel}</Badge>
                </div>
                <h3 className="mt-2 text-2xl font-semibold text-zinc-50">{selectedMember.identity}</h3>
                <p className="mt-2 text-base leading-7 text-zinc-400">{selectedMember.activity}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-500">{selectedMember.detail}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Activity is informational. It does not grant permissions, payouts, or merge rights.
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                <Button type="button" variant="secondary" onClick={() => messageMember(selectedMember.identity)}>
                  Message
                </Button>
                <LinkButton href={memberProfileUrl(selectedMember.identity)}>6529 profile</LinkButton>
              </div>
            </div>
          ) : null}
          <div className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
            {builderRoster.length ? (
              otherBuilderRoster.length ? (
                otherBuilderRoster.map((member) => (
                  <div key={member.identity} className="grid gap-3 py-4 md:grid-cols-[1fr_auto]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xl font-semibold text-zinc-50">{member.identity}</p>
                        <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{member.role}</Badge>
                      </div>
                      <p className="mt-2 text-base leading-7 text-zinc-400">{member.activity}</p>
                      <p className="mt-1 text-sm leading-6 text-zinc-500">{member.detail}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <Badge className="border-cyan-700 bg-cyan-950/45 text-cyan-100">{member.scoreLabel}</Badge>
                      <Button type="button" variant="secondary" onClick={() => showMemberProfile(member.identity)}>
                        Profile
                      </Button>
                      <LinkButton href={memberProfileUrl(member.identity)}>6529 profile</LinkButton>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4">
                  <p className="text-base font-semibold text-zinc-100">No other visible members yet</p>
                  <p className="mt-1 text-base leading-7 text-zinc-500">
                    More builders will appear after they propose, vote, or record activity.
                  </p>
                </div>
              )
            ) : (
              <div className="py-4">
                <p className="text-base font-semibold text-zinc-100">No visible members yet</p>
                <p className="mt-1 text-base leading-7 text-zinc-500">
                  Propose a change, vote, or record a decision to appear here.
                </p>
              </div>
            )}
          </div>
        </details>

        <details id="more-tools" className="scroll-mt-4 border-b border-zinc-800 pb-5">
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-lg font-semibold text-zinc-50">
            <span>Maintainer tools</span>
            <Badge className="border-zinc-700 bg-zinc-950 text-zinc-300">advanced</Badge>
          </summary>
          <div className="mt-4 grid gap-4">
            <details id="rules-of-game" className="border-b border-zinc-800 pb-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-base font-semibold text-zinc-50">
                <span>Room rules</span>
                <Badge className="border-zinc-700 bg-zinc-950 text-zinc-300">reference</Badge>
              </summary>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-cyan-300">Build rules</p>
              <ol className="mt-3 grid gap-2">
                {buildRoomRules.map((rule, index) => (
                  <li key={rule} className="grid grid-cols-[2rem_1fr] gap-3 border-t border-zinc-800 pt-2">
                    <span className="text-base font-semibold text-cyan-300">{index + 1}</span>
                    <span className="text-base leading-7 text-zinc-300">{rule}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div id="who-can-play">
              <p className="text-sm font-semibold uppercase tracking-normal text-cyan-300">Who can join</p>
              <div className="mt-3 divide-y divide-zinc-800 border-y border-zinc-800">
                {participationGateNotes.map((gate) => (
                  <div key={gate} className="py-3">
                    <p className="text-base leading-7 text-zinc-300">{gate}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => void copyParticipationGuideDraft()}>
                  Copy guide
                </Button>
                {wave.waveUrl ? <LinkButton href={wave.waveUrl}>Open room</LinkButton> : null}
              </div>
              {participationGuideNotice ? <p className="mt-2 text-sm leading-6 text-zinc-500">{participationGuideNotice}</p> : null}
            </div>
          </div>
            </details>

            <details id="project-details" className="border-b border-zinc-800 pb-4">
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-base font-semibold text-zinc-50">
            <span>Project setup</span>
            <Badge className="border-zinc-700 bg-zinc-950 text-zinc-300">
              {activeHookProjects.length} {activeHookProjects.length === 1 ? "hook" : "hooks"}
            </Badge>
          </summary>
          <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-500">
            Hook room, code repo, access notes, and the next code step.
          </p>
          <div className="mt-4 grid gap-3">
            {activeHookProjects.map((project) => {
              const contextPreview = projectContextPreviews[project.id] ?? null;

              return (
                <div key={project.id} className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{project.name}</p>
                      <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">{project.participation}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge className="border-zinc-700 bg-black text-zinc-300">room {project.waveLabel}</Badge>
                        <Badge className="border-zinc-700 bg-black text-zinc-300">code {project.repoLabel}</Badge>
                      </div>
                    </div>
                    <Badge className={project.status === "active" ? statusClass("complete") : riskClass("medium")}>
                      {project.statusLabel}
                    </Badge>
                  </div>

                  <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["Access", project.gateSnapshotLabel],
                      ["Decision", project.orchestrationSnapshotLabel],
                      ["PR", project.codeSnapshotLabel],
                      ["Review", project.reviewStatusLabel],
                    ].map(([label, value]) => (
                      <div key={label} className="border-t border-zinc-800 pt-2">
                        <dt className="text-xs font-semibold uppercase tracking-normal text-zinc-500">{label}</dt>
                        <dd className="mt-1 text-sm font-semibold text-zinc-100">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-3 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="border-t border-zinc-800 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Room activity</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">{project.waveRole}</p>
                      <p className="mt-1 text-sm leading-6 text-zinc-400">{project.waveStatus}</p>
                      <div className="mt-3 border-t border-zinc-800 pt-3">
                        <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Who can play</p>
                        <ul className="mt-2 grid gap-1 text-xs leading-5 text-zinc-400">
                          {project.gateDetails.map((gate) => (
                            <li key={gate}>- {gate}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {project.waveUrl ? <LinkButton href={project.waveUrl}>Open room</LinkButton> : null}
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={isBusy || !project.waveUrl}
                          onClick={() => void previewContext(project.waveUrl, "project", project.id)}
                        >
                          {apiBusy === "context" ? "Loading" : "Read latest posts"}
                        </Button>
                        <JumpLink href="#wave-room">Message room</JumpLink>
                      </div>
                      {contextPreview ? (
                        <div className="mt-3 border-t border-zinc-800 pt-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="border-cyan-700 bg-cyan-950/45 text-cyan-100">{contextModeLabel(contextPreview)}</Badge>
                            <Badge className={contextPreview.context.hitCap ? riskClass("medium") : statusClass("complete")}>
                              {postCountLabel(contextPreview.dropCount)}
                            </Badge>
                          </div>
                          <div className="mt-2 grid gap-2">
                            {contextPreview.sampleDrops.slice(-3).map((drop) => (
                              <div key={drop.id} className="border-t border-zinc-900 pt-2 first:border-t-0 first:pt-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-xs font-semibold text-zinc-500">
                                    {drop.author}
                                  </p>
                                  {drop.url ? (
                                    <a
                                      className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                                      href={drop.url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Open post
                                    </a>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-sm leading-5 text-zinc-400">{drop.preview}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs leading-5 text-zinc-500">
                          Preview the room to read the latest posts here.
                        </p>
                      )}
                    </div>

                    <div className="border-t border-zinc-800 pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Code</p>
                        <Badge className={nextActionStatusClass(project.nextActionStatus)}>{project.nextActionLabel}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">{project.platformRole}</p>
                      <dl className="mt-3 grid gap-2 text-xs leading-5 text-zinc-400">
                        <div>
                          <dt className="font-semibold text-zinc-300">Next step</dt>
                          <dd>{project.nextActionTitle}</dd>
                          <dd className="mt-1 text-zinc-500">{project.nextActionDetail}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-zinc-300">Focus</dt>
                          <dd>{project.currentFocus}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-zinc-300">PR state</dt>
                          <dd>{project.codeStatus}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-zinc-300">Review</dt>
                          <dd>{project.reviewStatusLabel}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-zinc-300">Records</dt>
                          <dd>{project.evidenceLabel}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-zinc-300">Latest activity</dt>
                          <dd>{project.latestActivity}</dd>
                        </div>
                      </dl>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {project.repoUrl ? <LinkButton href={project.repoUrl}>Open repo</LinkButton> : null}
                        {project.latestPrUrl ? <LinkButton href={project.latestPrUrl}>Open PR</LinkButton> : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            </details>

            <details className="border-b border-zinc-800 pb-4">
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-base font-semibold text-zinc-50">
            <span>Launch checklist</span>
            <span className="flex flex-wrap justify-end gap-2">
              <Badge className={launchAuditStatusClass(launchAudit.status)}>{launchAudit.statusLabel}</Badge>
              <Badge className="border-zinc-700 bg-black text-zinc-300">
                {completedPhaseCount}/{phaseChecklist.length} flow
              </Badge>
            </span>
          </summary>

          {showApiNotice ? (
            <div className="mt-3 rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-300">
              {apiError ? (
                <span className="font-semibold text-red-300">{apiError}</span>
              ) : (
                <span>{isBusy ? `Working on ${apiBusy}.` : apiNotice}</span>
              )}
            </div>
          ) : null}

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="border-t border-zinc-800 pt-3 lg:border-r lg:border-t-0 lg:pr-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Work</p>
                <Badge className={nextActionStatusClass(phaseNextAction.status)}>{phaseNextAction.statusLabel}</Badge>
                <Badge className="border-zinc-700 bg-black text-zinc-300">{phaseNextAction.stepLabel}</Badge>
              </div>
              <h3 className="mt-2 text-base font-semibold text-zinc-50">{phaseNextAction.title}</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-400">{phaseNextAction.detail}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={openSuggestSection}>
                  Suggest a change
                </Button>
                <Button type="button" variant="secondary" onClick={openActivitySection}>
                  View history
                </Button>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-3 lg:border-t-0 lg:pl-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Launch</p>
                <Badge className={launchAuditStatusClass(launchAudit.nextAction.status)}>
                  {launchAudit.nextAction.statusLabel}
                </Badge>
                <Badge className="border-zinc-700 bg-black text-zinc-300">First loop</Badge>
              </div>
              <h3 className="mt-2 text-base font-semibold text-zinc-50">{launchAudit.nextAction.title}</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-400">{launchAudit.nextAction.detail}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {launchAudit.status !== "ready" ? (
                  <Button type="button" variant="secondary" disabled={isBusy} onClick={runLaunchNextAction}>
                    {launchActionButtonText}
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" onClick={() => void copyLaunchStatusDraft()}>
                  Copy status
                </Button>
              </div>
              {launchStatusNotice ? <p className="mt-2 text-xs leading-5 text-zinc-500">{launchStatusNotice}</p> : null}
            </div>
          </div>

          <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            {phaseChecklist.map((item) => (
              <li key={item.id} className="border-t border-zinc-800 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-100">{item.label}</p>
                  <Badge className={phaseStatusClass(item.status)}>{item.status}</Badge>
                </div>
                {item.status === "active" || item.status === "blocked" ? (
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{item.detail}</p>
                ) : null}
              </li>
            ))}
          </ol>
            </details>

        <details
          ref={setupControlsRef}
          className="order-last border-b border-zinc-800 pb-4"
          open={setupControlsOpen}
          onToggle={(event) => setSetupControlsOpen(event.currentTarget.open)}
        >
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-base font-semibold text-zinc-50">
            <span>Maintainer setup</span>
            <Badge className="border-zinc-700 bg-zinc-950 text-zinc-400">controls</Badge>
          </summary>
          <section className="mt-3 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Project setup" eyebrow="Setup">
            <div className="grid gap-3">
              <p className="text-sm leading-6 text-zinc-400">
                Set the first hook room and code repo. More hook rooms can use the same shape later.
              </p>
              <Field label="6529 room">
                <Input
                  value={waveUrl}
                  onChange={(event) => {
                    setWaveUrl(event.target.value);
                    setSetupContextPreview(null);
                  }}
                />
              </Field>
              <div className="rounded-md border border-zinc-800 bg-black p-3">
                <Field label="Find a room">
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      value={waveSearchQuery}
                      placeholder="Type a room name"
                      onChange={(event) => setWaveSearchQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void searchProjectWaves();
                        }
                      }}
                    />
                    <Button type="button" variant="secondary" disabled={isBusy} onClick={() => void searchProjectWaves()}>
                      {apiBusy === "search" ? "Searching" : "Search"}
                    </Button>
                  </div>
                </Field>
                {waveSearchResults.length ? (
                  <div className="mt-3 space-y-2">
                    {waveSearchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        className="block w-full cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 p-3 text-left transition hover:border-cyan-700 hover:bg-zinc-900 disabled:pointer-events-none disabled:opacity-50"
                        disabled={isBusy}
                        onClick={() => selectWaveResult(result)}
                      >
                        <span className="block text-sm font-semibold text-zinc-100">{result.name}</span>
                        <span className="mt-1 block break-all text-xs text-zinc-500">{result.id}</span>
                        {result.description ? (
                          <span className="mt-2 line-clamp-2 block text-xs leading-5 text-zinc-400">{result.description}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <Field label="Code repo">
                <Input
                  value={repoUrl}
                  onChange={(event) => {
                    setRepoUrl(event.target.value);
                    setSetupValidation(null);
                  }}
                />
              </Field>
              {setupValidation ? (
                <div className="rounded-md border border-zinc-800 bg-black p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-100">Setup check</p>
                    <Badge className={setupValidation.canSave ? statusClass("pass") : statusClass("failed")}>
                      {setupValidation.canSave ? "ready" : "needs fixes"}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {setupValidation.checks.map((item) => (
                      <div key={item.id} className="grid gap-2 rounded-md border border-zinc-900 bg-zinc-950 p-2 sm:grid-cols-[7rem_1fr]">
                        <Badge className={checkStatusClass(item.status)}>{item.status}</Badge>
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">{item.label}</p>
                          <p className="mt-1 text-xs leading-5 text-zinc-500">{item.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div>
                <p className="mb-2 text-sm font-semibold text-zinc-200">Who can participate</p>
                <Textarea
                  value={gateNotes}
                  className="min-h-20"
                  onChange={(event) => setGateNotes(event.target.value)}
                />
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  One note per line. REP, TDH, holder, allowlist, and QnA notes are advisory until live enforcement is wired.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {wave.gates.map((gate) => (
                    <Badge key={gate} className="border-zinc-700 bg-zinc-900 text-zinc-200">
                      {gate}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void copyParticipationGuideDraft()}
                  >
                    Copy participation guide
                  </Button>
                  <LinkButton href={waveUrl}>Open room</LinkButton>
                </div>
                {participationGuideNotice ? (
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{participationGuideNotice}</p>
                ) : null}
              </div>
              <details className="rounded-md border border-zinc-800 bg-black p-3">
                <summary className="flex items-center justify-between gap-3 text-sm font-semibold text-zinc-100">
                  <span>Access key</span>
                  <Badge className={accessKey.trim() ? statusClass("complete") : "border-zinc-700 bg-zinc-900 text-zinc-400"}>
                    {accessKey.trim() ? "set" : "not set"}
                  </Badge>
                </summary>
                <div className="mt-3 grid gap-2">
                  <Field label="Key for protected actions">
                    <Input
                      type="password"
                      autoComplete="off"
                      value={accessKey}
                      placeholder="Only needed when ADMIN_API_KEY is configured"
                      onChange={(event) => updateAccessKey(event.target.value)}
                    />
                  </Field>
                  <p className="text-xs leading-5 text-zinc-500">
                    Stored in this browser session and sent only when saving setup, proposing, voting, running, reviewing,
                    or resetting.
                  </p>
                </div>
              </details>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="secondary" disabled={isBusy} onClick={() => void checkSetup()}>
                  {apiBusy === "setup" ? "Checking" : "Check setup"}
                </Button>
                <Button type="button" variant="secondary" disabled={isBusy} onClick={saveSetup}>
                  {apiBusy === "saving" ? "Saving" : "Save setup"}
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="secondary" disabled={isBusy} onClick={() => void previewContext(waveUrl, "setup")}>
                  {apiBusy === "context" ? "Loading" : "Preview latest posts"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => downloadJson("command-wave-ledger.json", wave)}>
                  Export activity
                </Button>
              </div>
              <details className="rounded-md border border-zinc-800 bg-black p-3">
                <summary className="flex items-center justify-between gap-3 text-sm font-semibold text-zinc-100">
                  <span>Room launch brief</span>
                  <Badge className="border-zinc-700 bg-zinc-900 text-zinc-400">copyable</Badge>
                </summary>
                <div className="mt-3 grid gap-3">
                  <p className="text-xs leading-5 text-zinc-500">
                    Post this after setup so contributors see the scope, repo, participation notes, and phase 1 guardrails.
                  </p>
                  <Button type="button" variant="secondary" onClick={() => void copyBuilderWaveLaunchDraft()}>
                    Copy launch brief
                  </Button>
                  {launchBriefNotice ? <p className="text-xs leading-5 text-zinc-500">{launchBriefNotice}</p> : null}
                  <Textarea readOnly rows={10} value={builderWaveLaunchDraft} className="min-h-60 resize-none font-mono text-xs" />
                </div>
              </details>
              <details
                className="rounded-md border border-zinc-800 bg-black p-3"
                open={readinessControlsOpen}
                onToggle={(event) => setReadinessControlsOpen(event.currentTarget.open)}
              >
                <summary className="flex items-center justify-between gap-3 text-sm font-semibold text-zinc-100">
                  <span>Launch readiness</span>
                  {readiness ? (
                    <span className="flex flex-wrap justify-end gap-1.5">
                      <Badge className={checkStatusClass("pass")}>{readiness.summary.pass} pass</Badge>
                      <Badge className={checkStatusClass("warn")}>{readiness.summary.warn} warn</Badge>
                      <Badge className={checkStatusClass("fail")}>{readiness.summary.fail} fail</Badge>
                    </span>
                  ) : (
                    <Badge className="border-zinc-700 bg-zinc-900 text-zinc-400">not checked</Badge>
                  )}
                </summary>
                <div className="mt-3 grid gap-3">
                  <p className="text-xs leading-5 text-zinc-500">
                    Shows local mode, storage, 6529 reads, PR adapter, review state, and review mode.
                  </p>
                  <Button type="button" variant="secondary" disabled={isBusy} onClick={() => void checkReadiness()}>
                    {apiBusy === "readiness" ? "Checking" : "Check readiness"}
                  </Button>
                  <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Public launch setup</p>
                    <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                      {publicLaunchSetupItems.map(([name, detail]) => (
                        <div key={name} className="border-t border-zinc-900 pt-2 first:border-t-0 first:pt-0 sm:first:border-t sm:first:pt-2">
                          <dt className="break-all text-sm font-semibold text-zinc-100">{name}</dt>
                          <dd className="mt-1 text-xs leading-5 text-zinc-500">{detail}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Review proof URLs</p>
                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">Project state</p>
                        <p className="mt-1 break-all text-xs leading-5 text-zinc-500">{commandWaveStatePath}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" onClick={() => void copyLaunchUrl(commandWaveStatePath, "State URL")}>
                            Copy state URL
                          </Button>
                          <LinkButton href={commandWaveStatePath}>Open state</LinkButton>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">Setup proof</p>
                        <p className="mt-1 break-all text-xs leading-5 text-zinc-500">{setupProofPath}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" onClick={() => void copyLaunchUrl(setupProofPath, "Setup proof URL")}>
                            Copy proof URL
                          </Button>
                          <LinkButton href={setupProofPath}>Open proof</LinkButton>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">Launch audit</p>
                        <p className="mt-1 break-all text-xs leading-5 text-zinc-500">{remoteLaunchAuditPath}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" onClick={() => void copyLaunchUrl(remoteLaunchAuditPath, "Launch audit URL")}>
                            Copy audit URL
                          </Button>
                          <LinkButton href={remoteLaunchAuditPath}>Open audit</LinkButton>
                        </div>
                      </div>
                    </div>
                    {launchLinkNotice ? <p className="mt-2 text-xs leading-5 text-zinc-500">{launchLinkNotice}</p> : null}
                  </div>
                  <div className="border-t border-zinc-900 pt-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">Launch check</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">{launchAudit.summary}</p>
                      </div>
                      <Badge className={launchAuditStatusClass(launchAudit.status)}>{launchAudit.statusLabel}</Badge>
                    </div>
                    <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Next launch action</p>
                        <Badge className={launchAuditStatusClass(launchAudit.nextAction.status)}>
                          {launchAudit.nextAction.statusLabel}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-zinc-100">{launchAudit.nextAction.title}</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">{launchAudit.nextAction.detail}</p>
                    </div>
                    {launchAuditOpenItems.length ? (
                      <div className="mt-3 grid gap-2">
                        {launchAuditOpenItems.map((item) => (
                          <div
                            key={item.id}
                            className="grid gap-2 border-t border-zinc-900 pt-2 first:border-t-0 first:pt-0 sm:grid-cols-[6rem_1fr]"
                          >
                            <Badge className={launchAuditItemClass(item.status)}>{item.status}</Badge>
                            <div>
                              <p className="text-sm font-semibold text-zinc-100">{item.label}</p>
                              <p className="mt-1 text-xs leading-5 text-zinc-500">{item.detail}</p>
                            </div>
                          </div>
                        ))}
                        {launchAudit.openItems.length > launchAuditOpenItems.length ? (
                          <p className="text-xs leading-5 text-zinc-500">
                            +{launchAudit.openItems.length - launchAuditOpenItems.length} more item
                            {launchAudit.openItems.length - launchAuditOpenItems.length === 1 ? "" : "s"}.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-2">
                        <p className="text-xs leading-5 text-zinc-500">No launch gaps found in these checks.</p>
                        {launchAuditReadyEvidence.length ? (
                          <div className="grid gap-2 border-t border-zinc-900 pt-2">
                            <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Checked records</p>
                            {launchAuditReadyEvidence.map((item) => (
                              <div key={item.id} className="grid gap-2 sm:grid-cols-[6rem_1fr]">
                                <Badge className={launchAuditItemClass(item.status)}>{item.status}</Badge>
                                <div>
                                  <p className="text-sm font-semibold text-zinc-100">{item.label}</p>
                                  <p className="mt-1 text-xs leading-5 text-zinc-500">{item.detail}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  {readiness ? (
                    <div className="grid gap-2">
                      {readiness.checks.map((item) => (
                        <div
                          key={item.id}
                          className="grid gap-2 rounded-md border border-zinc-900 bg-zinc-950 p-2 sm:grid-cols-[5rem_1fr]"
                        >
                          <Badge className={checkStatusClass(item.status)}>{item.status}</Badge>
                          <div>
                            <p className="text-sm font-semibold text-zinc-100">{item.label}</p>
                            <p className="mt-1 text-xs leading-5 text-zinc-500">{item.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </details>
              {setupContextPreview ? (
                <div className="rounded-md border border-zinc-800 bg-black p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-cyan-700 bg-cyan-950/45 text-cyan-100">{contextModeLabel(setupContextPreview)}</Badge>
                    <Badge className={setupContextPreview.context.hitCap ? riskClass("medium") : statusClass("complete")}>
                      {setupContextPreview.context.hitCap ? "hit cap" : "complete fetch"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    Found {postCountLabel(setupContextPreview.dropCount)} after checking {setupContextPreview.context.searchedMessages} messages.
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {setupContextPreview.fromDropId ?? "no first drop"} to {setupContextPreview.toDropId ?? "no latest drop"}
                  </p>
                  <div className="mt-3 space-y-2">
                    {setupContextPreview.sampleDrops.slice(-3).map((drop) => (
                      <div key={drop.id} className="border-t border-zinc-900 pt-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold text-zinc-500">
                            {drop.author}
                          </p>
                          {drop.url ? (
                            <a
                              className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                              href={drop.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open post
                            </a>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm leading-5 text-zinc-400">{drop.preview}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <details className="rounded-md border border-zinc-800 bg-black p-3">
                <summary className="flex items-center justify-between gap-3 text-sm font-semibold text-zinc-100">
                  <span>Local test controls</span>
                  <Badge className="border-zinc-700 bg-zinc-900 text-zinc-400">hidden</Badge>
                </summary>
                <div className="mt-3 grid gap-3">
                  <p className="text-xs leading-5 text-zinc-500">
                    Restore the starter hook project only when testing the local app.
                  </p>
                  <Button type="button" variant="danger" disabled={isBusy} onClick={resetStarterState}>
                    {apiBusy === "reset" ? "Resetting" : "Reset starter"}
                  </Button>
                </div>
              </details>
            </div>
          </Panel>

            <Panel title="Build rules" eyebrow={wave.rules.version}>
            <div className="space-y-4">
              <p className="text-sm leading-6 text-zinc-400">
                Phase 1 accepts reads, drafts, room updates, and PR work. Scripts, deploys, funds, and rule changes stay parked.
              </p>
              <div className="grid gap-3 lg:grid-cols-2">
                <CompactList title="Use now" items={firstPhaseScopeInventory.useNow} />
                <CompactList title="Park later" items={firstPhaseScopeInventory.parkLater} />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-md border border-zinc-800 bg-black p-3">
                  <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Voters</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-50">{wave.rules.eligibleVoters}</p>
                </div>
                <div className="rounded-md border border-zinc-800 bg-black p-3">
                  <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Default quorum</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-50">{wave.rules.defaultQuorum}</p>
                </div>
                <div className="rounded-md border border-zinc-800 bg-black p-3">
                  <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Default yes</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-50">{wave.rules.defaultYesPercent}%</p>
                </div>
              </div>
              <div className="rounded-md border border-zinc-800 bg-black p-3">
                <p className="text-sm font-semibold text-zinc-100">Hook guardrails</p>
                <ul className="mt-2 grid gap-2 text-sm leading-6 text-zinc-400">
                  {hookGuardrails.map((guardrail) => (
                    <li key={guardrail}>- {guardrail}</li>
                  ))}
                </ul>
              </div>
              <details className="rounded-md border border-zinc-800 bg-black p-3">
                <summary className="text-sm font-semibold text-zinc-100">Show detailed rules and tool access</summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {commandKinds.map((item) => {
                    const rule = wave.rules.rulesByKind[item.value];
                    const policy = toolPolicyForKind(item.value);

                    return (
                      <div key={item.value} className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-zinc-100">{item.label}</p>
                            <p className="mt-1 text-xs leading-5 text-zinc-500">{item.description}</p>
                          </div>
                          <Badge className={statusClass(rule.mode)}>{modeLabel(rule.mode)}</Badge>
                        </div>
                        {rule.mode === "poll" ? (
                          <p className="mt-2 text-xs font-medium text-zinc-400">
                            Needs {rule.quorum} votes, {rule.yesPercent}% yes, closes in {rule.expiresHours}h.
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {policy.permissions.map((permission) => (
                            <Badge key={permission} className="border-zinc-800 bg-black text-zinc-400">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>
            </Panel>
          </section>
        </details>

            <details id="suggest-hook-work" className="border-b border-zinc-800 pb-4">
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-base font-semibold text-zinc-50">
            <span>More proposal controls</span>
            <Badge className="border-zinc-700 bg-zinc-950 text-zinc-300">optional</Badge>
          </summary>
          <section className="mt-4 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <Panel title="Proposal review" eyebrow="Optional">
            <div className="grid gap-3">
              <p className="text-sm leading-6 text-zinc-400">
                Check the risk path and room draft before adding the proposal.
              </p>
              <Field label="Title">
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </Field>
              <Field label="What should change">
                <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
              </Field>
              <Field label="Limits and tests">
                <Textarea value={spec} onChange={(event) => setSpec(event.target.value)} />
              </Field>
              <div className="rounded-md border border-zinc-800 bg-black p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">Hook review</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      {hookProposalPreflightRequired
                        ? hookProposalPreflight.summary
                        : "Required only when this opens a PR."}
                    </p>
                  </div>
                  <Badge className={hookProposalPreflightRequired ? checkStatusClass(hookProposalPreflight.status) : statusClass("complete")}>
                    {hookProposalPreflightRequired ? hookProposalPreflight.statusLabel : "not required"}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2">
                  {hookProposalPreflightRequired ? (
                    visibleHookProposalChecks.map((check) => (
                      <div
                        key={check.id}
                        className="grid gap-2 border-t border-zinc-900 pt-2 first:border-t-0 first:pt-0 sm:grid-cols-[6rem_1fr]"
                      >
                        <Badge className={checkStatusClass(check.status)}>{check.status}</Badge>
                        <div>
                          <p className="text-sm font-semibold text-zinc-100">{check.label}</p>
                          <p className="mt-1 text-xs leading-5 text-zinc-500">{check.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="grid gap-2 border-t border-zinc-900 pt-2 first:border-t-0 first:pt-0 sm:grid-cols-[6rem_1fr]">
                      <Badge className={checkStatusClass("pass")}>pass</Badge>
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">No PR opened</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          Use this for context, drafts, or room updates. PR work still needs hook preflight.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {hookProposalPreflightRequired && hookProposalPreflight.checks.length > visibleHookProposalChecks.length ? (
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    +{hookProposalPreflight.checks.length - visibleHookProposalChecks.length} more check
                    {hookProposalPreflight.checks.length - visibleHookProposalChecks.length === 1 ? "" : "s"}.
                  </p>
                ) : null}
              </div>
              <details className="rounded-md border border-zinc-800 bg-black p-3">
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-zinc-100">
                  <span>Proposal settings</span>
                  <span className="flex flex-wrap justify-end gap-1.5">
                    <Badge className={riskClass(classifiedRisk)}>{classifiedRisk} risk</Badge>
                    <Badge className={statusClass(selectedRule.mode)}>{modeLabel(selectedRule.mode)}</Badge>
                  </span>
                </summary>
                <div className="mt-3 grid gap-3">
                  <Field label="Contributor">
                    <Input value={proposer} onChange={(event) => setProposer(event.target.value)} />
                  </Field>
                  <Field label="Work type">
                    <Select value={kind} onChange={(event) => setKind(event.target.value as CommandKind)}>
                      {firstPhaseProposalKinds.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Budget cap">
                    <Input value={budgetUsd} onChange={(event) => setBudgetUsd(event.target.value)} />
                  </Field>
                  <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Decision rule</p>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">{selectedRule.reason}</p>
                  </div>
                </div>
              </details>
              <div className="rounded-md border border-zinc-800 bg-black p-3">
                <p className="text-sm font-semibold text-zinc-100">Room brief</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Copy this into the room. Save locally only after it matches the room and risk path.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Button type="button" variant="secondary" onClick={() => void copyBuilderWaveProposalDraft()}>
                    Copy proposal
                  </Button>
                  {wave.waveUrl ? <LinkButton href={wave.waveUrl}>Open room</LinkButton> : null}
                </div>
                {proposalDraftNotice ? <p className="mt-2 text-xs leading-5 text-zinc-500">{proposalDraftNotice}</p> : null}
              </div>
              <Button type="button" disabled={isBusy || hookProposalPreflightBlocked} onClick={submitProposal}>
                {apiBusy === "proposal" ? "Saving" : "Save proposal"}
              </Button>
            </div>
          </Panel>

          <Panel title="Code and review" eyebrow="Code review">
            {activeProposal ? (
              <div className="space-y-4">
                {!phaseWork.prProposal ? (
                  <div className="rounded-md border border-amber-800 bg-amber-950/25 p-3">
                    <p className="text-sm font-semibold text-amber-100">No PR change yet</p>
                    <p className="mt-1 text-xs leading-5 text-amber-100/80">
                      This support item can be decided, but the hook phase still needs one PR-sized change before build and review.
                    </p>
                  </div>
                ) : null}
                <div className="rounded-md border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={statusClass(activeProposal.status)}>{activeProposal.status.replaceAll("_", " ")}</Badge>
                    <Badge className={riskClass(activeProposal.risk)}>{activeProposal.risk} risk</Badge>
                    <Badge className="border-zinc-700 bg-zinc-900 text-zinc-200">{commandKindLabel(activeProposal.kind)}</Badge>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-zinc-50">{activeProposal.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{humanizeLegacyCommandCopy(activeProposal.prompt)}</p>
                  <p className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm leading-6 text-zinc-300">
                    {humanizeLegacyCommandCopy(activeProposal.spec)}
                  </p>
                  <div className="mt-3 border-t border-zinc-800 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Decision path</p>
                    <dl className="mt-2 grid gap-2 text-xs leading-5 text-zinc-400 sm:grid-cols-3">
                      <div>
                        <dt className="font-semibold text-zinc-300">Decision route</dt>
                        <dd>{activeOrchestrationSummary.decisionRoute}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-zinc-300">Rule</dt>
                        <dd>{activeOrchestrationSummary.ruleReason}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-zinc-300">Reviewer</dt>
                        <dd>{activeOrchestrationSummary.reviewerRoute}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {visibleSupportProposals.length ? (
                  <div className="rounded-md border border-zinc-800 bg-black p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">Support items</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          Context, drafts, and room updates stay separate from the PR build target.
                        </p>
                      </div>
                      <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{countLabel(supportProposals.length, "item")}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {visibleSupportProposals.map((proposal) => (
                        <div key={proposal.id} className="grid gap-2 border-t border-zinc-900 pt-2 first:border-t-0 first:pt-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={statusClass(proposal.status)}>{proposal.status.replaceAll("_", " ")}</Badge>
                            <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{commandKindLabel(proposal.kind)}</Badge>
                          </div>
                          <p className="text-sm font-semibold text-zinc-100">{proposal.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {activePoll ? (
                  <div className="rounded-md border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">{activePollTitle}</p>
                        <p className="mt-1 text-xs text-zinc-500">{activePollDetail}</p>
                        {activePoll.status === "open" ? (
                          <p className="mt-1 text-xs text-zinc-500">
                            Optional demo tally only. The 6529 room decision is the approval source.
                          </p>
                        ) : null}
                      </div>
                      <Badge className={statusClass(activePoll.status)}>{activePoll.status.replaceAll("_", " ")}</Badge>
                    </div>
                    {(activePoll.votes ?? []).length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(activePoll.votes ?? []).slice(0, 8).map((vote) => (
                          <Badge key={vote.voterIdentity} className="border-zinc-800 bg-zinc-950 text-zinc-400">
                            {vote.voterIdentity}: {vote.vote}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900">
                      <div className="h-full bg-cyan-300" style={{ width: `${Math.min(pollResult?.yesPercent ?? 0, 100)}%` }} />
                    </div>
                    {activePollCanVote ? (
                      <div className="mt-3 flex gap-2">
                        <Button type="button" variant="secondary" disabled={isBusy} onClick={() => vote("yes")}>
                          Add demo yes
                        </Button>
                        <Button type="button" variant="secondary" disabled={isBusy} onClick={() => vote("no")}>
                          Add demo no
                        </Button>
                      </div>
                    ) : null}
                    {!activePoll.decision ? (
                      <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-sm font-semibold text-zinc-100">Decision request</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          Copy this to ask the room for the actual decision, then record the decision URL.
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <Button type="button" variant="secondary" onClick={() => void copyBuilderWaveDecisionDraft()}>
                            Copy request
                          </Button>
                          {wave.waveUrl ? <LinkButton href={wave.waveUrl}>Open room</LinkButton> : null}
                        </div>
                        {decisionDraftNotice ? <p className="mt-2 text-xs leading-5 text-zinc-500">{decisionDraftNotice}</p> : null}
                      </div>
                    ) : null}
                    {activePoll.decision ? (
                      <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-100">6529 decision receipt</p>
                          <Badge className="border-cyan-700 bg-cyan-950/45 text-cyan-100">{activePoll.decision.source}</Badge>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-zinc-500">{activePoll.decision.summary}</p>
                        {activeDecisionReferenceCheck?.ok === false ? (
                          <p className="mt-2 text-xs leading-5 text-amber-200">{activeDecisionReferenceCheck.message}</p>
                        ) : null}
                        {activePoll.decision.url ? (
                          <a
                            className="mt-2 block break-all text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                            href={activePoll.decision.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {activePoll.decision.url}
                          </a>
                        ) : activePoll.decision.dropId ? (
                          <p className="mt-2 break-all text-xs text-zinc-400">Drop id: {activePoll.decision.dropId}</p>
                        ) : null}
                      </div>
                    ) : null}
                    {showDecisionRecorder ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                        <Input
                          value={decisionReference}
                          placeholder={decisionReferencePlaceholder}
                          onChange={(event) => setDecisionReference(event.target.value)}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={isBusy || !decisionReference.trim()}
                          onClick={recordWaveDecision}
                        >
                          {apiBusy === "decision" ? "Recording" : "Record decision"}
                        </Button>
                      </div>
                    ) : null}
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      App tally only. PR work needs the room decision URL. This does not add live REP, TDH, or weighted voting.
                    </p>
                  </div>
                ) : (
                  <p className="rounded-md border border-emerald-800 bg-emerald-950/25 p-3 text-sm text-emerald-100">
                    This work can be logged without a vote under the current rules.
                  </p>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-zinc-800 bg-black p-4">
                    <p className="text-sm font-semibold text-zinc-100">Build PR</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {activeExecution?.summary
                        ? humanizeLegacyCommandCopy(activeExecution.summary)
                        : activeProposalIsPr
                          ? activePrHasWaveDecision
                            ? "Ready to build the approved PR."
                            : "Record the 6529 decision receipt before the PR build step."
                          : "Only code PR work uses the build step in phase 1."}
                    </p>
                    {activeExecution?.artifacts.length ? (
                      <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                        {activeExecution.artifacts.map((artifact) => (
                          <li key={artifact}>- {artifactLabel(artifact)}</li>
                        ))}
                      </ul>
                    ) : null}
                    {showBuildAction ? (
                      <Button
                        type="button"
                        className="mt-3"
                        disabled={isBusy || !canBuildApprovedPr}
                        onClick={buildApprovedPr}
                      >
                        {apiBusy === "execute" ? "Building" : activePrHasWaveDecision ? "Build approved PR" : "Decision receipt needed"}
                      </Button>
                    ) : null}
                    {canCopyCodexPacket ? (
                      <Button
                        type="button"
                        className="mt-2"
                        variant="secondary"
                        disabled={isBusy}
                        onClick={() => void copyCodexWorkPacket()}
                      >
                        {apiBusy === "codex" ? "Copying" : "Copy build packet"}
                      </Button>
                    ) : null}
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      {activeProposalIsPr
                        ? activeExecution
                          ? "Logged the PR record only. It does not merge, deploy, or spend funds."
                          : "Manual handoff for a prepared branch. It does not merge, deploy, or spend funds."
                        : "Use support items for context, drafts, or room updates outside the PR build step."}
                    </p>
                    {codexPacketNotice ? <p className="mt-2 text-xs leading-5 text-cyan-300">{codexPacketNotice}</p> : null}
                  </div>
                  <div className="rounded-md border border-zinc-800 bg-black p-4">
                    <p className="text-sm font-semibold text-zinc-100">Review</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {activeReview?.summary ? humanizeLegacyCommandCopy(activeReview.summary) : "Waiting for execution artifacts."}
                    </p>
                    {visibleReviewChecks.length ? (
                      <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                        {visibleReviewChecks.map((check) => (
                          <li key={check}>- {humanizeLegacyCommandCopy(check)}</li>
                        ))}
                      </ul>
                    ) : null}
                    {hiddenReviewChecks.length ? (
                      <details className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 p-3">
                        <summary className="cursor-pointer text-sm font-semibold text-zinc-100">
                          Show {hiddenReviewChecks.length} more check{hiddenReviewChecks.length === 1 ? "" : "s"}
                        </summary>
                        <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                          {hiddenReviewChecks.map((check) => (
                            <li key={check}>- {humanizeLegacyCommandCopy(check)}</li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                    {activeReview?.proof ? (
                      <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Proof</p>
                        <p className="mt-1 break-all text-xs leading-5 text-zinc-400">
                          {activeReview.proof.verifierVersion} / {activeReview.proof.attestationHash}
                        </p>
                      </div>
                    ) : null}
                    {activeExecution && !activeReview ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <Button type="button" variant="secondary" onClick={() => void copyBuilderWaveReviewRequestDraft()}>
                          Copy review request
                        </Button>
                        {activeExecutionPrUrl ? <LinkButton href={activeExecutionPrUrl}>Open PR</LinkButton> : null}
                      </div>
                    ) : null}
                    {reviewRequestNotice ? <p className="mt-2 text-xs leading-5 text-zinc-500">{reviewRequestNotice}</p> : null}
                    {canRunReview ? (
                      <Button
                        type="button"
                        className="mt-3"
                        variant="secondary"
                        disabled={isBusy}
                        onClick={runGuardianReview}
                      >
                        {apiBusy === "review" ? "Reviewing" : "Review result"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No work yet. Suggest one to start.</p>
            )}
            </Panel>
          </section>
            </details>
          </div>
        </details>

        <details id="reports" className="scroll-mt-4 border-b border-zinc-800 pb-5">
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-lg font-semibold text-zinc-50">
            <span>Reports and updates</span>
            <Badge className="border-zinc-700 bg-zinc-950 text-zinc-300">optional</Badge>
          </summary>
          <div className="mt-4 grid gap-5">
            <Panel title="Activity report" eyebrow="Human review">
              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
              <p className="text-sm leading-6 text-zinc-400">{contributionReport.summary}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                AI-readable activity evidence for humans to review. It does not grant REP, TDH, payouts, permissions, or merge rights.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="secondary" onClick={() => void copyContributionReportDraft()}>
                  Copy report
                </Button>
                <JumpLink href="#share-back">Share back</JumpLink>
              </div>
              {contributionReportNotice ? <p className="mt-2 text-xs leading-5 text-zinc-500">{contributionReportNotice}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {contributionReport.notes.map((note) => (
                  <Badge key={note} className="border-zinc-700 bg-zinc-900 text-zinc-300">
                    {note}
                  </Badge>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-normal text-zinc-500">Evidence</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {contributionReport.evidence.map((item) => (
                  <Badge key={item} className="border-zinc-700 bg-zinc-900 text-zinc-300">
                    {item}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 grid gap-3 rounded-md border border-zinc-800 bg-black p-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Included</p>
                  <ul className="mt-2 grid gap-1 text-xs leading-5 text-zinc-500">
                    {contributionReport.coverage.included.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Not included</p>
                  <ul className="mt-2 grid gap-1 text-xs leading-5 text-zinc-500">
                    {contributionReport.coverage.notIncluded.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-normal text-zinc-500">Report points</p>
              <ul className="mt-2 grid gap-1 text-xs leading-5 text-zinc-500">
                {contributionReport.scoringRubric.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div className="divide-y divide-zinc-800 rounded-md border border-zinc-800 bg-black">
              {contributionReport.contributors.map((contributor) => (
                <div key={contributor.identity} className="grid gap-2 p-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{contributor.identity}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{contributor.rationale.join(", ")}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">Activity basis: {contributor.scoreBasis.join(", ")}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Badge className="border-cyan-700 bg-cyan-950/45 text-cyan-100">
                      {contributor.score} report points
                    </Badge>
                    <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">
                      {countLabel(contributor.proposals, "proposal")}
                    </Badge>
                    <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{countLabel(contributor.votes, "vote")}</Badge>
                    {contributor.decisions ? (
                      <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">
                        {countLabel(contributor.decisions, "decision")}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              ))}
                </div>
              </div>
            </Panel>

            <Panel title="Fee planning" eyebrow="Separate decision">
              <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
              <p className="text-sm leading-6 text-zinc-400">{developerFeePlan.summary}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Planning record only. Humans approve the budget and move funds outside this app.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="secondary" onClick={() => void copyDeveloperFeePlanDraft()}>
                  Copy planning draft
                </Button>
                {wave.waveUrl ? <LinkButton href={wave.waveUrl}>Open room</LinkButton> : null}
              </div>
              {developerFeePlanNotice ? <p className="mt-2 text-xs leading-5 text-zinc-500">{developerFeePlanNotice}</p> : null}
              <Badge className="mt-3 border-amber-700 bg-amber-950/45 text-amber-100">
                {developerFeePlan.mode.replaceAll("_", " ")}
              </Badge>
            </div>
            <div className="grid gap-3 xl:grid-cols-3">
              <CompactList title="Records" items={developerFeePlan.evidenceInputs} />
              <CompactList title="Decisions" items={developerFeePlan.requiredDecisions} />
              <CompactList title="Blocked" items={developerFeePlan.blockedActions} />
                </div>
              </div>
            </Panel>
          </div>

          <div id="share-back" className="mt-5">
            <Panel title="Room update draft" eyebrow="Share back">
            <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-sm leading-6 text-zinc-400">
                  Edit the short update, share it manually in the room, and keep the launch packet with the PR audit trail.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Button type="button" variant="secondary" onClick={() => void copyWaveUpdateDraft()}>
                    Copy update
                  </Button>
                  {wave.waveUrl ? <LinkButton href={wave.waveUrl}>Open room</LinkButton> : null}
                  <Button type="button" variant="secondary" onClick={resetWaveUpdateDraft}>
                    Reset draft
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void copyLaunchPacket()}>
                    Copy packet
                  </Button>
                </div>
                {copyNotice ? <p className="mt-2 text-xs leading-5 text-zinc-500">{copyNotice}</p> : null}
                <div className="mt-3 rounded-md border border-zinc-800 bg-black p-3">
                  <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Verification links</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Include these links so builders can verify setup, project state, and launch audit status.
                  </p>
                  <div className="mt-3 grid gap-2">
                    <a
                      className="break-all text-xs font-semibold leading-5 text-cyan-300 hover:text-cyan-200"
                      href={launchVerificationTargets.setupProofUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {launchVerificationTargets.setupProofUrl}
                    </a>
                    <a
                      className="break-all text-xs font-semibold leading-5 text-cyan-300 hover:text-cyan-200"
                      href={launchVerificationTargets.commandWaveStateUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {launchVerificationTargets.commandWaveStateUrl}
                    </a>
                    <a
                      className="break-all text-xs font-semibold leading-5 text-cyan-300 hover:text-cyan-200"
                      href={launchVerificationTargets.launchAuditUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {launchVerificationTargets.launchAuditUrl}
                    </a>
                  </div>
                </div>
              </div>
              <Textarea
                key={waveUpdateDraft}
                inputRef={waveUpdateDraftRef}
                rows={12}
                defaultValue={waveUpdateDraft}
                className="min-h-72 resize-none font-mono text-sm"
              />
            </div>
            </Panel>
          </div>
        </details>

      </div>
    </main>
  );
}
