export type GitHubRepoRef = {
  owner: string;
  repo: string;
  htmlUrl: string;
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
