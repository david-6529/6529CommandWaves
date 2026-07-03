import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as postRoomMessage } from "./6529/room-post/route";
import { GET as getLaunchAudit } from "./command-wave/launch/audit/route";
import { resetMockDropsForTests } from "@/lib/6529/mock";
import { clearCommandWaveStoreForTests } from "@/lib/command-wave-store";
import { resetRateLimitsForTest } from "@/lib/rate-limit";

function request(url: string, init: RequestInit = {}) {
  return new Request(url, {
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.77",
      ...(init.headers ?? {}),
    },
    ...init,
  });
}

describe("API route rate limits", () => {
  const previousAdminKey = process.env.ADMIN_API_KEY;
  const previousMockMode = process.env["6529_MOCK_MODE"];
  const previousStoreMode = process.env.COMMAND_WAVE_STORE;

  beforeEach(() => {
    delete process.env.ADMIN_API_KEY;
    process.env["6529_MOCK_MODE"] = "true";
    process.env.COMMAND_WAVE_STORE = "memory";
    clearCommandWaveStoreForTests();
    resetMockDropsForTests();
    resetRateLimitsForTest();
  });

  afterEach(() => {
    clearCommandWaveStoreForTests();
    resetMockDropsForTests();
    resetRateLimitsForTest();

    if (previousAdminKey === undefined) {
      delete process.env.ADMIN_API_KEY;
    } else {
      process.env.ADMIN_API_KEY = previousAdminKey;
    }

    if (previousMockMode === undefined) {
      delete process.env["6529_MOCK_MODE"];
    } else {
      process.env["6529_MOCK_MODE"] = previousMockMode;
    }

    if (previousStoreMode === undefined) {
      delete process.env.COMMAND_WAVE_STORE;
    } else {
      process.env.COMMAND_WAVE_STORE = previousStoreMode;
    }
  });

  it("rate limits launch audit reads", async () => {
    for (let index = 0; index < 30; index += 1) {
      const response = await getLaunchAudit(request("https://command-waves.example.com/api/command-wave/launch/audit"));

      expect(response.status).toBe(200);
    }

    const limited = await getLaunchAudit(request("https://command-waves.example.com/api/command-wave/launch/audit"));

    expect(limited.status).toBe(429);
    await expect(limited.json()).resolves.toMatchObject({
      error: "Too many requests. Try again shortly.",
    });
  });

  it("rate limits room posting after admin auth", async () => {
    for (let index = 0; index < 10; index += 1) {
      const response = await postRoomMessage(
        request("https://command-waves.example.com/api/6529/room-post", {
          method: "POST",
          body: JSON.stringify({
            waveUrl: "https://6529.io/waves/mock-command-wave",
            content: `Room post ${index}`,
          }),
        }),
      );

      expect(response.status).toBe(200);
    }

    const limited = await postRoomMessage(
      request("https://command-waves.example.com/api/6529/room-post", {
        method: "POST",
        body: JSON.stringify({
          waveUrl: "https://6529.io/waves/mock-command-wave",
          content: "Room post over limit",
        }),
      }),
    );

    expect(limited.status).toBe(429);
    await expect(limited.json()).resolves.toMatchObject({
      error: "Too many requests. Try again shortly.",
    });
  });
});
