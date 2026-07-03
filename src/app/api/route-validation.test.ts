import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as previewContext } from "./6529/context/preview/route";
import { GET as searchWaves } from "./6529/waves/search/route";
import { POST as validateSetup } from "./command-wave/setup/validate/route";
import { resetMockDropsForTests } from "@/lib/6529/mock";
import { resetRateLimitsForTest } from "@/lib/rate-limit";

function request(url: string, init: RequestInit = {}) {
  return new Request(url, {
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.81",
      ...(init.headers ?? {}),
    },
    ...init,
  });
}

async function responsePayload(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("API route validation", () => {
  const previousMockMode = process.env["6529_MOCK_MODE"];

  beforeEach(() => {
    process.env["6529_MOCK_MODE"] = "true";
    resetMockDropsForTests();
    resetRateLimitsForTest();
  });

  afterEach(() => {
    resetMockDropsForTests();
    resetRateLimitsForTest();

    if (previousMockMode === undefined) {
      delete process.env["6529_MOCK_MODE"];
    } else {
      process.env["6529_MOCK_MODE"] = previousMockMode;
    }
  });

  it("rejects oversized wave search queries at the route", async () => {
    const response = await searchWaves(
      request(`https://command-waves.example.com/api/6529/waves/search?q=${"x".repeat(121)}&limit=6`),
    );

    expect(response.status).toBe(400);
    await expect(responsePayload(response)).resolves.toMatchObject({
      error: "Wave search must be 120 characters or less.",
    });
  });

  it("rejects oversized context preview bodies at the route", async () => {
    const response = await previewContext(
      request("https://command-waves.example.com/api/6529/context/preview", {
        method: "POST",
        body: JSON.stringify({
          waveId: "mock-command-wave",
          note: "x".repeat(65_536),
        }),
      }),
    );

    expect(response.status).toBe(413);
    await expect(responsePayload(response)).resolves.toMatchObject({
      error: "Request body must be 65536 bytes or less.",
    });
  });

  it("rejects oversized setup wave IDs at the route", async () => {
    const response = await validateSetup(
      request("https://command-waves.example.com/api/command-wave/setup/validate", {
        method: "POST",
        body: JSON.stringify({
          waveUrl: "x".repeat(161),
          repoUrl: "6529-Collections/6529-hook",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(responsePayload(response)).resolves.toMatchObject({
      error: "6529 wave id must be 160 characters or less.",
    });
  });
});
