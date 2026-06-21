import { describe, expect, it } from "vitest";
import { getReadinessChecks, getReadinessSummary } from "./readiness";

describe("readiness checks", () => {
  it("warns about local-only infrastructure and fails missing required secrets", () => {
    const checks = getReadinessChecks({});
    const summary = getReadinessSummary(checks);

    expect(summary).toEqual({ pass: 0, warn: 5, fail: 3 });
    expect(checks.find((check) => check.id === "database")).toMatchObject({
      status: "warn",
    });
    expect(checks.find((check) => check.id === "admin_api_key")).toMatchObject({
      status: "fail",
    });
  });

  it("passes configured production basics while warning when posting is disabled", () => {
    const checks = getReadinessChecks({
      NEXT_PUBLIC_APP_URL: "https://command-waves.example.com",
      DATABASE_URL: "postgresql://example",
      ADMIN_API_KEY: "admin",
      CRON_SECRET: "cron",
      RATE_LIMIT_SALT: "salt",
      "6529_MOCK_MODE": "false",
      NODE_ENV: "production",
    });
    const summary = getReadinessSummary(checks);

    expect(summary).toEqual({ pass: 7, warn: 1, fail: 0 });
    expect(checks.find((check) => check.id === "6529_posting")).toMatchObject({
      status: "warn",
    });
  });
});
