import type { RepoAdapter, RepoCheckRunInput, RepoPullRequestCommentInput, RepoPullRequestInput } from "../adapters";
import { fetchTextResponseWithTimeout } from "../http-fetch";
import { parseGitHubRepoUrl, pullRequestUrl } from "./repo";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type GitHubPullRequestAdapterOptions = {
  apiBaseUrl?: string;
  defaultBaseBranch?: string;
  fetchImpl?: FetchLike;
  token?: string;
  env?: Record<string, string | undefined>;
};

function envValue(env: Record<string, string | undefined>, key: string) {
  return env[key]?.trim() || undefined;
}

function githubToken(options: GitHubPullRequestAdapterOptions) {
  return options.token?.trim() || envValue(options.env ?? process.env, "COMMAND_WAVE_GITHUB_TOKEN") || envValue(options.env ?? process.env, "GITHUB_TOKEN");
}

function githubBaseBranch(options: GitHubPullRequestAdapterOptions, input: RepoPullRequestInput) {
  return input.baseBranch ?? options.defaultBaseBranch ?? envValue(options.env ?? process.env, "COMMAND_WAVE_GITHUB_BASE_BRANCH") ?? "main";
}

function isFullSha(value: string) {
  return /^[0-9a-f]{40}$/i.test(value);
}

