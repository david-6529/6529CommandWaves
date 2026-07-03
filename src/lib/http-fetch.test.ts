import { describe, expect, it } from "vitest";
import { fetchJsonWithTimeout, fetchTextWithTimeout } from "./http-fetch";

describe("timed HTTP fetch helper", () => {
  it("reads JSON from HTTP URLs", async () => {
    const payload = await fetchJsonWithTimeout<{ ok: boolean }>("https://command-waves.example.com/state.json", {
      fetchImpl: async () => Response.json({ ok: true }),
    });

    expect(payload).toEqual({ ok: true });
  });

  it("rejects non-HTTP URLs", async () => {
    await expect(
      fetchJsonWithTimeout("file:///tmp/state.json", {
        fetchImpl: async () => Response.json({ ok: true }),
      }),
    ).rejects.toMatchObject({
      message: "Fetch URL must use HTTP or HTTPS.",
    });
  });

  it("rejects non-2xx responses with status details", async () => {
    await expect(
      fetchJsonWithTimeout("https://command-waves.example.com/state.json", {
        fetchImpl: async () => new Response("missing", { status: 404, statusText: "Not Found" }),
      }),
    ).rejects.toMatchObject({
      message: "Could not fetch https://command-waves.example.com/state.json: 404 Not Found",
      status: 404,
      statusText: "Not Found",
    });
  });

  it("rejects invalid JSON", async () => {
    await expect(
      fetchJsonWithTimeout("https://command-waves.example.com/state.json", {
        fetchImpl: async () => new Response("not json"),
      }),
    ).rejects.toMatchObject({
      message: "Response from https://command-waves.example.com/state.json must be valid JSON.",
    });
  });

  it("rejects oversized responses", async () => {
    await expect(
      fetchTextWithTimeout("https://command-waves.example.com/state.json", {
        maxBytes: 4,
        fetchImpl: async () =>
          new Response("large", {
            headers: {
              "content-length": "5",
            },
          }),
      }),
    ).rejects.toMatchObject({
      message: "Response body from https://command-waves.example.com/state.json must be 4 bytes or less.",
    });
  });

  it("times out stalled fetches", async () => {
    await expect(
      fetchJsonWithTimeout("https://command-waves.example.com/state.json", {
        timeoutMs: 1,
        fetchImpl: (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
          }),
      }),
    ).rejects.toMatchObject({
      message: "Request timed out after 1ms: https://command-waves.example.com/state.json",
    });
  });
});
