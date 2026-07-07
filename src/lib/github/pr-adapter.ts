import type {
  RepoAdapter,
  RepoBranchInput,
  RepoCheckRunInput,
  RepoCommitFile,
  RepoCommitInput,
  RepoPullRequestCommentInput,
} from "../adapters";
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

function githubBaseBranch(options: GitHubPullRequestAdapterOptions, input: { baseBranch?: string }) {
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

function validateBranchPair(baseBranch: string, headBranch: string) {
  if (baseBranch === headBranch) {
    throw Object.assign(new Error("Head branch must differ from base branch."), { status: 400 });
  }
}

function validateCommitMessage(value: string) {
  const message = value.trim();

  if (!message) {
    throw Object.assign(new Error("GitHub commit message is required."), { status: 400 });
  }

  if (message.length > 500) {
    throw Object.assign(new Error("GitHub commit message must be 500 characters or less."), { status: 400 });
  }

  return message;
}

function validateCommitPath(value: string) {
  const path = value.trim();
  const segments = path.split("/");
  const invalid =
    !path ||
    path.length > 240 ||
    path.startsWith("/") ||
    path.endsWith("/") ||
    path.includes("\\") ||
    segments.some((segment) => !segment || segment === "." || segment === "..");

  if (invalid) {
    throw Object.assign(new Error("GitHub commit file paths must be relative paths without empty or parent segments."), {
      status: 400,
    });
  }

  return path;
}

function validateCommitFiles(files: RepoCommitFile[]) {
  if (!Array.isArray(files) || files.length === 0) {
    throw Object.assign(new Error("At least one file is required for a GitHub commit."), { status: 400 });
  }

  if (files.length > 20) {
    throw Object.assign(new Error("GitHub commits are limited to 20 files in phase 1."), { status: 400 });
  }

  const seen = new Set<string>();
  let totalSize = 0;

  return files.map((file) => {
    const path = validateCommitPath(file.path);
    const content = file.content;

    if (seen.has(path)) {
      throw Object.assign(new Error("GitHub commit file paths must be unique."), { status: 400 });
    }

    if (content.includes("\0")) {
      throw Object.assign(new Error("GitHub commit file content must be text."), { status: 400 });
    }

    if (content.length > 200_000) {
      throw Object.assign(new Error("Each GitHub commit file must be 200000 characters or less."), { status: 400 });
    }

    seen.add(path);
    totalSize += content.length;

    if (totalSize > 500_000) {
      throw Object.assign(new Error("GitHub commit payload must be 500000 characters or less."), { status: 400 });
    }

    return { path, content };
  });
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

function payloadFullSha(value: unknown, message: string) {
  const sha = payloadText(value);

  if (!sha || !/^[0-9a-f]{40}$/i.test(sha)) {
    throw Object.assign(new Error(message), { status: 502 });
  }

  return sha;
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
  {
    body,
    failureLabel,
    method = "POST",
  }: {
    body?: unknown;
    failureLabel: string;
    method?: "GET" | "PATCH" | "POST";
  },
) {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": "2022-11-28",
  };

  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  const response = await fetchTextResponseWithTimeout(`${apiBaseUrl.replace(/\/$/, "")}${repoPath}`, {
    allowedStatuses: githubNonOkStatuses,
    fetchImpl,
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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

function branchRefPath(branchName: string, plural = false) {
  return `/git/${plural ? "refs" : "ref"}/heads/${branchName.split("/").map(encodeURIComponent).join("/")}`;
}

export function createGitHubPullRequestAdapter(options: GitHubPullRequestAdapterOptions = {}): RepoAdapter {
  const apiBaseUrl = options.apiBaseUrl ?? "https://api.github.com";
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async prepareBranch(input: RepoBranchInput) {
      const repo = parseGitHubRepoUrl(input.repoUrl);
      const token = githubToken(options);

      if (!repo) {
        throw Object.assign(new Error("GitHub repo must be a github.com URL or owner/repo shorthand."), { status: 400 });
      }

      const headBranch = validatePreparedBranchName(input.branchName, "Head branch");
      const baseBranch = validatePreparedBranchName(githubBaseBranch(options, input), "Base branch");
      validateBranchPair(baseBranch, headBranch);

      if (!token) {
        throw Object.assign(new Error("Preparing GitHub branches requires COMMAND_WAVE_GITHUB_TOKEN or GITHUB_TOKEN."), {
          status: 503,
        });
      }

      const baseRef = await requestGitHub(apiBaseUrl, repoApiPath(repo, branchRefPath(baseBranch)), token, fetchImpl, {
        failureLabel: "GitHub base branch lookup",
        method: "GET",
      });
      const baseObject = asRecord(baseRef?.object);
      const baseSha = payloadFullSha(baseObject?.sha, "GitHub base branch response did not include a full 40-character SHA.");
      const createdRef = await requestGitHub(apiBaseUrl, repoApiPath(repo, "/git/refs"), token, fetchImpl, {
        body: {
          ref: `refs/heads/${headBranch}`,
          sha: baseSha,
        },
        failureLabel: "GitHub branch creation",
      });

      return {
        branchName: headBranch,
        baseBranch,
        baseSha,
        ref: payloadText(createdRef?.ref) ?? `refs/heads/${headBranch}`,
        url: `${repo.htmlUrl}/tree/${headBranch}`,
      };
    },
    async commitFiles(input: RepoCommitInput) {
      const repo = parseGitHubRepoUrl(input.repoUrl);
      const token = githubToken(options);

      if (!repo) {
        throw Object.assign(new Error("GitHub repo must be a github.com URL or owner/repo shorthand."), { status: 400 });
      }

      const branchName = validatePreparedBranchName(input.branchName, "Branch");
      const message = validateCommitMessage(input.message);
      const files = validateCommitFiles(input.files);

      if (!token) {
        throw Object.assign(new Error("Creating GitHub commits requires COMMAND_WAVE_GITHUB_TOKEN or GITHUB_TOKEN."), {
          status: 503,
        });
      }

      const refPayload = await requestGitHub(apiBaseUrl, repoApiPath(repo, branchRefPath(branchName)), token, fetchImpl, {
        failureLabel: "GitHub branch lookup",
        method: "GET",
      });
      const refObject = asRecord(refPayload?.object);
      const parentSha = payloadFullSha(refObject?.sha, "GitHub branch response did not include a full 40-character SHA.");
      const parentCommit = await requestGitHub(apiBaseUrl, repoApiPath(repo, `/git/commits/${parentSha}`), token, fetchImpl, {
        failureLabel: "GitHub parent commit lookup",
        method: "GET",
      });
      const parentTree = asRecord(parentCommit?.tree);
      const parentTreeSha = payloadFullSha(
        parentTree?.sha,
        "GitHub parent commit response did not include a full 40-character tree SHA.",
      );
      const treePayload = await requestGitHub(apiBaseUrl, repoApiPath(repo, "/git/trees"), token, fetchImpl, {
        body: {
          base_tree: parentTreeSha,
          tree: files.map((file) => ({
            path: file.path,
            mode: "100644",
            type: "blob",
            content: file.content,
          })),
        },
        failureLabel: "GitHub tree creation",
      });
      const treeSha = payloadFullSha(treePayload?.sha, "GitHub tree creation response did not include a full 40-character SHA.");
      const commitPayload = await requestGitHub(apiBaseUrl, repoApiPath(repo, "/git/commits"), token, fetchImpl, {
        body: {
          message,
          tree: treeSha,
          parents: [parentSha],
        },
        failureLabel: "GitHub commit creation",
      });
      const commitSha = payloadFullSha(
        commitPayload?.sha,
        "GitHub commit creation response did not include a full 40-character SHA.",
      );

      await requestGitHub(apiBaseUrl, repoApiPath(repo, branchRefPath(branchName, true)), token, fetchImpl, {
        body: {
          sha: commitSha,
          force: false,
        },
        failureLabel: "GitHub branch update",
        method: "PATCH",
      });

      return {
        branchName,
        commitSha,
        url: payloadText(commitPayload?.html_url) ?? `${repo.htmlUrl}/commit/${commitSha}`,
        changedPaths: files.map((file) => file.path),
      };
    },
    async openPullRequest(input) {
      const repo = parseGitHubRepoUrl(input.repoUrl);
      const token = githubToken(options);

      if (!repo) {
        throw Object.assign(new Error("GitHub repo must be a github.com URL or owner/repo shorthand."), { status: 400 });
      }

      const headBranch = validatePreparedBranchName(input.branchName, "Head branch");
      const baseBranch = validatePreparedBranchName(githubBaseBranch(options, input), "Base branch");
      validateBranchPair(baseBranch, headBranch);
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
          body: {
            title: input.title,
            body: input.body,
            head: headBranch,
            base: baseBranch,
            draft: true,
            maintainer_can_modify: input.maintainerCanModify ?? false,
          },
          failureLabel: "GitHub PR creation",
        },
      );

      const prNumber = payloadNumber(payload);
      const head = asRecord(payload?.head);
      const htmlUrl = payloadText(payload?.html_url);
      const headSha = payloadText(head?.sha);

      if (!prNumber) {
        throw Object.assign(new Error("GitHub PR creation response did not include a PR number."), { status: 502 });
      }

      const prHeadSha = payloadFullSha(headSha, "GitHub PR creation response did not include a full head SHA.");

      return {
        prNumber,
        url: htmlUrl ?? pullRequestUrl(repo.htmlUrl, prNumber) ?? `${repo.htmlUrl}/pull/${prNumber}`,
        headSha: prHeadSha,
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
        {
          body: { body },
          failureLabel: "GitHub PR comment",
        },
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
          body: {
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
          failureLabel: "GitHub check run",
        },
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
