import { commandWaveStateUrlFromEnv } from "../command-wave-state";
import { hasEnvValue, hasProductionValue, isPlaceholderValue, isProductionEnv } from "../env-placeholders";
import { validateSetupShape } from "../setup-validation";

export type ReadinessCheck = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  message: string;
};

function localFileStoreEnabled(env: Record<string, string | undefined>) {
  return Boolean(
    env.COMMAND_WAVE_STORE === "file" ||
      (env.NODE_ENV === "development" && env.COMMAND_WAVE_STORE !== "memory"),
  );
}

function postgresStoreEnabled(env: Record<string, string | undefined>) {
  return Boolean(env.COMMAND_WAVE_STORE === "postgres" || (isProductionEnv(env) && hasEnvValue(env.DATABASE_URL)));
}

function guardianWaveStateConfigured(env: Record<string, string | undefined>) {
  return hasProductionValue(env.COMMAND_WAVE_STATE_PATH, env) || hasProductionValue(env.COMMAND_WAVE_STATE_URL, env);
}

function guardianWaveStateMessage(env: Record<string, string | undefined>, configured: boolean) {
  if (configured) {
    return "Guardian PR checks have a real wave-state source.";
  }

  if (isProductionEnv(env) && (isPlaceholderValue(env.COMMAND_WAVE_STATE_URL) || isPlaceholderValue(env.COMMAND_WAVE_STATE_PATH))) {
    return "Replace placeholder COMMAND_WAVE_STATE_URL with the deployed state URL before guardian PR checks run.";
  }

  const suggestedUrl = commandWaveStateUrlFromEnv(env);

  if (suggestedUrl) {
    return `Missing COMMAND_WAVE_STATE_URL. Set it to ${suggestedUrl} for guardian PR checks.`;
  }

  return "Missing COMMAND_WAVE_STATE_PATH or COMMAND_WAVE_STATE_URL. PR guardian checks cannot verify real wave state.";
}

function githubPrAdapterEnabled(env: Record<string, string | undefined>) {
  return env.COMMAND_WAVE_REPO_ADAPTER === "github";
}

function guardianMode(env: Record<string, string | undefined>) {
  const mode = env.COMMAND_WAVE_GUARDIAN_MODE?.trim() || "repo_local_github_action";

  return mode === "repo_local_github_action" || mode === "external_github_app" ? mode : "unknown";
}

function appUrlCheck(appUrl: string | undefined, env: Record<string, string | undefined>): ReadinessCheck {
  if (!hasEnvValue(appUrl)) {
    return {
      id: "app_url",
      label: "App URL",
      status: "warn",
      message: "Set NEXT_PUBLIC_APP_URL to the deployed app URL before public launch.",
    };
  }

  const trimmed = appUrl!.trim();
  const isHttps = trimmed.startsWith("https://");
  const isLocalhost = trimmed.startsWith("http://localhost") || trimmed.startsWith("http://127.0.0.1");

  if (isProductionEnv(env) && !isHttps) {
    return {
      id: "app_url",
      label: "App URL",
      status: "fail",
      message: "Set NEXT_PUBLIC_APP_URL to the HTTPS deployed app URL before public launch.",
    };
  }

  if (isProductionEnv(env) && isPlaceholderValue(trimmed)) {
    return {
      id: "app_url",
      label: "App URL",
      status: "fail",
      message: "Replace placeholder NEXT_PUBLIC_APP_URL with the deployed app URL before public launch.",
    };
  }

  return {
    id: "app_url",
    label: "App URL",
    status: isHttps || isLocalhost ? "pass" : "warn",
    message: trimmed,
  };
}

function adminApiKeyCheck(env: Record<string, string | undefined>): ReadinessCheck {
  const key = env.ADMIN_API_KEY?.trim() ?? "";

  if (!key) {
    return {
      id: "admin_api_key",
      label: "Admin API key",
      status: "fail",
      message: "Set ADMIN_API_KEY before public launch so protected actions require a key.",
    };
  }

  if (isProductionEnv(env) && isPlaceholderValue(key)) {
    return {
      id: "admin_api_key",
      label: "Admin API key",
      status: "fail",
      message: "Replace placeholder ADMIN_API_KEY with a strong random key before public launch.",
    };
  }

  if (isProductionEnv(env) && key.length < 24) {
    return {
      id: "admin_api_key",
      label: "Admin API key",
      status: "fail",
      message: "Use a strong ADMIN_API_KEY with at least 24 characters before public launch.",
    };
  }

  return {
    id: "admin_api_key",
    label: "Admin API key",
    status: "pass",
    message: "Configured.",
  };
}

