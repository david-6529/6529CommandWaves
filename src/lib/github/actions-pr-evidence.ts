import type { HookChangedFile } from "../safety/hook-diff-policy";

export type GitHubPullRequestEvent = {
  pull_request?: {
    body?: string | null;
    files_url?: string | null;
    number?: number;
  };
};

export type PullRequestEvidence = {
  pullRequestBody: string;
  changedPaths: string[];
  changedFiles?: HookChangedFile[];
};

export type GuardianPrCheckEnv = Record<string, string | undefined>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function pullRequestEvidenceFromGitHubEvent(
  event: GitHubPullRequestEvent,
  changedPaths: string[],
  changedFiles: HookChangedFile[] = [],
): PullRequestEvidence | null {
  const pullRequest = event.pull_request;

  if (!pullRequest) {
    return null;
  }

  return {
    pullRequestBody: pullRequest.body ?? "",
    changedPaths,
    ...(changedFiles.length ? { changedFiles } : {}),
  };
}

export function changedFilesFromGitHubFilesPayload(payload: unknown): HookChangedFile[] {
  const files = Array.isArray(payload) ? payload : [];

  return files.flatMap((item) => {
    const file = asRecord(item);

    return typeof file.filename === "string"
      ? [
          {
            path: file.filename,
            patch: typeof file.patch === "string" ? file.patch : null,
          },
        ]
      : [];
  });
}

export function changedPathsFromGitHubFilesPayload(payload: unknown) {
  return changedFilesFromGitHubFilesPayload(payload).map((file) => file.path);
}

export function changedPathsFromEnv(value: string | undefined) {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    const paths = asStringArray(parsed);

    return paths.length ? paths : null;
  } catch {
    const paths = value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

    return paths.length ? paths : null;
  }
}

export function demoWaveStateAllowed(env: GuardianPrCheckEnv) {
  return env.COMMAND_WAVE_ALLOW_DEMO_STATE === "true";
}

export function hasConfiguredWaveState(env: GuardianPrCheckEnv) {
  return Boolean(env.COMMAND_WAVE_STATE_PATH?.trim() || env.COMMAND_WAVE_STATE_URL?.trim());
}

export function assertGuardianWaveStateConfigured(env: GuardianPrCheckEnv) {
  if (hasConfiguredWaveState(env) || demoWaveStateAllowed(env)) {
    return;
  }

  throw new Error(
    "Guardian PR checks require COMMAND_WAVE_STATE_PATH or COMMAND_WAVE_STATE_URL. Set COMMAND_WAVE_ALLOW_DEMO_STATE=true only for local demos.",
  );
}
