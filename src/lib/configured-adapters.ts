import type { OrchestratorAdapter, RepoAdapter } from "./adapters";
import { createGitHubPullRequestAdapter } from "./github/pr-adapter";
import {
  createLocalOrchestratorAdapter,
  localGuardianAdapter,
  localOrchestratorAdapter,
  localRepoAdapter,
} from "./local-adapters";

export type RepoAdapterMode = "local" | "github";

function envValue(env: Record<string, string | undefined>, key: string) {
  return env[key]?.trim() || undefined;
}

export function repoAdapterModeFromEnv(env: Record<string, string | undefined> = process.env): RepoAdapterMode {
  return envValue(env, "COMMAND_WAVE_REPO_ADAPTER") === "github" ? "github" : "local";
}

export function getConfiguredRepoAdapter(env: Record<string, string | undefined> = process.env): RepoAdapter {
  if (repoAdapterModeFromEnv(env) === "github") {
    return createGitHubPullRequestAdapter({ env });
  }

  return localRepoAdapter;
}

export function getConfiguredOrchestratorAdapter(
  env: Record<string, string | undefined> = process.env,
): OrchestratorAdapter {
  if (repoAdapterModeFromEnv(env) === "github") {
    return createLocalOrchestratorAdapter({
      repoAdapter: getConfiguredRepoAdapter(env),
      baseBranch: envValue(env, "COMMAND_WAVE_GITHUB_BASE_BRANCH") ?? "main",
    });
  }

  return localOrchestratorAdapter;
}

export function getConfiguredGuardianAdapter() {
  return localGuardianAdapter;
}