function initialHookProjectCheck(env: Record<string, string | undefined>): ReadinessCheck {
  const waveUrl = env.COMMAND_WAVE_INITIAL_WAVE_URL?.trim() ?? "";
  const repoUrl = env.COMMAND_WAVE_INITIAL_REPO_URL?.trim() ?? "";
  const hasWaveUrl = hasEnvValue(waveUrl);
  const hasRepoUrl = hasEnvValue(repoUrl);
  const production = isProductionEnv(env);

  if (!hasWaveUrl || !hasRepoUrl) {
    return {
      id: "initial_hook_project",
      label: "First hook project",
      status: production ? "fail" : "warn",
      message:
        "Set COMMAND_WAVE_INITIAL_WAVE_URL, and set COMMAND_WAVE_INITIAL_REPO_URL to the placeholder or selected hook repo.",
    };
  }

  if (production && (isPlaceholderValue(waveUrl) || isPlaceholderValue(repoUrl))) {
    return {
      id: "initial_hook_project",
      label: "First hook project",
      status: "fail",
      message: "Replace placeholder first project chat before public launch. Replace the repo placeholder before PR work starts.",
    };
  }

  let validShape = false;

  try {
    validShape = validateSetupShape({ waveUrl, repoUrl }).canSave;
  } catch {
    validShape = false;
  }

  if (!validShape) {
    return {
      id: "initial_hook_project",
      label: "First hook project",
      status: "fail",
      message: "Use a valid 6529 wave and GitHub repo placeholder or selected repo for the first hook project.",
    };
  }

  return {
    id: "initial_hook_project",
    label: "First hook project",
    status: "pass",
    message: "First project chat and repo setting are configured.",
  };
}

function databaseCheck(env: Record<string, string | undefined>): ReadinessCheck {
  if (!hasEnvValue(env.DATABASE_URL)) {
    return {
      id: "database",
      label: "Database",
      status: "warn",
      message: "Add DATABASE_URL before durable public audit storage.",
    };
  }

  if (isProductionEnv(env) && isPlaceholderValue(env.DATABASE_URL)) {
    return {
      id: "database",
      label: "Database",
      status: "fail",
      message: "Replace placeholder DATABASE_URL with a real Postgres connection string before public launch.",
    };
  }

  return {
    id: "database",
    label: "Database",
    status: "pass",
    message: "Configured.",
  };
}

function githubPrToken(env: Record<string, string | undefined>) {
  return env.COMMAND_WAVE_GITHUB_TOKEN?.trim() || env.GITHUB_TOKEN?.trim() || "";
}

function chatPostingCredentialsConfigured(env: Record<string, string | undefined>) {
  return hasProductionValue(env["6529_BOT_BEARER_TOKEN"], env) && hasProductionValue(env["6529_BOT_WALLET_ADDRESS"], env);
}

function chatPostingCheck(env: Record<string, string | undefined>, mockMode: boolean): ReadinessCheck {
  if (mockMode) {
    return {
      id: "6529_chat_posting",
      label: "Project chat posting",
      status: isProductionEnv(env) ? "fail" : "warn",
      message: "Local chat posting is active. Set 6529_MOCK_MODE=false and configure the 6529 bot wallet before public launch.",
    };
  }

  if (!chatPostingCredentialsConfigured(env)) {
    return {
      id: "6529_chat_posting",
      label: "Project chat posting",
      status: isProductionEnv(env) ? "fail" : "warn",
      message: "Configure 6529_BOT_BEARER_TOKEN and 6529_BOT_WALLET_ADDRESS so builders can post to project chat from the app.",
    };
  }

  return {
    id: "6529_chat_posting",
    label: "Project chat posting",
    status: "pass",
    message: "6529 bot posting is configured.",
  };
}

