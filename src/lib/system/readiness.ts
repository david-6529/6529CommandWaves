export type ReadinessCheck = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  message: string;
};

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function checkSecret(id: string, label: string, value: string | undefined): ReadinessCheck {
  return hasValue(value)
    ? { id, label, status: "pass", message: "Configured." }
    : { id, label, status: "fail", message: "Missing." };
}

function localFileStoreEnabled(env: Record<string, string | undefined>) {
  return Boolean(
    env.COMMAND_WAVE_STORE === "file" ||
      (env.NODE_ENV === "development" && env.COMMAND_WAVE_STORE !== "memory"),
  );
}

function postgresStoreEnabled(env: Record<string, string | undefined>) {
  return Boolean(env.COMMAND_WAVE_STORE === "postgres" || (env.NODE_ENV === "production" && hasValue(env.DATABASE_URL)));
}

function productionMode(env: Record<string, string | undefined>) {
  return env.NODE_ENV === "production";
}

function guardianWaveStateConfigured(env: Record<string, string | undefined>) {
  return hasValue(env.COMMAND_WAVE_STATE_PATH) || hasValue(env.COMMAND_WAVE_STATE_URL);
}

function githubPrAdapterEnabled(env: Record<string, string | undefined>) {
  return env.COMMAND_WAVE_REPO_ADAPTER === "github";
}

function guardianMode(env: Record<string, string | undefined>) {
  const mode = env.COMMAND_WAVE_GUARDIAN_MODE?.trim() || "repo_local_github_action";

  return mode === "repo_local_github_action" || mode === "external_github_app" ? mode : "unknown";
}

export function getReadinessChecks(env: Record<string, string | undefined> = process.env): ReadinessCheck[] {
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const mockMode = env["6529_MOCK_MODE"] !== "false";
  const githubPrConfigured = hasValue(env.COMMAND_WAVE_GITHUB_TOKEN) || hasValue(env.GITHUB_TOKEN);
  const hasDatabase = hasValue(env.DATABASE_URL);
  const hasLocalFileStore = localFileStoreEnabled(env);
  const hasPostgresStore = postgresStoreEnabled(env);
  const hasGuardianWaveState = guardianWaveStateConfigured(env);
  const hasGithubPrAdapter = githubPrAdapterEnabled(env);
  const guardianModeValue = guardianMode(env);

  return [
    hasValue(appUrl)
      ? {
          id: "app_url",
          label: "App URL",
          status: appUrl!.startsWith("https://") || appUrl!.startsWith("http://localhost") ? "pass" : "warn",
          message: appUrl!,
        }
      : {
          id: "app_url",
          label: "App URL",
          status: "warn",
          message: "Missing. Fine locally, required before production.",
        },
    hasDatabase
      ? {
          id: "database",
          label: "Database",
          status: "pass",
          message: "Configured.",
        }
      : {
          id: "database",
          label: "Database",
          status: "warn",
          message: "Postgres is not configured. Add DATABASE_URL before production.",
        },
    {
      id: "command_wave_store",
      label: "Command wave store",
      status: hasPostgresStore && hasDatabase ? "pass" : hasPostgresStore ? "fail" : "warn",
      message: hasPostgresStore
        ? hasDatabase
          ? "Postgres persistence configured."
          : "Postgres store selected but DATABASE_URL is missing."
        : hasLocalFileStore
          ? "Local file persistence is active. Good for development, not production."
          : "In-memory only. State resets when the server restarts.",
    },
    checkSecret("admin_api_key", "Admin API key", env.ADMIN_API_KEY),
    checkSecret("cron_secret", "Cron secret", env.CRON_SECRET),
    checkSecret("rate_limit_salt", "Rate-limit salt", env.RATE_LIMIT_SALT),
    {
      id: "6529_mode",
      label: "6529 mode",
      status: mockMode ? "warn" : "pass",
      message: mockMode ? "Mock mode is active. Safe for local development." : "Live 6529 API mode.",
    },
    {
      id: "github_pr_adapter",
      label: "GitHub PR adapter",
      status: hasGithubPrAdapter ? (githubPrConfigured ? "pass" : "fail") : "warn",
      message: hasGithubPrAdapter
        ? githubPrConfigured
          ? "GitHub PR creation is enabled and credentialed."
          : "GitHub PR creation is enabled but no token is configured."
        : "Local PR adapter is active. Set COMMAND_WAVE_REPO_ADAPTER=github before production PR creation.",
    },
    {
      id: "guardian_wave_state",
      label: "Guardian wave state",
      status: hasGuardianWaveState ? "pass" : productionMode(env) ? "fail" : "warn",
      message: hasGuardianWaveState
        ? "Guardian PR checks have a real wave-state source."
        : productionMode(env)
          ? "Missing COMMAND_WAVE_STATE_PATH or COMMAND_WAVE_STATE_URL. PR guardian checks cannot verify real wave state."
          : "Not configured. Fine for local development, required before using the guardian as a required PR check.",
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
