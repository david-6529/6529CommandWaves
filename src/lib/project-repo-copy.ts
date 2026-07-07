import { githubRepoPlaceholder } from "./agent-identities";
import { isPlaceholderValue } from "./env-placeholders";
import { parseGitHubRepoUrl } from "./github/repo";

export function projectRepoText(repoUrl: string) {
  const trimmed = repoUrl.trim();

  if (!trimmed) {
    return "not set";
  }

  if (isPlaceholderValue(trimmed)) {
    return `${githubRepoPlaceholder.label} (${githubRepoPlaceholder.nextStep})`;
  }

  return trimmed;
}

export function projectRepoLine(label: string, repoUrl: string) {
  return `${label}: ${projectRepoText(repoUrl)}`;
}

export function contributorRulesReferenceLine(repoUrl: string) {
  if (isPlaceholderValue(repoUrl)) {
    return null;
  }

  const repo = parseGitHubRepoUrl(repoUrl);

  return repo ? `Contributor rules: ${repo.htmlUrl}/blob/main/CONTRIBUTING.md` : null;
}
