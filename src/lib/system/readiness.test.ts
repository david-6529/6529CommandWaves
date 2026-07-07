import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getReadinessChecks, getReadinessSummary } from "./readiness";

function parseEnvExample(path: string) {
  return Object.fromEntries(
    readFileSync(resolve(path), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex).trim();
        const rawValue = line.slice(separatorIndex + 1).trim();
        const value =
          (rawValue.startsWith("\"") && rawValue.endsWith("\"")) || (rawValue.startsWith("'") && rawValue.endsWith("'"))
            ? rawValue.slice(1, -1)
            : rawValue;

        return [key, value];
      }),
  );
}

describe("readiness checks", () => {
  it("warns about local-only infrastructure and fails missing admin protection", () => {
    const checks = getReadinessChecks({});
    const summary = getReadinessSummary(checks);

    expect(summary).toEqual({ pass: 1, warn: 7, fail: 1 });
    expect(checks.some((check) => check.id === "6529_posting")).toBe(false);
    expect(checks.some((check) => check.id === "cron_secret")).toBe(false);
    expect(checks.some((check) => check.id === "rate_limit_salt")).toBe(false);
    expect(checks.find((check) => check.id === "database")).toMatchObject({
      status: "warn",
    });
    expect(checks.find((check) => check.id === "initial_hook_project")).toMatchObject({
      status: "warn",
      message:
        "Set COMMAND_WAVE_INITIAL_WAVE_URL, and set COMMAND_WAVE_INITIAL_REPO_URL to the placeholder or selected hook repo.",
    });
    expect(checks.find((check) => check.id === "admin_api_key")).toMatchObject({
      status: "fail",
    });
    expect(checks.find((check) => check.id === "github_pr_adapter")).toMatchObject({
      status: "warn",
      message: "Local PR adapter is active. Set COMMAND_WAVE_REPO_ADAPTER=github before automated PR creation.",
    });
    expect(checks.find((check) => check.id === "admin_api_key")).toMatchObject({
      message: "Set ADMIN_API_KEY before public launch so protected actions require a key.",
    });
    expect(checks.find((check) => check.id === "6529_mode")).toMatchObject({
      message: "Set 6529_MOCK_MODE=false before public launch.",
    });
  });

  it("passes configured production basics without requiring posting credentials", () => {
    const checks = getReadinessChecks({
      NEXT_PUBLIC_APP_URL: "https://command-waves.6529.io",
      DATABASE_URL: "postgresql://command_waves:strong-password@db.internal:5432/command_waves",
      ADMIN_API_KEY: "strong-admin-key-for-launch",
      COMMAND_WAVE_INITIAL_WAVE_URL: "https://6529.io/waves/6529-hook-builder",
      COMMAND_WAVE_INITIAL_REPO_URL: "https://github.com/6529-Collections/6529-hook",
      "6529_MOCK_MODE": "false",
      NODE_ENV: "production",
    });
    const summary = getReadinessSummary(checks);

    expect(summary).toEqual({ pass: 7, warn: 1, fail: 1 });
    expect(checks.some((check) => check.id === "6529_posting")).toBe(false);
    expect(checks.find((check) => check.id === "guardian_wave_state")).toMatchObject({
      status: "fail",
      message:
        "Missing COMMAND_WAVE_STATE_URL. Set it to https://command-waves.6529.io/api/command-wave/state for guardian PR checks.",
    });
    expect(checks.find((check) => check.id === "guardian_mode")).toMatchObject({
      status: "pass",
      message: "Repo-local guardian mode is configured at MVP strength. External GitHub App is a later hardening step.",
    });
    expect(checks.find((check) => check.id === "initial_hook_project")).toMatchObject({
      status: "pass",
      message: "First project chat and repo setting are configured.",
    });
  });

  it("fails missing first hook project seed in production mode", () => {
    const checks = getReadinessChecks({
      NODE_ENV: "production",
    });

    expect(checks.find((check) => check.id === "initial_hook_project")).toMatchObject({
      status: "fail",
      message:
        "Set COMMAND_WAVE_INITIAL_WAVE_URL, and set COMMAND_WAVE_INITIAL_REPO_URL to the placeholder or selected hook repo.",
    });
  });

  it("fails invalid first hook project seed values", () => {
    const checks = getReadinessChecks({
      COMMAND_WAVE_INITIAL_WAVE_URL: "../bad wave",
      COMMAND_WAVE_INITIAL_REPO_URL: "not github",
    });

    expect(checks.find((check) => check.id === "initial_hook_project")).toMatchObject({
      status: "fail",
      message: "Use a valid 6529 wave and GitHub repo placeholder or selected repo for the first hook project.",
    });
  });

  it("fails localhost app URLs in production mode", () => {
    const checks = getReadinessChecks({
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });

    expect(checks.find((check) => check.id === "app_url")).toMatchObject({
      status: "fail",
      message: "Set NEXT_PUBLIC_APP_URL to the HTTPS deployed app URL before public launch.",
    });
  });

  it("fails weak admin keys in production mode", () => {
    const checks = getReadinessChecks({
      NODE_ENV: "production",
      ADMIN_API_KEY: "short-launch-key",
    });

    expect(checks.find((check) => check.id === "admin_api_key")).toMatchObject({
      status: "fail",
      message: "Use a strong ADMIN_API_KEY with at least 24 characters before public launch.",
    });
  });

  it("fails placeholder deployment values in production mode", () => {
    const checks = getReadinessChecks({
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://your-app.example",
      DATABASE_URL: "postgresql://user:password@host:5432/command_waves",
      ADMIN_API_KEY: "replace-with-a-strong-random-key",
      COMMAND_WAVE_INITIAL_WAVE_URL: "https://6529.io/waves/your-hook-project",
      COMMAND_WAVE_INITIAL_REPO_URL: "https://github.com/your-org/your-hook-repo",
      COMMAND_WAVE_REPO_ADAPTER: "github",
      COMMAND_WAVE_GITHUB_TOKEN: "replace-with-github-token",
      COMMAND_WAVE_STATE_URL: "https://your-app.example/api/command-wave/state",
    });

    expect(checks.find((check) => check.id === "app_url")).toMatchObject({
      status: "fail",
      message: "Replace placeholder NEXT_PUBLIC_APP_URL with the deployed app URL before public launch.",
    });
    expect(checks.find((check) => check.id === "database")).toMatchObject({
      status: "fail",
      message: "Replace placeholder DATABASE_URL with a real Postgres connection string before public launch.",
    });
    expect(checks.find((check) => check.id === "command_wave_store")).toMatchObject({
      status: "fail",
      message: "Postgres store selected but DATABASE_URL is missing or placeholder.",
    });
    expect(checks.find((check) => check.id === "admin_api_key")).toMatchObject({
      status: "fail",
      message: "Replace placeholder ADMIN_API_KEY with a strong random key before public launch.",
    });
    expect(checks.find((check) => check.id === "initial_hook_project")).toMatchObject({
      status: "fail",
      message: "Replace placeholder first project chat before public launch. Replace the repo placeholder before PR work starts.",
    });
    expect(checks.find((check) => check.id === "github_pr_adapter")).toMatchObject({
      status: "fail",
      message: "Replace placeholder GitHub token before enabling GitHub PR creation.",
    });
    expect(checks.find((check) => check.id === "guardian_wave_state")).toMatchObject({
      status: "fail",
      message: "Replace placeholder COMMAND_WAVE_STATE_URL with the deployed state URL before guardian PR checks run.",
    });
  });

  it("keeps the production env example from passing unchanged", () => {
    const checks = getReadinessChecks(parseEnvExample(".env.production.example"));

    expect(checks.find((check) => check.id === "app_url")).toMatchObject({ status: "fail" });
    expect(checks.find((check) => check.id === "database")).toMatchObject({ status: "fail" });
    expect(checks.find((check) => check.id === "admin_api_key")).toMatchObject({ status: "fail" });
    expect(checks.find((check) => check.id === "initial_hook_project")).toMatchObject({ status: "fail" });
    expect(checks.find((check) => check.id === "github_pr_adapter")).toMatchObject({ status: "fail" });
    expect(checks.find((check) => check.id === "guardian_wave_state")).toMatchObject({ status: "fail" });
  });

  it("passes guardian wave-state readiness when a source is configured", () => {
    const checks = getReadinessChecks({
      NODE_ENV: "production",
      COMMAND_WAVE_STATE_URL: "https://command-waves.example.com/api/command-wave/state",
    });

    expect(checks.find((check) => check.id === "guardian_wave_state")).toMatchObject({
      status: "pass",
    });
  });

  it("passes GitHub PR adapter readiness when enabled with a token", () => {
    const checks = getReadinessChecks({
      NODE_ENV: "production",
      COMMAND_WAVE_REPO_ADAPTER: "github",
      COMMAND_WAVE_GITHUB_TOKEN: "ghp_launch_readiness_token_1234567890",
    });

    expect(checks.find((check) => check.id === "github_pr_adapter")).toMatchObject({
      status: "pass",
    });
  });

  it("passes guardian mode readiness for the external GitHub App mode", () => {
    const checks = getReadinessChecks({
      COMMAND_WAVE_GUARDIAN_MODE: "external_github_app",
    });

    expect(checks.find((check) => check.id === "guardian_mode")).toMatchObject({
      status: "pass",
      message: "External GitHub App guardian mode is configured.",
    });
  });

  it("warns for unknown guardian modes", () => {
    const checks = getReadinessChecks({
      COMMAND_WAVE_GUARDIAN_MODE: "custom",
    });

    expect(checks.find((check) => check.id === "guardian_mode")).toMatchObject({
      status: "warn",
      message: "Unknown guardian mode. Use repo_local_github_action or external_github_app.",
    });
  });
});
