import { describe, expect, it } from "vitest";
import { handleRouteError, json } from "./api";

describe("API responses", () => {
  it("defaults JSON responses to no-store", () => {
    const response = json({ ok: true });

    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });

  it("preserves explicit cache headers", () => {
    const response = json(
      { ok: true },
      {
        headers: {
          "Cache-Control": "public, max-age=60",
        },
      },
    );

    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60");
  });

  it("keeps route errors out of shared caches", async () => {
    const response = handleRouteError(Object.assign(new Error("Bad request"), { status: 400 }));
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(payload.error).toBe("Bad request");
  });
});
