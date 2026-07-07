import { isPlaceholderValue } from "../env-placeholders";
import { parseGitHubRepoUrl } from "./repo";

export function configuredGitHubRepo(repoUrl: string | null | undefined) {
  const value = repoUrl?.trim() ?? "";

  if (!value || isPlaceholderValue(value)) {
    return null;
  }

  return parseGitHubRepoUrl(value);
}

export function isGitHubPullRequestUrlForRepo(value: string, repoUrl: string | null | undefined) {
  const repo = configuredGitHubRepo(repoUrl);

  if (!repo) {
    return false;
  }

  const match = value.match(/^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/\d+(?:[?#][^\s]*)?$/);

  if (!match) {
    return false;
  }

  return match[1]?.toLowerCase() === repo.owner.toLowerCase() && match[2]?.toLowerCase() === repo.repo.toLowerCase();
}

export function gitHubPullRequestUrlsForRepo(values: string[], repoUrl: string | null | undefined) {
  return values.filter((value) => isGitHubPullRequestUrlForRepo(value, repoUrl));
}
