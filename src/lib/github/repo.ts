export type GitHubRepoRef = {
  owner: string;
  repo: string;
  htmlUrl: string;
};

export type GitHubRepoMetadata = GitHubRepoRef & {
  defaultBranch: string | null;
  private: boolean | null;
  archived: boolean | null;
};

export function parseGitHubRepoUrl(value: string): GitHubRepoRef | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const sshMatch = trimmed.match(/^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/);
  const shorthandMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  const urlMatch = trimmed.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s?#]+)(?:[?#].*)?$/);
  const match = sshMatch ?? urlMatch ?? shorthandMatch;

  if (!match) {
    return null;
  }

  const owner = match[1]!;
  const repo = match[2]!.replace(/\.git$/, "");

  if (!owner || !repo) {
    return null;
  }

  return {
    owner,
    repo,
    htmlUrl: `https://github.com/${owner}/${repo}`,
  };
}

export function commandBranchName(proposalId: string, title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `command/${proposalId}${slug ? `-${slug}` : ""}`;
}

export function pullRequestUrl(repoUrl: string, prNumber: number) {
  const repo = parseGitHubRepoUrl(repoUrl);

  if (!repo) {
    return null;
  }

  return `${repo.htmlUrl}/pull/${prNumber}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function githubApiHeaders() {
  const token = process.env.GITHUB_TOKEN;

  return {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

export async function getGitHubRepoMetadata(repoUrl: string): Promise<GitHubRepoMetadata> {
  const repo = parseGitHubRepoUrl(repoUrl);

  if (!repo) {
    throw Object.assign(new Error("GitHub repo must be a github.com URL or owner/repo shorthand."), { status: 400 });
  }

  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`, {
    headers: githubApiHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw Object.assign(new Error(`GitHub repo check failed: ${response.status} ${response.statusText}`), {
      status: response.status,
    });
  }

  const payload = asRecord(await response.json());

  return {
    ...repo,
    defaultBranch: typeof payload?.default_branch === "string" ? payload.default_branch : null,
    private: typeof payload?.private === "boolean" ? payload.private : null,
    archived: typeof payload?.archived === "boolean" ? payload.archived : null,
  };
}
