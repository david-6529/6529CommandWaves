import { beforeEach, describe, expect, it } from "vitest";
import { assertRateLimit, resetRateLimitsForTest } from "./rate-limit";

function request(headers: HeadersInit = {}) {
  return new Request("https://command-waves.example.com/api/6529/context/preview", { headers });
}

describe("rate limit", () => {
  beforeEach(() => {
    resetRateLimitsForTest();
  });

  it("blocks repeated requests by client identity", () => {
    const req = request({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" });
    const options = { namespace: "context", max: 2, windowMs: 60_000 };

    expect(() => assertRateLimit(req, options, 1_000)).not.toThrow();
    expect(() => assertRateLimit(req, options, 2_000)).not.toThrow();
    expect(() => assertRateLimit(req, options, 3_000)).toThrow("Too many requests. Try again shortly.");
  });

  it("adds retry timing to blocked requests", () => {
    const req = request({ "x-forwarded-for": "203.0.113.11" });
    const options = { namespace: "context", max: 1, windowMs: 60_000 };

    assertRateLimit(req, options, 1_000);

    try {
      assertRateLimit(req, options, 3_100);
      throw new Error("Expected rate limit.");
    } catch (error) {
      expect(error).toMatchObject({
        status: 429,
        headers: { "Retry-After": "58" },
      });
    }
  });

  it("resets after the window", () => {
    const req = request({ "x-real-ip": "203.0.113.20" });
    const options = { namespace: "context", max: 1, windowMs: 100 };

    assertRateLimit(req, options, 1_000);

    expect(() => assertRateLimit(req, options, 1_050)).toThrow("Too many requests. Try again shortly.");
    expect(() => assertRateLimit(req, options, 1_101)).not.toThrow();
  });

  it("keeps namespaces and client identities separate", () => {
    const first = request({ "cf-connecting-ip": "203.0.113.30" });
    const second = request({ "cf-connecting-ip": "203.0.113.31" });
    const options = { namespace: "context", max: 1, windowMs: 60_000 };

    assertRateLimit(first, options, 1_000);

    expect(() => assertRateLimit(second, options, 1_001)).not.toThrow();
    expect(() => assertRateLimit(first, { ...options, namespace: "search" }, 1_002)).not.toThrow();
  });

  it("caps oversized client identity headers", () => {
    const sharedPrefix = "a".repeat(128);
    const first = request({ "x-forwarded-for": `${sharedPrefix}x` });
    const second = request({ "x-forwarded-for": `${sharedPrefix}y` });
    const options = { namespace: "context", max: 1, windowMs: 60_000 };

    assertRateLimit(first, options, 1_000);

    expect(() => assertRateLimit(second, options, 1_001)).toThrow("Too many requests. Try again shortly.");
  });
});
