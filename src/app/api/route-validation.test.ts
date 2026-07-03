import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as previewContext } from "./6529/context/preview/route";
import { POST as postRoomMessage } from "./6529/room-post/route";
import { GET as searchWaves } from "./6529/waves/search/route";
import { POST as createCodexPacket } from "./command-wave/codex-packet/route";
import { POST as validateSetup } from "./command-wave/setup/validate/route";
import { resetMockDropsForTests } from "@/lib/6529/mock";
import {
  clearCommandWaveStoreForTests,
  resetCommandWave,
  submitCommandProposal,
} from "@/lib/command-wave-store";
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
  const previousAdminKey = process.env.ADMIN_API_KEY;
  const previousStoreMode = process.env.COMMAND_WAVE_STORE;

  beforeEach(async () => {
    delete process.env.ADMIN_API_KEY;
    process.env["6529_MOCK_MODE"] = "true";
    process.env.COMMAND_WAVE_STORE = "memory";
    clearCommandWaveStoreForTests();
    await resetCommandWave();
    resetMockDropsForTests();
    resetRateLimitsForTest();
  });

  afterEach(() => {
    clearCommandWaveStoreForTests();
    resetMockDropsForTests();
    resetRateLimitsForTest();

    if (previousMockMode === undefined) {
      delete process.env["6529_MOCK_MODE"];
    } else {
      process.env["6529_MOCK_MODE"] = previousMockMode;
    }

    if (previousAdminKey === undefined) {
      delete process.env.ADMIN_API_KEY;
    } else {
      process.env.ADMIN_API_KEY = previousAdminKey;
    }

    if (previousStoreMode === undefined) {
      delete process.env.COMMAND_WAVE_STORE;
    } else {
      process.env.COMMAND_WAVE_STORE = previousStoreMode;
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

  it("rejects oversized room posts at the route", async () => {
    const response = await postRoomMessage(
      request("https://command-waves.example.com/api/6529/room-post", {
        method: "POST",
        body: JSON.stringify({
          waveUrl: "https://6529.io/waves/mock-command-wave",
          content: "x".repeat(4001),
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(responsePayload(response)).resolves.toMatchObject({
      error: "Keep room messages under 4000 characters.",
    });
  });

  it("creates Codex packets for approved PR proposals at the route", async () => {
    const response = await createCodexPacket(
      request("https://command-waves.example.com/api/command-wave/codex-packet", {
        method: "POST",
        body: JSON.stringify({
          proposalId: "cmd-001",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(responsePayload(response)).resolves.toMatchObject({
      packet: {
        mode: "manual_codex",
        proposalId: "cmd-001",
      },
    });
  });

  it("rejects missing Codex packet proposals at the route", async () => {
    const response = await createCodexPacket(
      request("https://command-waves.example.com/api/command-wave/codex-packet", {
        method: "POST",
        body: JSON.stringify({
          proposalId: "cmd-missing",
        }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(responsePayload(response)).resolves.toMatchObject({
      error: "Proposal not found.",
    });
  });

  it("rejects non-PR Codex packet proposals at the route", async () => {
    await submitCommandProposal({
      title: "Draft scope note",
      proposer: "tester",
      kind: "draft_response",
      prompt: "Draft a note about phase 1 scope.",
      spec: "Draft only.",
      budgetUsd: 0,
    });

    const response = await createCodexPacket(
      request("https://command-waves.example.com/api/command-wave/codex-packet", {
        method: "POST",
        body: JSON.stringify({
          proposalId: "cmd-002",
        }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(responsePayload(response)).resolves.toMatchObject({
      error: "Codex work packets are only available for PR commands.",
    });
  });
});