function validatePreparedBranchName(value: string, label: string) {
  const branch = value.trim();
  const invalid =
    !branch ||
    branch.length > 160 ||
    isFullSha(branch) ||
    branch.startsWith("/") ||
    branch.startsWith(".") ||
    branch.startsWith("refs/") ||
    branch.startsWith("heads/") ||
    branch.startsWith("tags/") ||
    branch.startsWith("remotes/") ||
    branch.endsWith("/") ||
    branch.endsWith(".") ||
    branch.endsWith(".lock") ||
    branch.includes("..") ||
    branch.includes("@{") ||
    /[\s~^:?*[\\\x00-\x1f\x7f]/.test(branch);

  if (invalid) {
    throw Object.assign(new Error(`${label} must be a prepared branch name in the target repo.`), { status: 400 });
  }

  return branch;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function payloadNumber(value: Record<string, unknown> | null) {
  return typeof value?.number === "number" && Number.isFinite(value.number) ? value.number : null;
}

function payloadText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function payloadId(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? value : null;
}

function validatePullRequestNumber(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw Object.assign(new Error("Pull request number must be a positive integer."), { status: 400 });
  }

  return value;
}

function validateCommentBody(value: string) {
  const body = value.trim();

  if (!body) {
    throw Object.assign(new Error("Pull request comment body is required."), { status: 400 });
  }

  if (body.length > 65_536) {
    throw Object.assign(new Error("Pull request comment body must be 65536 characters or less."), { status: 400 });
  }

  return body;
}

function validateCheckRunName(value: string) {
  const name = value.trim();

  if (!name) {
    throw Object.assign(new Error("GitHub check run name is required."), { status: 400 });
  }

  if (name.length > 100) {
    throw Object.assign(new Error("GitHub check run name must be 100 characters or less."), { status: 400 });
  }

  return name;
}

function validateCheckRunHeadSha(value: string) {
  const headSha = value.trim();

  if (!/^[0-9a-f]{40}$/i.test(headSha)) {
    throw Object.assign(new Error("GitHub check run head SHA must be a full 40-character SHA."), { status: 400 });
  }

  return headSha;
}

function validateCheckRunSummary(value: string) {
  const summary = value.trim();

  if (!summary) {
    throw Object.assign(new Error("GitHub check run summary is required."), { status: 400 });
  }

  if (summary.length > 65_536) {
    throw Object.assign(new Error("GitHub check run summary must be 65536 characters or less."), { status: 400 });
  }

  return summary;
}

function validateCheckRunState(input: RepoCheckRunInput) {
  const status = input.status ?? (input.conclusion ? "completed" : "in_progress");

  if (input.conclusion && status !== "completed") {
    throw Object.assign(new Error("GitHub check run conclusion requires completed status."), { status: 400 });
  }

  if (status === "completed" && !input.conclusion) {
    throw Object.assign(new Error("Completed GitHub check runs require a conclusion."), { status: 400 });
  }

  return status;
}

const githubNonOkStatuses = Array.from({ length: 400 }, (_value, index) => index + 200).filter(
  (status) => status < 200 || status > 299,
);

async function requestGitHub(
  apiBaseUrl: string,
  repoPath: string,
  token: string,
  fetchImpl: FetchLike,
  body: unknown,
  failureLabel: string,
) {
  const response = await fetchTextResponseWithTimeout(`${apiBaseUrl.replace(/\/$/, "")}${repoPath}`, {
    allowedStatuses: githubNonOkStatuses,
    fetchImpl,
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify(body),
  });

  if (response.status < 200 || response.status > 299) {
    const detail = response.text;

    throw Object.assign(
      new Error(`${failureLabel} failed: ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ""}`),
      { status: response.status },
    );
  }

  try {
    return asRecord(JSON.parse(response.text));
  } catch {
    throw Object.assign(new Error(`${failureLabel} response must be valid JSON.`), { status: 502 });
  }
}

function repoApiPath(repo: NonNullable<ReturnType<typeof parseGitHubRepoUrl>>, path: string) {
  return `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}${path}`;
}

export function createGitHubPullRequestAdapter(options: GitHubPullRequestAdapterOptions = {}): RepoAdapter {
  const apiBaseUrl = options.apiBaseUrl ?? "https://api.github.com";
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async openPullRequest(input) {
      const repo = parseGitHubRepoUrl(input.repoUrl);
      const token = githubToken(options);

      if (!repo) {
        throw Object.assign(new Error("GitHub repo must be a github.com URL or owner/repo shorthand."), { status: 400 });
      }

      const headBranch = validatePreparedBranchName(input.branchName, "Head branch");
      const baseBranch = validatePreparedBranchName(githubBaseBranch(options, input), "Base branch");
      if (!token) {
        throw Object.assign(new Error("Opening GitHub PRs requires COMMAND_WAVE_GITHUB_TOKEN or GITHUB_TOKEN."), {
          status: 503,
        });
      }

      if (input.draft === false) {
        throw Object.assign(new Error("GitHub PR adapter only opens draft PRs in phase 1."), { status: 400 });
      }

      const payload = await requestGitHub(
        apiBaseUrl,
        repoApiPath(repo, "/pulls"),
        token,
        fetchImpl,
        {
          title: input.title,
          body: input.body,
          head: headBranch,
          base: baseBranch,
          draft: true,
          maintainer_can_modify: input.maintainerCanModify ?? false,
        },
        "GitHub PR creation",
      );

      const prNumber = payloadNumber(payload);
      const head = asRecord(payload?.head);
      const htmlUrl = payloadText(payload?.html_url);
      const headSha = payloadText(head?.sha);

      if (!prNumber) {
        throw Object.assign(new Error("GitHub PR creation response did not include a PR number."), { status: 502 });
      }

      return {
        prNumber,
        url: htmlUrl ?? pullRequestUrl(repo.htmlUrl, prNumber) ?? `${repo.htmlUrl}/pull/${prNumber}`,
        headSha: headSha ?? "unknown",
      };
    },
    async commentOnPullRequest(input: RepoPullRequestCommentInput) {
      const repo = parseGitHubRepoUrl(input.repoUrl);
      const token = githubToken(options);

      if (!repo) {
        throw Object.assign(new Error("GitHub repo must be a github.com URL or owner/repo shorthand."), { status: 400 });
      }

      if (!token) {
        throw Object.assign(new Error("Posting GitHub PR comments requires COMMAND_WAVE_GITHUB_TOKEN or GITHUB_TOKEN."), {
          status: 503,
        });
      }

      const prNumber = validatePullRequestNumber(input.prNumber);
      const body = validateCommentBody(input.body);
      const payload = await requestGitHub(
        apiBaseUrl,
        repoApiPath(repo, `/issues/${prNumber}/comments`),
        token,
        fetchImpl,
        { body },
        "GitHub PR comment",
      );

      return {
        id: payloadId(payload?.id),
        url: payloadText(payload?.html_url) ?? `${repo.htmlUrl}/pull/${prNumber}#issuecomment-unknown`,
      };
    },
    async createCheckRun(input: RepoCheckRunInput) {
      const repo = parseGitHubRepoUrl(input.repoUrl);
      const token = githubToken(options);

      if (!repo) {
        throw Object.assign(new Error("GitHub repo must be a github.com URL or owner/repo shorthand."), { status: 400 });
      }

      if (!token) {
        throw Object.assign(new Error("Creating GitHub check runs requires COMMAND_WAVE_GITHUB_TOKEN or GITHUB_TOKEN."), {
          status: 503,
        });
      }

      const name = validateCheckRunName(input.name);
      const headSha = validateCheckRunHeadSha(input.headSha);
      const summary = validateCheckRunSummary(input.summary);
      const status = validateCheckRunState(input);
      const payload = await requestGitHub(
        apiBaseUrl,
        repoApiPath(repo, "/check-runs"),
        token,
        fetchImpl,
        {
          name,
          head_sha: headSha,
          status,
          ...(input.conclusion ? { conclusion: input.conclusion } : {}),
          ...(input.detailsUrl?.trim() ? { details_url: input.detailsUrl.trim() } : {}),
          ...(input.externalId?.trim() ? { external_id: input.externalId.trim() } : {}),
          output: {
            title: name,
            summary,
          },
        },
        "GitHub check run",
      );

      return {
        id: payloadId(payload?.id),
        url: payloadText(payload?.html_url) ?? `${repo.htmlUrl}/commit/${headSha}/checks`,
        status: payloadText(payload?.status),
        conclusion: payloadText(payload?.conclusion),
      };
    },
  };
}
