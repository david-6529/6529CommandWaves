import type { RepoAdapter, RepoPullRequestInput } from "../adapters";
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

const githubNonOkStatuses = Array.from({ length: 400 }, (_value, index) => index + 200).filter(
  (status) => status < 200 || status > 299,
);

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

      const response = await fetchTextResponseWithTimeout(
        `${apiBaseUrl.replace(/\/$/, "")}/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/pulls`,
        {
          allowedStatuses: githubNonOkStatuses,
          fetchImpl,
          method: "POST",
          headers: {
            accept: "application/vnd.github+json",
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
            "x-github-api-version": "2022-11-28",
          },
          body: JSON.stringify({
            title: input.title,
            body: input.body,
            head: headBranch,
            base: baseBranch,
            draft: true,
            maintainer_can_modify: input.maintainerCanModify ?? false,
          }),
        },
      );

      if (response.status < 200 || response.status > 299) {
        const detail = response.text;

        throw Object.assign(
          new Error(`GitHub PR creation failed: ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ""}`),
          { status: response.status },
        );
      }

      let payload: Record<string, unknown> | null;

      try {
        payload = asRecord(JSON.parse(response.text));
      } catch {
        throw Object.assign(new Error("GitHub PR creation response must be valid JSON."), { status: 502 });
      }

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
  };
}
