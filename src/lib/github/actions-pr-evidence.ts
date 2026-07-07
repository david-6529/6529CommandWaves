import type { HookChangedFile } from "../safety/hook-diff-policy";
import type { GuardianRepositoryEvidence } from "./pr-reviewer-gate";

export type GitHubPullRequestEvent = {
  repository?: {
    full_name?: string | null;
    html_url?: string | null;
    name?: string | null;
    owner?: {
      login?: string | null;
    } | null;
  };
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
  repository?: GuardianRepositoryEvidence;
};

export type GuardianPrCheckEnv = Record<string, string | undefined>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function repositoryEvidenceFromGitHubEvent(event: GitHubPullRequestEvent): GuardianRepositoryEvidence | undefined {
  const repository = event.repository;
  const fullName = repository?.full_name?.trim() ?? "";
  const fullNameParts = fullName.split("/");
  const owner = fullNameParts.length === 2 ? fullNameParts[0] : (repository?.owner?.login?.trim() ?? "");
  const repo = fullNameParts.length === 2 ? fullNameParts[1] : (repository?.name?.trim() ?? "");

  if (!owner || !repo) {
    return undefined;
  }

  return {
    owner,
    repo,
    htmlUrl: repository?.html_url?.trim() || `https://github.com/${owner}/${repo}`,
  };
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

  const repository = repositoryEvidenceFromGitHubEvent(event);

  return {
    pullRequestBody: pullRequest.body ?? "",
    changedPaths,
    ...(repository ? { repository } : {}),
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
