import type { RepoAdapter, RepoPullRequestInput } from "../adapters";
import { parseGitHubRepoUrl, pullRequestUrl } from "./repo";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type GitHubPullRequestAdapterOptions = {
  apiBaseUrl?: string;
  defaultBaseBranch?: string;
  draftPullRequests?: boolean;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function payloadNumber(value: Record<string, unknown> | null) {
  return typeof value?.number === "number" && Number.isFinite(value.number) ? value.number : null;
}

function payloadText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

      if (!token) {
        throw Object.assign(new Error("Opening GitHub PRs requires COMMAND_WAVE_GITHUB_TOKEN or GITHUB_TOKEN."), {
          status: 503,
        });
      }

      const response = await fetchImpl(
        `${apiBaseUrl.replace(/\/$/, "")}/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/pulls`,
        {
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
            head: input.branchName,
            base: githubBaseBranch(options, input),
            draft: input.draft ?? options.draftPullRequests ?? true,
            maintainer_can_modify: input.maintainerCanModify ?? false,
          }),
        },
      );

      if (!response.ok) {
        const detail = await response.text().catch(() => "");

        throw Object.assign(
          new Error(`GitHub PR creation failed: ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ""}`),
          { status: response.status },
        );
      }

      const payload = asRecord(await response.json());
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