function githubPrAdapterCheck(env: Record<string, string | undefined>, enabled: boolean): ReadinessCheck {
  const token = githubPrToken(env);

  if (!enabled) {
    return {
      id: "github_pr_adapter",
      label: "GitHub PR adapter",
      status: "warn",
      message: "Local PR adapter is active. Set COMMAND_WAVE_REPO_ADAPTER=github before automated PR creation.",
    };
  }

  if (!hasEnvValue(token)) {
    return {
      id: "github_pr_adapter",
      label: "GitHub PR adapter",
      status: "fail",
      message: "GitHub PR creation is enabled but COMMAND_WAVE_GITHUB_TOKEN or GITHUB_TOKEN is missing.",
    };
  }

  if (isProductionEnv(env) && isPlaceholderValue(token)) {
    return {
      id: "github_pr_adapter",
      label: "GitHub PR adapter",
      status: "fail",
      message: "Replace placeholder GitHub token before enabling GitHub PR creation.",
    };
  }

  return {
    id: "github_pr_adapter",
    label: "GitHub PR adapter",
    status: "pass",
    message: "GitHub PR creation is enabled and credentialed.",
  };
}

export function getReadinessChecks(env: Record<string, string | undefined> = process.env): ReadinessCheck[] {
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const mockMode = env["6529_MOCK_MODE"] !== "false";
  const hasDatabase = hasProductionValue(env.DATABASE_URL, env);
  const hasLocalFileStore = localFileStoreEnabled(env);
  const hasPostgresStore = postgresStoreEnabled(env);
  const hasGuardianWaveState = guardianWaveStateConfigured(env);
  const hasGithubPrAdapter = githubPrAdapterEnabled(env);
  const guardianModeValue = guardianMode(env);

  return [
    appUrlCheck(appUrl, env),
    initialHookProjectCheck(env),
    databaseCheck(env),
    {
      id: "command_wave_store",
      label: "Command wave store",
      status: hasPostgresStore && hasDatabase ? "pass" : hasPostgresStore ? "fail" : "warn",
      message: hasPostgresStore
        ? hasDatabase
          ? "Postgres persistence configured."
          : "Postgres store selected but DATABASE_URL is missing or placeholder."
        : hasLocalFileStore
          ? "Local file persistence is active. Good for development, not durable public audit storage."
          : "In-memory only. State resets when the server restarts.",
    },
    adminApiKeyCheck(env),
    {
      id: "6529_mode",
      label: "6529 mode",
      status: mockMode ? "warn" : "pass",
      message: mockMode ? "Set 6529_MOCK_MODE=false before public launch." : "Live 6529 API mode.",
    },
    chatPostingCheck(env, mockMode),
    githubPrAdapterCheck(env, hasGithubPrAdapter),
    {
      id: "guardian_wave_state",
      label: "Guardian wave state",
      status: hasGuardianWaveState ? "pass" : isProductionEnv(env) ? "fail" : "warn",
      message: isProductionEnv(env)
        ? guardianWaveStateMessage(env, hasGuardianWaveState)
        : hasGuardianWaveState
          ? guardianWaveStateMessage(env, true)
          : "Set COMMAND_WAVE_STATE_URL before using the guardian as a required PR check.",
    },
    {
      id: "guardian_mode",
      label: "Guardian mode",
      status: guardianModeValue === "unknown" ? "warn" : "pass",
      message:
        guardianModeValue === "external_github_app"
          ? "External GitHub App guardian mode is configured."
          : guardianModeValue === "repo_local_github_action"
            ? "Repo-local guardian mode is configured at MVP strength. External GitHub App is a later hardening step."
            : "Unknown guardian mode. Use repo_local_github_action or external_github_app.",
    },
  ];
}

export function getReadinessSummary(checks: ReadinessCheck[]) {
  return {
    pass: checks.filter((check) => check.status === "pass").length,
    warn: checks.filter((check) => check.status === "warn").length,
    fail: checks.filter((check) => check.status === "fail").length,
  };
}
