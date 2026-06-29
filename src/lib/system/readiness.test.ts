import { describe, expect, it } from "vitest";
import { getReadinessChecks, getReadinessSummary } from "./readiness";

describe("readiness checks", () => {
  it("warns about local-only infrastructure and fails missing admin protection", () => {
    const checks = getReadinessChecks({});
    const summary = getReadinessSummary(checks);

    expect(summary).toEqual({ pass: 1, warn: 6, fail: 1 });
    expect(checks.some((check) => check.id === "6529_posting")).toBe(false);
    expect(checks.some((check) => check.id === "cron_secret")).toBe(false);
    expect(checks.some((check) => check.id === "rate_limit_salt")).toBe(false);
    expect(checks.find((check) => check.id === "database")).toMatchObject({
      status: "warn",
    });
    expect(checks.find((check) => check.id === "admin_api_key")).toMatchObject({
      status: "fail",
    });
    expect(checks.find((check) => check.id === "github_pr_adapter")).toMatchObject({
      status: "warn",
      message: "Local PR adapter is active. Set COMMAND_WAVE_REPO_ADAPTER=github before production PR creation.",
    });
  });

  it("passes configured production basics without requiring posting credentials", () => {
    const checks = getReadinessChecks({
      NEXT_PUBLIC_APP_URL: "https://command-waves.example.com",
      DATABASE_URL: "postgresql://example",
      ADMIN_API_KEY: "admin",
      "6529_MOCK_MODE": "false",
      NODE_ENV: "production",
    });
    const summary = getReadinessSummary(checks);

    expect(summary).toEqual({ pass: 6, warn: 1, fail: 1 });
    expect(checks.some((check) => check.id === "6529_posting")).toBe(false);
    expect(checks.find((check) => check.id === "guardian_wave_state")).toMatchObject({
      status: "fail",
      message:
        "Missing COMMAND_WAVE_STATE_URL. Set it to https://command-waves.example.com/api/command-wave/state for guardian PR checks.",
    });
    expect(checks.find((check) => check.id === "guardian_mode")).toMatchObject({
      status: "pass",
      message: "Repo-local guardian mode is configured at MVP strength. External GitHub App is a later hardening step.",
    });
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
      COMMAND_WAVE_REPO_ADAPTER: "github",
      COMMAND_WAVE_GITHUB_TOKEN: "token",
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
