import { describe, expect, it } from "vitest";
import { adminAuthRequired, requireAdminRequest } from "./admin-auth";

function request(headers: HeadersInit = {}) {
  return new Request("https://command-waves.example.com/api/command-wave", { headers });
}

describe("admin API auth", () => {
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
    expect(() =>
      requireAdminRequest(request({ authorization: "Bearer secret" }), {
        NODE_ENV: "production",
        ADMIN_API_KEY: "secret",
      }),
    ).not.toThrow();
  });

  it("fails closed in production when the admin key is missing", () => {
    expect(adminAuthRequired({ NODE_ENV: "production" })).toBe(true);
    expect(() => requireAdminRequest(request(), { NODE_ENV: "production" })).toThrow(
      "ADMIN_API_KEY is required before mutating command-wave state.",
    );
  });
});
