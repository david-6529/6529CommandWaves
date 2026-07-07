import type { GuardianReview } from "./command-waves";
import { configuredGitHubRepo } from "./github/pr-evidence";
import { hashValue } from "./run-manifest";

export function guardianReviewProofBoundToConfiguredRepo(
  review: GuardianReview | null | undefined,
  repoUrl: string | null | undefined,
) {
  const repo = configuredGitHubRepo(repoUrl);
  const repositoryHash = review?.proof?.inputs.repositoryHash;

  return Boolean(repo && repositoryHash && repositoryHash === hashValue(repo));
}
