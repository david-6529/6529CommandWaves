import { beforeEach, describe, expect, it } from "vitest";
import { adminAuthRequired, requireAdminRequest } from "./admin-auth";
import { resetRateLimitsForTest } from "./rate-limit";

function request(headers: HeadersInit = {}) {
  return new Request("https://command-waves.example.com/api/command-wave", { headers });
}

describe("admin API auth", () => {
  beforeEach(() => {
    resetRateLimitsForTest();
  });

  it("does not require an admin key for local demo mode when no key is configured", () => {
    expect(adminAuthRequired({ NODE_ENV: "development" })).toBe(false);
    expect(() => requireAdminRequest(request(), { NODE_ENV: "development" })).not.toThrow();
  });

  it("requires an admin key when one is configured", () => {
    const env = { NODE_ENV: "development", ADMIN_API_KEY: "secret" };

    expect(adminAuthRequired(env)).toBe(true);
    expect(() => requireAdminRequest(request(), env)).toThrow("Admin API key required.");
    expect(() => requireAdminRequest(request({ "x-admin-api-key": "wrong" }), env)).toThrow("Admin API key required.");
    expect(() => requireAdminRequest(request({ "x-admin-api-key": "secret" }), env)).not.toThrow();
  });

  it("accepts bearer auth for server-to-server callers", () => {
    const key = "strong-admin-key-for-tests";

    expect(() =>
      requireAdminRequest(request({ authorization: `Bearer ${key}` }), {
        NODE_ENV: "production",
        ADMIN_API_KEY: key,
      }),
    ).not.toThrow();
  });

  it("fails closed in production when the admin key is missing", () => {
    expect(adminAuthRequired({ NODE_ENV: "production" })).toBe(true);
    expect(() => requireAdminRequest(request(), { NODE_ENV: "production" })).toThrow(
      "ADMIN_API_KEY is required before mutating command-wave state.",
    );
  });

  it("fails closed in production when the admin key is weak or placeholder", () => {
    expect(() =>
      requireAdminRequest(request({ "x-admin-api-key": "short-launch-key" }), {
        NODE_ENV: "production",
        ADMIN_API_KEY: "short-launch-key",
      }),
    ).toThrow("Use a strong ADMIN_API_KEY with at least 24 characters before mutating command-wave state.");
    expect(() =>
      requireAdminRequest(request({ "x-admin-api-key": "replace-with-a-strong-random-key" }), {
        NODE_ENV: "production",
        ADMIN_API_KEY: "replace-with-a-strong-random-key",
      }),
    ).toThrow("Replace placeholder ADMIN_API_KEY with a strong random key before mutating command-wave state.");
  });

  it("rate limits protected admin attempts", () => {
    const env = {
      NODE_ENV: "production",
      ADMIN_API_KEY: "strong-admin-key-for-tests",
    };

    for (let index = 0; index < 120; index += 1) {
      expect(() => requireAdminRequest(request({ "x-admin-api-key": "wrong" }), env)).toThrow("Admin API key required.");
    }

    expect(() => requireAdminRequest(request({ "x-admin-api-key": "wrong" }), env)).toThrow(
      "Too many requests. Try again shortly.",
    );
  });
});
