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
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function pullRequestEvidenceFromGitHubEvent(
  event: GitHubPullRequestEvent,
  changedPaths: string[],
): PullRequestEvidence | null {
  const pullRequest = event.pull_request;

  if (!pullRequest) {
    return null;
  }

  return {
    pullRequestBody: pullRequest.body ?? "",
    changedPaths,
  };
}

export function changedPathsFromGitHubFilesPayload(payload: unknown) {
  const files = Array.isArray(payload) ? payload : [];

  return files
    .map((item) => {
      const file = asRecord(item);

      return typeof file.filename === "string" ? file.filename : null;
    })
    .filter((item): item is string => Boolean(item));
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
