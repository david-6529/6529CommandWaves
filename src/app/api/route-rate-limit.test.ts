import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as postChatMessage } from "./6529/chat-post/route";
import { GET as getLaunchAudit } from "./command-wave/launch/audit/route";
import { GET as getChatLaunch } from "./command-wave/launch/chat/route";
import { GET as getHookProjects } from "./command-wave/projects/route";
import { GET as getSetupProof } from "./command-wave/setup/proof/route";
import { GET as getCommandWaveState } from "./command-wave/state/route";
import { GET as getReadiness } from "./readiness/route";
import { resetMockDropsForTests } from "@/lib/6529/mock";
import { clearCommandWaveStoreForTests } from "@/lib/command-wave-store";
import { resetRateLimitsForTest } from "@/lib/rate-limit";

function request(url: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.77",
      ...(init.headers ?? {}),
    },
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

  it.each([
    ["launch audit", getLaunchAudit, "/api/command-wave/launch/audit", 30],
    ["chat launch", getChatLaunch, "/api/command-wave/launch/chat", 30],
    ["hook projects", getHookProjects, "/api/command-wave/projects", 60],
    ["setup proof", getSetupProof, "/api/command-wave/setup/proof", 30],
    ["command-wave state", getCommandWaveState, "/api/command-wave/state", 60],
    ["readiness", getReadiness, "/api/readiness", 30],
  ] satisfies [string, (request: Request) => Response | Promise<Response>, string, number][])(
    "rate limits %s reads",
    async (_label, handler, path, max) => {
      for (let index = 0; index < max; index += 1) {
        const response = await handler(request(`https://command-waves.example.com${path}`));

        expect(response.status).toBe(200);
      }

      const limited = await handler(request(`https://command-waves.example.com${path}`));

      expect(limited.status).toBe(429);
      await expect(limited.json()).resolves.toMatchObject({
        error: "Too many requests. Try again shortly.",
      });
    },
  );

  it("rate limits chat posting after admin auth", async () => {
    const adminKey = "strong-admin-key-for-route-tests";

    process.env.ADMIN_API_KEY = adminKey;

    for (let index = 0; index < 10; index += 1) {
      const response = await postChatMessage(
        request("https://command-waves.example.com/api/6529/chat-post", {
          method: "POST",
          headers: {
            "x-admin-api-key": adminKey,
          },
          body: JSON.stringify({
            waveUrl: "https://6529.io/waves/mock-command-wave",
            content: `Chat post ${index}`,
          }),
        }),
      );

      expect(response.status).toBe(200);
    }

    const limited = await postChatMessage(
      request("https://command-waves.example.com/api/6529/chat-post", {
        method: "POST",
        headers: {
          "x-admin-api-key": adminKey,
        },
        body: JSON.stringify({
          waveUrl: "https://6529.io/waves/mock-command-wave",
          content: "Chat post over limit",
        }),
      }),
    );

    expect(limited.status).toBe(429);
    await expect(limited.json()).resolves.toMatchObject({
      error: "Too many requests. Try again shortly.",
    });
  });
});
