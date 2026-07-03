import { describe, expect, it } from "vitest";
import { handleRouteError, json, readJsonObject } from "./api";

describe("API responses", () => {
  it("defaults JSON responses to no-store", () => {
    const response = json({ ok: true });

    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
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

  it("preserves safe error headers", () => {
    const response = handleRouteError(
      Object.assign(new Error("Too many requests. Try again shortly."), {
        status: 429,
        headers: { "Retry-After": "30" },
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
  });

  it("reads JSON object bodies", async () => {
    const request = new Request("https://command-waves.example.com/api/test", {
      method: "POST",
      body: JSON.stringify({ waveUrl: "mock-command-wave" }),
    });

    await expect(readJsonObject(request)).resolves.toEqual({ waveUrl: "mock-command-wave" });
  });

  it("rejects malformed JSON bodies clearly", async () => {
    const request = new Request("https://command-waves.example.com/api/test", {
      method: "POST",
      body: "{",
    });

    await expect(readJsonObject(request)).rejects.toMatchObject({
      message: "Request body must be valid JSON.",
      status: 400,
    });
  });

  it("rejects non-object JSON bodies clearly", async () => {
    const request = new Request("https://command-waves.example.com/api/test", {
      method: "POST",
      body: JSON.stringify(["mock-command-wave"]),
    });

    await expect(readJsonObject(request)).rejects.toMatchObject({
      message: "Request body must be a JSON object.",
      status: 400,
    });
  });

  it("rejects oversized JSON bodies before parsing", async () => {
    const request = new Request("https://command-waves.example.com/api/test", {
      method: "POST",
      headers: {
        "content-length": "65537",
      },
      body: JSON.stringify({ waveUrl: "mock-command-wave" }),
    });

    await expect(readJsonObject(request)).rejects.toMatchObject({
      message: "Request body must be 65536 bytes or less.",
      status: 413,
    });
  });

  it("rejects oversized JSON bodies without content-length headers", async () => {
    const request = new Request("https://command-waves.example.com/api/test", {
      method: "POST",
      body: JSON.stringify({ text: "x".repeat(65_536) }),
    });

    await expect(readJsonObject(request)).rejects.toMatchObject({
      message: "Request body must be 65536 bytes or less.",
      status: 413,
    });
  });

  it("allows route-specific JSON body size limits", async () => {
    const request = new Request("https://command-waves.example.com/api/test", {
      method: "POST",
      headers: {
        "content-length": "20",
      },
      body: JSON.stringify({ ok: true }),
    });

    await expect(readJsonObject(request, { maxBytes: 64 })).resolves.toEqual({ ok: true });
  });
});
