import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { CommandWave } from "../src/lib/command-waves";
import { demoWave } from "../src/lib/demo-wave";
import {
  assertGuardianWaveStateConfigured,
  changedFilesFromGitHubFilesPayload,
  changedPathsFromEnv,
  demoWaveStateAllowed,
  pullRequestEvidenceFromGitHubEvent,
  type GitHubPullRequestEvent,
  type PullRequestEvidence,
} from "../src/lib/github/actions-pr-evidence";
import { formatGuardianStepSummary } from "../src/lib/github/guardian-summary";
import { createGuardianPullRequestAttestation } from "../src/lib/github/pr-reviewer-gate";
import type { HookChangedFile } from "../src/lib/safety/hook-diff-policy";

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

async function fetchChangedFiles(filesUrl: string, token?: string) {
  const files: HookChangedFile[] = [];

  for (let page = 1; page <= 10; page += 1) {
    const url = new URL(filesUrl);

    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const response = await fetch(url, {
      headers: {
        accept: "application/vnd.github+json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Could not fetch PR files: ${response.status} ${response.statusText}`);
    }

    const pageFiles = changedFilesFromGitHubFilesPayload(await response.json());

    files.push(...pageFiles);

    if (pageFiles.length < 100) {
      break;
    }
  }

  return files;
}

async function loadWaveState() {
  const waveStatePath = process.env.COMMAND_WAVE_STATE_PATH;
  const waveStateUrl = process.env.COMMAND_WAVE_STATE_URL;

  if (waveStatePath?.trim()) {
    return readJsonFile<CommandWave>(resolve(waveStatePath));
  }

  if (waveStateUrl?.trim()) {
    const response = await fetch(waveStateUrl);

    if (!response.ok) {
      throw new Error(`Could not fetch command wave state: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as { wave?: CommandWave };

    return payload.wave ?? payload as CommandWave;
  }

  if (!demoWaveStateAllowed(process.env)) {
    assertGuardianWaveStateConfigured(process.env);
  }

  return demoWave;
}

async function loadEvidence(event: GitHubPullRequestEvent) {
  const pullRequest = event.pull_request;

  if (!pullRequest) {
    return null;
  }

  const envChangedPaths = changedPathsFromEnv(process.env.COMMAND_WAVE_CHANGED_PATHS);
  const changedFiles = envChangedPaths
    ? []
    : pullRequest.files_url
      ? await fetchChangedFiles(pullRequest.files_url, process.env.GITHUB_TOKEN)
      : [];
  const changedPaths = envChangedPaths ?? changedFiles.map((file) => file.path);

  return pullRequestEvidenceFromGitHubEvent(event, changedPaths, changedFiles);
}

function writeAttestation(path: string, value: unknown) {
  const outputPath = resolve(path);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeWaveStateSnapshot(path: string | undefined, wave: CommandWave) {
  const outputPath = path?.trim() || "guardian-wave-state.json";

  writeAttestation(outputPath, wave);
}

function writePullRequestEvidence(path: string | undefined, evidence: PullRequestEvidence) {
  const outputPath = path?.trim() || "guardian-pr-evidence.json";

  writeAttestation(outputPath, evidence);
}

function appendStepSummary(summaryPath: string | undefined, markdown: string) {
  if (!summaryPath?.trim()) {
    return;
  }

  appendFileSync(summaryPath, markdown);
}

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (!eventPath) {
    throw new Error("GITHUB_EVENT_PATH is required.");
  }

  const event = readJsonFile<GitHubPullRequestEvent>(eventPath);
  const evidence = await loadEvidence(event);

  if (!evidence) {
    console.log("No pull request event found. Skipping guardian PR evidence check.");
    return;
  }

  assertGuardianWaveStateConfigured(process.env);

  const wave = await loadWaveState();
  const attestation = createGuardianPullRequestAttestation({
    wave,
    evidence,
  });
  const outputPath = process.env.GUARDIAN_ATTESTATION_PATH ?? "guardian-attestation.json";

  writeAttestation(outputPath, attestation);
  writeWaveStateSnapshot(process.env.GUARDIAN_WAVE_STATE_SNAPSHOT_PATH, wave);
  writePullRequestEvidence(process.env.GUARDIAN_PR_EVIDENCE_PATH, evidence);
  appendStepSummary(process.env.GITHUB_STEP_SUMMARY, formatGuardianStepSummary(attestation));

  console.log(`Guardian status: ${attestation.result.status}`);
  console.log(`Guardian attestation: ${attestation.attestationHash}`);

  for (const check of attestation.result.checks) {
    console.log(`${check.status.toUpperCase()} ${check.id}: ${check.message}`);
  }

  if (attestation.result.status !== "pass") {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
