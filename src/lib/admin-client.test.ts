import { describe, expect, it } from "vitest";
import { attachAdminApiKey } from "./admin-client";

describe("admin API client headers", () => {
  it("attaches the access key only when one is supplied", () => {
    expect(attachAdminApiKey(new Headers(), "").has("x-admin-api-key")).toBe(false);
    expect(attachAdminApiKey(new Headers(), "   ").has("x-admin-api-key")).toBe(false);

    const headers = attachAdminApiKey(new Headers(), " secret ");

    expect(headers.get("x-admin-api-key")).toBe("secret");
  });

  it("preserves existing request headers", () => {
    const headers = attachAdminApiKey(new Headers({ "content-type": "application/json" }), "secret");

    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-admin-api-key")).toBe("secret");
  });
});
