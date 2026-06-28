"use client";

import { useEffect, useMemo, useState } from "react";
import { attachAdminApiKey } from "@/lib/admin-client";
import {
  classifyRisk,
  evaluatePoll,
  type CommandKind,
  type CommandWave,
} from "@/lib/command-waves";
import { createContributionReport } from "@/lib/contribution-report";
import { createDeveloperFeePlan } from "@/lib/developer-fee-plan";
import { demoWave } from "@/lib/demo-wave";
import { commandWaveProductCopy } from "@/lib/product-copy";
import { humanizeLegacyCommandCopy } from "@/lib/legacy-copy";
import {
  createFirstPhaseLaunchAudit,
  type FirstPhaseLaunchAuditItemStatus,
  type FirstPhaseLaunchAuditStatus,
} from "@/lib/first-phase-launch-audit";
import { createHookProposalPreflight, type HookProposalPreflightCheck } from "@/lib/hook-proposal-preflight";
import { createLaunchPacket } from "@/lib/launch-packet";
import { createPhaseChecklist, type PhaseChecklistStatus } from "@/lib/phase-checklist";
import { createPhaseNextAction, type PhaseNextActionStatus } from "@/lib/phase-next-action";
import { hookParameterPolicySummary } from "@/lib/safety/hook-parameter-policy";
import { toolPolicyForKind } from "@/lib/safety/tool-policy";
import { createWaveUpdateDraft } from "@/lib/wave-update-draft";

type CommandKindOption = { value: CommandKind; label: string; description: string };

const commandKinds: CommandKindOption[] = [
  { value: "read_context", label: "Read context", description: "Summarize or inspect wave/repo state." },
  { value: "draft_response", label: "Draft response", description: "Draft text without posting it." },
  { value: "post_to_wave", label: "Wave update", description: "Draft a public update for human posting." },
  { value: "open_pr", label: "Open PR", description: "Use an agent harness to change code." },
  { value: "run_script", label: "Run script", description: "Execute an approved script or workflow." },
  { value: "deploy", label: "Deploy", description: "Promote an approved change." },
  { value: "spend_money", label: "Spend money", description: "Use paid APIs, compute, bounties, or funds." },
  { value: "change_rules", label: "Change rules", description: "Modify governance or tool permissions." },
];

const firstPhaseProposalKindValues: CommandKind[] = ["open_pr", "draft_response", "post_to_wave", "read_context"];
const firstPhaseProposalKinds = firstPhaseProposalKindValues
  .map((value) => commandKinds.find((item) => item.value === value))
  .filter((item): item is CommandKindOption => Boolean(item));

const hookGuardrails = [
  "No upgradeable hook contracts by default.",
  ...hookParameterPolicySummary.slice(1),
  "Deployment, payments, and governance changes stay human controlled.",
  "Contribution scores are reports, not permissions.",
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

type WaveApiResponse = {
  wave?: CommandWave;
  error?: string;
};

type WaveContextPreview = {
  waveId: string;
  dropCount: number;
  fromDropId: string | null;
  toDropId: string | null;
  context: {
    mode: string;
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
    author: string;
    sourceWaveRole: string | null;
    preview: string;
  }>;
};

type ContextPreviewResponse = {
  preview?: WaveContextPreview;
  error?: string;
};

type WaveSearchResult = {
  id: string;
  name: string;
  description: string | null;
  source: "6529";
};

type WaveSearchResponse = {
  results?: WaveSearchResult[];
  error?: string;
};

type SetupValidation = {
  waveId: string | null;
  repo: {
    owner: string;
    repo: string;
    htmlUrl: string;
  } | null;
  repoMetadata: {
    defaultBranch: string | null;
    private: boolean | null;
    archived: boolean | null;
  } | null;
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "warn" | "fail";
    message: string;
  }>;
  canSave: boolean;
  canRunCode: boolean;
};

type SetupValidationResponse = {
  validation?: SetupValidation;
  error?: string;
};

type ReadinessCheck = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  message: string;
};

