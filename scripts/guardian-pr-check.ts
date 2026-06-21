import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { demoWave, type CommandWave } from "../src/lib/command-waves";
import {
  changedPathsFromEnv,
  changedPathsFromGitHubFilesPayload,
  pullRequestEvidenceFromGitHubEvent,
  type GitHubPullRequestEvent,
} from "../src/lib/github/actions-pr-evidence";
import { createGuardianPullRequestAttestation } from "../src/lib/github/pr-reviewer-gate";

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

async function fetchChangedPaths(filesUrl: string, token?: string) {
  const paths: string[] = [];

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

    const pagePaths = changedPathsFromGitHubFilesPayload(await response.json());

    paths.push(...pagePaths);

    if (pagePaths.length < 100) {
      break;
    }
  }

  return paths;
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

  return demoWave;
}

async function loadEvidence(event: GitHubPullRequestEvent) {
  const pullRequest = event.pull_request;

  if (!pullRequest) {
    return null;
  }

  const changedPaths =
    changedPathsFromEnv(process.env.COMMAND_WAVE_CHANGED_PATHS) ??
    (pullRequest.files_url ? await fetchChangedPaths(pullRequest.files_url, process.env.GITHUB_TOKEN) : []);

  return pullRequestEvidenceFromGitHubEvent(event, changedPaths);
}

function writeAttestation(path: string, value: unknown) {
  const outputPath = resolve(path);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`);
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

  const wave = await loadWaveState();
  const attestation = createGuardianPullRequestAttestation({
    wave,
    evidence,
  });
  const outputPath = process.env.GUARDIAN_ATTESTATION_PATH ?? "guardian-attestation.json";

  writeAttestation(outputPath, attestation);

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