type ReadinessResponse = {
  summary: {
    pass: number;
    warn: number;
    fail: number;
  };
  checks: ReadinessCheck[];
  error?: string;
};

type CodexWorkPacketResponse = {
  packet?: {
    proposalId: string;
    targetBranch: string;
    packetHash: string;
    text: string;
  };
  error?: string;
};

const accessKeyStorageKey = "command-waves-access-key";

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
    throw new Error(payload.error ?? "Command wave request failed.");
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
    }),
  });
  const payload = (await response.json()) as ContextPreviewResponse;

  if (!response.ok || !payload.preview) {
    throw new Error(payload.error ?? "Context preview failed.");
  }

  return payload.preview;
}

async function requestWaveSearch(query: string) {
  const response = await fetch(`/api/6529/waves/search?q=${encodeURIComponent(query)}&limit=6`);
  const payload = (await response.json()) as WaveSearchResponse;

  if (!response.ok || !payload.results) {
    throw new Error(payload.error ?? "Wave search failed.");
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
    throw new Error(payload.error ?? "Setup check failed.");
  }

  return payload.validation;
}

async function requestReadiness() {
  const response = await fetch("/api/readiness", {
    headers: { accept: "application/json" },
  });
  const payload = (await response.json()) as ReadinessResponse;

  if (!response.ok || !payload.checks) {
    throw new Error(payload.error ?? "Readiness check failed.");
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
    throw new Error(payload.error ?? "Codex work packet failed.");
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

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/75 p-4 shadow-sm shadow-black/20">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-normal text-cyan-300">{eyebrow}</p> : null}
          <h2 className="text-lg font-semibold text-zinc-50">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function CompactList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-black p-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">{title}</p>
      <ul className="mt-2 grid gap-2 text-sm leading-6 text-zinc-400">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function StepCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-cyan-300">{step}</p>
      <h2 className="mt-2 text-base font-semibold text-zinc-50">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-zinc-200">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-md border border-zinc-800 bg-black px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-500 ${props.className ?? ""}`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-24 w-full resize-y rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-500 ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-10 w-full rounded-md border border-zinc-800 bg-black px-3 text-sm text-zinc-100 outline-none transition focus:border-cyan-500 ${props.className ?? ""}`}
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
      className={`inline-flex h-10 cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-semibold transition disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 ${variantClass} ${className}`}
    />
  );
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
    wave_created: "wave created",
    rules_defined: "setup updated",
    proposal_submitted: "command proposed",
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
  const [waveSearchQuery, setWaveSearchQuery] = useState("");
  const [waveSearchResults, setWaveSearchResults] = useState<WaveSearchResult[]>([]);
  const [accessKey, setAccessKey] = useState(() =>
    typeof window === "undefined" ? "" : window.sessionStorage.getItem(accessKeyStorageKey) ?? "",
  );
  const [proposer, setProposer] = useState("david");
  const [kind, setKind] = useState<CommandKind>("open_pr");
  const [title, setTitle] = useState("Draft the non-upgradeable hook scaffold");
  const [prompt, setPrompt] = useState(
    "Use Codex to draft a non-upgradeable 6529 hook scaffold with fee parameters capped at 100 bps and tests.",
  );
  const [spec, setSpec] = useState(
    "Smart contract work only. No proxy, no delegatecall, no deploy script, no payments, and no governance changes. Include tests for the 100 bps fee cap.",
  );
  const [budgetUsd, setBudgetUsd] = useState("10");
  const [decisionReference, setDecisionReference] = useState("");
  const [apiBusy, setApiBusy] = useState<BusyState | null>(null);
  const [apiNotice, setApiNotice] = useState("Backend demo state is loading.");
  const [apiError, setApiError] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const [codexPacketNotice, setCodexPacketNotice] = useState("");
  const [contextPreview, setContextPreview] = useState<WaveContextPreview | null>(null);
  const [setupValidation, setSetupValidation] = useState<SetupValidation | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const selectedRule = wave.rules.rulesByKind[kind];
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
  const activeProposal = wave.proposals[0];
  const activePoll = activeProposal ? wave.polls.find((poll) => poll.proposalId === activeProposal.id) : undefined;
  const activeExecution = activeProposal ? wave.executions.find((execution) => execution.proposalId === activeProposal.id) : undefined;
  const activeReview = activeProposal ? wave.reviews.find((review) => review.proposalId === activeProposal.id) : undefined;
  const activeProposalIsPr = activeProposal?.kind === "open_pr";
  const canBuildApprovedPr = Boolean(
    activeProposal && activeProposal.kind === "open_pr" && activeProposal.status === "approved" && !activeExecution,
  );
  const canCopyCodexPacket = Boolean(
    activeProposal &&
      activeProposalIsPr &&
      ["approved", "reviewing", "complete"].includes(activeProposal.status),
  );
  const pollResult = activePoll ? evaluatePoll(activePoll) : null;
  const contributionReport = useMemo(() => createContributionReport(wave), [wave]);
  const developerFeePlan = useMemo(() => createDeveloperFeePlan(wave, contributionReport), [wave, contributionReport]);
  const phaseChecklist = useMemo(() => createPhaseChecklist(wave), [wave]);
  const phaseNextAction = useMemo(() => createPhaseNextAction(phaseChecklist), [phaseChecklist]);
  const launchAudit = useMemo(
    () =>
      createFirstPhaseLaunchAudit({
        phaseChecklist,
        readinessChecks: readiness?.checks ?? null,
      }),
    [phaseChecklist, readiness],
  );
  const launchAuditOpenItems = launchAudit.openItems.slice(0, 5);
  const waveUpdateDraft = useMemo(
    () =>
      createWaveUpdateDraft({
        wave,
        proposal: activeProposal ?? null,
        poll: activePoll ?? null,
        execution: activeExecution ?? null,
        review: activeReview ?? null,
      }),
    [activeExecution, activePoll, activeProposal, activeReview, wave],
  );
  const launchPacket = useMemo(
    () =>
      createLaunchPacket({
        wave,
        proposal: activeProposal ?? null,
        poll: activePoll ?? null,
        execution: activeExecution ?? null,
        review: activeReview ?? null,
      }),
    [activeExecution, activePoll, activeProposal, activeReview, wave],
  );
  const recentLedgerEvents = wave.ledger.slice(0, 6);
  const isBusy = apiBusy !== null;

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
          setApiNotice("Backend demo state loaded.");
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setApiError(error instanceof Error ? error.message : "Could not load command wave.");
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

  function updateAccessKey(value: string) {
    setAccessKey(value);

    if (value.trim()) {
      window.sessionStorage.setItem(accessKeyStorageKey, value);
    } else {
      window.sessionStorage.removeItem(accessKeyStorageKey);
    }
  }

  function applyWave(nextWave: CommandWave) {
    setWave(nextWave);
    setWaveUrl(nextWave.waveUrl);
    setRepoUrl(nextWave.repoUrl);
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
      setApiError(error instanceof Error ? error.message : "Command wave action failed.");
    } finally {
      setApiBusy(null);
    }
  }

  async function previewContext() {
    setApiBusy("context");
    setApiError("");

    try {
      const preview = await requestContextPreview(waveUrl);

      setContextPreview(preview);
      setApiNotice(`Context preview loaded for ${preview.dropCount} drops.`);
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
      setApiNotice(results.length ? `Found ${results.length} wave option${results.length === 1 ? "" : "s"}.` : "No waves found.");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Wave search failed.");
    } finally {
      setApiBusy(null);
    }
  }

  function selectWaveResult(result: WaveSearchResult) {
    setWaveUrl(`https://6529.io/waves/${result.id}`);
    setContextPreview(null);
    setSetupValidation(null);
    setApiNotice(`Selected ${result.name}.`);
  }

  async function checkSetup() {
    setApiBusy("setup");
    setApiError("");

    try {
      const validation = await requestSetupValidation(waveUrl, repoUrl);

      setSetupValidation(validation);
      setApiNotice(validation.canSave ? "Setup check passed." : "Setup needs fixes before saving.");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Setup check failed.");
    } finally {
      setApiBusy(null);
    }
  }

  async function checkReadiness() {
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
          body: JSON.stringify({ waveUrl, repoUrl }),
        }, accessKey),
      "Setup saved to the backend ledger.",
    );
  }

  function resetDemo() {
    void runWaveAction("reset", () => requestWave("/api/command-wave", { method: "DELETE" }, accessKey), "Demo state reset.");
  }

  async function copyWaveUpdateDraft() {
    try {
      await navigator.clipboard.writeText(waveUpdateDraft);
      setCopyNotice("Draft copied.");
    } catch {
      setCopyNotice("Copy failed. Select the draft text and copy it manually.");
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
      "Proposal submitted and checked against the rules.",
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
      "Wave decision receipt recorded.",
    );
  }

  function launchOrchestrator() {
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
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="grid gap-4 border-b border-zinc-800 pb-5 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-cyan-300">{commandWaveProductCopy.eyebrow}</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-normal text-zinc-50 sm:text-4xl">
              {commandWaveProductCopy.headline}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-400">{commandWaveProductCopy.subhead}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Simple flow</p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">{commandWaveProductCopy.simpleFlow}</p>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {commandWaveProductCopy.steps.map((step) => (
            <StepCard key={step.step} step={step.step} title={step.title} body={step.body} />
          ))}
        </section>

        <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
          {apiError ? (
            <span className="font-semibold text-red-300">{apiError}</span>
          ) : (
            <span>
              <span className="font-semibold text-zinc-100">Status:</span> {isBusy ? `Working on ${apiBusy}.` : apiNotice}
            </span>
          )}
        </div>

        <section className="grid gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3 md:grid-cols-[10rem_1fr] md:items-center">
          <div className="flex flex-wrap items-center gap-2 md:block">
            <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Next action</p>
            <Badge className={`${nextActionStatusClass(phaseNextAction.status)} mt-0 md:mt-2`}>
              {phaseNextAction.statusLabel}
            </Badge>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-50">{phaseNextAction.title}</h2>
              <Badge className="border-zinc-700 bg-black text-zinc-300">{phaseNextAction.stepLabel}</Badge>
            </div>
            <p className="mt-1 text-sm leading-6 text-zinc-400">{phaseNextAction.detail}</p>
          </div>
        </section>

        <section className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          {phaseChecklist.map((item) => (
            <div key={item.id} className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-100">{item.label}</p>
                <Badge className={phaseStatusClass(item.status)}>{item.status}</Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{item.detail}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Panel title="1. Choose the project" eyebrow="Setup">
            <div className="grid gap-3">
              <p className="text-sm leading-6 text-zinc-400">
                Start with one project wave. You can paste a wave link directly or search by name.
              </p>
              <Field label="6529 wave">
                <Input value={waveUrl} onChange={(event) => setWaveUrl(event.target.value)} />
              </Field>
              <div className="rounded-md border border-zinc-800 bg-black p-3">
                <Field label="Find a wave">
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Input
                      value={waveSearchQuery}
                      placeholder="Type a wave name"
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
              <Field label="GitHub repo">
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
                <div className="flex flex-wrap gap-2">
                  {wave.gates.map((gate) => (
                    <Badge key={gate} className="border-zinc-700 bg-zinc-900 text-zinc-200">
                      {gate}
                    </Badge>
                  ))}
                </div>
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
                <Button type="button" variant="secondary" disabled={isBusy} onClick={() => void previewContext()}>
                  {apiBusy === "context" ? "Loading" : "Preview wave posts"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => downloadJson("command-wave-ledger.json", wave)}>
                  Export activity
                </Button>
              </div>
              <details className="rounded-md border border-zinc-800 bg-black p-3">
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
                    Shows local mode, storage, 6529 mode, GitHub PR adapter, and guardian wave-state readiness.
                  </p>
                  <Button type="button" variant="secondary" disabled={isBusy} onClick={() => void checkReadiness()}>
                    {apiBusy === "readiness" ? "Checking" : "Check readiness"}
                  </Button>
                  <div className="border-t border-zinc-900 pt-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">Public launch audit</p>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">{launchAudit.summary}</p>
                      </div>
                      <Badge className={launchAuditStatusClass(launchAudit.status)}>{launchAudit.statusLabel}</Badge>
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
                      <p className="mt-3 text-xs leading-5 text-zinc-500">No public launch gaps found in these checks.</p>
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
              {contextPreview ? (
                <div className="rounded-md border border-zinc-800 bg-black p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-cyan-700 bg-cyan-950/45 text-cyan-100">{contextPreview.context.mode}</Badge>
                    <Badge className={contextPreview.context.hitCap ? riskClass("medium") : statusClass("complete")}>
                      {contextPreview.context.hitCap ? "hit cap" : "complete fetch"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    Found {contextPreview.dropCount} drops after checking {contextPreview.context.searchedMessages} messages.
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {contextPreview.fromDropId ?? "no first drop"} to {contextPreview.toDropId ?? "no latest drop"}
                  </p>
                  <div className="mt-3 space-y-2">
                    {contextPreview.sampleDrops.slice(-3).map((drop) => (
                      <div key={drop.id} className="border-t border-zinc-900 pt-2">
                        <p className="text-xs font-semibold text-zinc-500">
                          {drop.author} / {drop.id}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-zinc-400">{drop.preview}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid gap-2">
                <Button type="button" variant="danger" disabled={isBusy} onClick={resetDemo}>
                  {apiBusy === "reset" ? "Resetting" : "Reset demo"}
                </Button>
              </div>
            </div>
          </Panel>

          <Panel title="Safety rules" eyebrow={wave.rules.version}>
            <div className="space-y-4">
              <p className="text-sm leading-6 text-zinc-400">
                Phase 1 accepts reads, drafts, wave updates, and PR commands. Scripts, deploys, funds, and rule changes stay parked.
              </p>
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
                <summary className="text-sm font-semibold text-zinc-100">Show command rules and tool access</summary>
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

        <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <Panel title="2. Propose hook work" eyebrow="Builder wave">
            <div className="grid gap-3">
              <p className="text-sm leading-6 text-zinc-400">
                Describe one PR-sized change. Keep the limits clear so the wave knows what it is approving.
              </p>
              <Field label="Your name or agent">
                <Input value={proposer} onChange={(event) => setProposer(event.target.value)} />
              </Field>
              <Field label="What kind of work is this?">
                <Select value={kind} onChange={(event) => setKind(event.target.value as CommandKind)}>
                  {firstPhaseProposalKinds.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Title">
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </Field>
              <Field label="Command">
                <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
              </Field>
              <Field label="Limits and success criteria">
                <Textarea value={spec} onChange={(event) => setSpec(event.target.value)} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Budget cap">
                  <Input value={budgetUsd} onChange={(event) => setBudgetUsd(event.target.value)} />
                </Field>
                <div className="rounded-md border border-zinc-800 bg-black p-3">
                  <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Safety check</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge className={riskClass(classifiedRisk)}>{classifiedRisk} risk</Badge>
                    <Badge className={statusClass(selectedRule.mode)}>{modeLabel(selectedRule.mode)}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{selectedRule.reason}</p>
                </div>
              </div>
              <div className="rounded-md border border-zinc-800 bg-black p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">Hook proposal preflight</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      {hookProposalPreflightRequired
                        ? hookProposalPreflight.summary
                        : "Required only when the command opens a PR."}
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
                          Use this command for context, drafts, or wave updates. PR commands still need hook preflight.
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
              <Button type="button" disabled={isBusy || hookProposalPreflightBlocked} onClick={submitProposal}>
                {apiBusy === "proposal" ? "Proposing" : "Propose work"}
              </Button>
            </div>
          </Panel>

          <Panel title="3. Current work" eyebrow="Decide, build, review">
            {activeProposal ? (
              <div className="space-y-4">
                <div className="rounded-md border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={statusClass(activeProposal.status)}>{activeProposal.status.replaceAll("_", " ")}</Badge>
                    <Badge className={riskClass(activeProposal.risk)}>{activeProposal.risk} risk</Badge>
                    <Badge className="border-zinc-700 bg-zinc-900 text-zinc-200">{activeProposal.kind.replaceAll("_", " ")}</Badge>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-zinc-50">{activeProposal.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{humanizeLegacyCommandCopy(activeProposal.prompt)}</p>
                  <p className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm leading-6 text-zinc-300">
                    {humanizeLegacyCommandCopy(activeProposal.spec)}
                  </p>
                </div>

                {activePoll ? (
                  <div className="rounded-md border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">Vote needed</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Current vote: {activePoll.yesVotes} yes, {activePoll.noVotes} no. Needs{" "}
                          {activePoll.quorumRequired} total votes and {activePoll.yesPercentRequired}% yes.
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">Voting as {proposer || "unnamed voter"}.</p>
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
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isBusy || activePoll.status !== "open"}
                        onClick={() => vote("yes")}
                      >
                        Vote yes
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={isBusy || activePoll.status !== "open"}
                        onClick={() => vote("no")}
                      >
                        Vote no
                      </Button>
                    </div>
                    {activePoll.decision ? (
                      <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-100">Wave decision receipt</p>
                          <Badge className="border-cyan-700 bg-cyan-950/45 text-cyan-100">{activePoll.decision.source}</Badge>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-zinc-500">{activePoll.decision.summary}</p>
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
                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Input
                        value={decisionReference}
                        placeholder="6529 decision URL or drop id"
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
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      Manual evidence only. This does not add live REP, TDH, or weighted voting.
                    </p>
                  </div>
                ) : (
                  <p className="rounded-md border border-emerald-800 bg-emerald-950/25 p-3 text-sm text-emerald-100">
                    This command can run without a vote under the current rules.
                  </p>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-zinc-800 bg-black p-4">
                    <p className="text-sm font-semibold text-zinc-100">Build PR</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {activeExecution?.summary
                        ? humanizeLegacyCommandCopy(activeExecution.summary)
                        : activeProposalIsPr
                          ? "Waiting for an approved PR command."
                          : "Only PR commands use the agent build step in phase 1."}
                    </p>
                    {activeExecution?.artifacts.length ? (
                      <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                        {activeExecution.artifacts.map((artifact) => (
                          <li key={artifact}>- {artifactLabel(artifact)}</li>
                        ))}
                      </ul>
                    ) : null}
                    <Button
                      type="button"
                      className="mt-3"
                      disabled={isBusy || !canBuildApprovedPr}
                      onClick={launchOrchestrator}
                    >
                      {apiBusy === "execute" ? "Building" : activeProposalIsPr ? "Build approved PR" : "PR build not needed"}
                    </Button>
                    <Button
                      type="button"
                      className="mt-2"
                      variant="secondary"
                      disabled={isBusy || !canCopyCodexPacket}
                      onClick={() => void copyCodexWorkPacket()}
                    >
                      {apiBusy === "codex" ? "Copying" : "Copy Codex packet"}
                    </Button>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      {activeProposalIsPr
                        ? "Manual handoff for a prepared branch. It does not merge, deploy, or spend funds."
                        : "Use support commands for context, drafts, or wave updates outside the PR build step."}
                    </p>
                    {codexPacketNotice ? <p className="mt-2 text-xs leading-5 text-cyan-300">{codexPacketNotice}</p> : null}
                  </div>
                  <div className="rounded-md border border-zinc-800 bg-black p-4">
                    <p className="text-sm font-semibold text-zinc-100">Review</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {activeReview?.summary ? humanizeLegacyCommandCopy(activeReview.summary) : "Waiting for execution artifacts."}
                    </p>
                    {activeReview?.checks.length ? (
                      <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                        {activeReview.checks.map((check) => (
                          <li key={check}>- {humanizeLegacyCommandCopy(check)}</li>
                        ))}
                      </ul>
                    ) : null}
                    {activeReview?.proof ? (
                      <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">Proof</p>
                        <p className="mt-1 break-all text-xs leading-5 text-zinc-400">
                          {activeReview.proof.verifierVersion} / {activeReview.proof.attestationHash}
                        </p>
                      </div>
                    ) : null}
                    <Button
                      type="button"
                      className="mt-3"
                      variant="secondary"
                      disabled={isBusy || !activeExecution || activeProposal.status !== "reviewing" || Boolean(activeReview)}
                      onClick={runGuardianReview}
                    >
                      {apiBusy === "review" ? "Reviewing" : "Review result"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No commands yet. Propose one to start.</p>
            )}
          </Panel>
        </section>

        <Panel title="Contribution report" eyebrow="Informational">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm leading-6 text-zinc-400">{contributionReport.summary}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                This report summarizes visible app activity. It does not grant REP, TDH, payouts, permissions, or merge rights.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {contributionReport.notes.map((note) => (
                  <Badge key={note} className="border-zinc-700 bg-zinc-900 text-zinc-300">
                    {note}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="divide-y divide-zinc-800 rounded-md border border-zinc-800 bg-black">
              {contributionReport.contributors.map((contributor) => (
                <div key={contributor.identity} className="grid gap-2 p-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{contributor.identity}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{contributor.rationale.join(", ")}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Badge className="border-cyan-700 bg-cyan-950/45 text-cyan-100">score {contributor.score}</Badge>
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

        <Panel title="Developer fee plan" eyebrow="Manual payout">
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm leading-6 text-zinc-400">{developerFeePlan.summary}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Planning evidence only. Humans approve the budget and move funds outside this app.
              </p>
              <Badge className="mt-3 border-amber-700 bg-amber-950/45 text-amber-100">
                {developerFeePlan.mode.replaceAll("_", " ")}
              </Badge>
            </div>
            <div className="grid gap-3 xl:grid-cols-3">
              <CompactList title="Evidence" items={developerFeePlan.evidenceInputs} />
              <CompactList title="Decisions" items={developerFeePlan.requiredDecisions} />
              <CompactList title="Blocked" items={developerFeePlan.blockedActions} />
            </div>
          </div>
        </Panel>

        <Panel title="Wave update draft" eyebrow="Share back">
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm leading-6 text-zinc-400">
                Share the short update in the builder wave. Keep the launch packet with the PR audit trail.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="secondary" onClick={() => void copyWaveUpdateDraft()}>
                  Copy wave update
                </Button>
                <Button type="button" variant="secondary" onClick={() => void copyLaunchPacket()}>
                  Copy launch packet
                </Button>
              </div>
              {copyNotice ? <p className="mt-2 text-xs leading-5 text-zinc-500">{copyNotice}</p> : null}
            </div>
            <Textarea readOnly rows={12} value={waveUpdateDraft} className="min-h-72 resize-none font-mono text-xs" />
          </div>
        </Panel>

        <Panel title="Recent activity" eyebrow="Log">
          <div className="divide-y divide-zinc-800">
            {recentLedgerEvents.map((event) => (
              <div key={event.id} className="grid gap-2 py-3 md:grid-cols-[7rem_12rem_1fr]">
                <p className="text-xs font-semibold text-zinc-500">{shortTime(event.at)}</p>
                <p className="text-sm font-semibold text-zinc-300">{humanizeLegacyCommandCopy(event.actor)}</p>
                <div>
                  <Badge className="border-zinc-700 bg-zinc-900 text-zinc-300">{eventTypeLabel(event.type)}</Badge>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">{humanizeLegacyCommandCopy(event.message)}</p>
                </div>
              </div>
            ))}
          </div>
          {wave.ledger.length > recentLedgerEvents.length ? (
            <details className="mt-3 rounded-md border border-zinc-800 bg-black p-3">
              <summary className="text-sm font-semibold text-zinc-100">Show older activity</summary>
              <div className="mt-3 divide-y divide-zinc-900">
                {wave.ledger.slice(recentLedgerEvents.length).map((event) => (
                  <div key={event.id} className="grid gap-2 py-3 md:grid-cols-[7rem_12rem_1fr]">
                    <p className="text-xs font-semibold text-zinc-500">{shortTime(event.at)}</p>
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
        </Panel>
      </div>
    </main>
  );
}
