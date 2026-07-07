import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as previewContext } from "./6529/context/preview/route";
import { POST as postChatMessage } from "./6529/chat-post/route";
import { GET as searchWaves } from "./6529/waves/search/route";
import { POST as createCodexPacket } from "./command-wave/codex-packet/route";
import { POST as recordDecision } from "./command-wave/decision/route";
import { POST as executeCommand } from "./command-wave/execute/route";
import { GET as getChatLaunch } from "./command-wave/launch/chat/route";
import { POST as submitProposalRoute } from "./command-wave/proposals/route";
import { POST as reviewCommand } from "./command-wave/review/route";
import { DELETE as resetWave, PATCH as updateSetup, PUT as replaceWave } from "./command-wave/route";
import { POST as validateSetup } from "./command-wave/setup/validate/route";
import { GET as getVerificationManifest } from "./command-wave/verification/manifest/route";
import { POST as recordVoteRoute } from "./command-wave/votes/route";
import { resetMockDropsForTests } from "@/lib/6529/mock";
import {
  clearCommandWaveStoreForTests,
  resetCommandWave,
  submitCommandProposal,
} from "@/lib/command-wave-store";
import { resetRateLimitsForTest } from "@/lib/rate-limit";

function request(url: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.81",
      ...(init.headers ?? {}),
    },
  });
}

async function responsePayload(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

type RouteHandler = (request: Request) => Response | Promise<Response>;

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

  it("rejects malformed setup wave IDs at the route", async () => {
    const response = await validateSetup(
      request("https://command-waves.example.com/api/command-wave/setup/validate", {
        method: "POST",
        body: JSON.stringify({
          waveUrl: "../bad wave",
          repoUrl: "6529-Collections/6529-hook",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(responsePayload(response)).resolves.toMatchObject({
      error: "6529 wave id can only include letters, numbers, hyphens, underscores, or periods.",
    });
  });

  it("rejects oversized chat posts at the route", async () => {
    const response = await postChatMessage(
      request("https://command-waves.example.com/api/6529/chat-post", {
        method: "POST",
        body: JSON.stringify({
          waveUrl: "https://6529.io/waves/mock-command-wave",
          content: "x".repeat(4001),
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(responsePayload(response)).resolves.toMatchObject({
      error: "Keep chat messages under 4000 characters.",
    });
  });

  it("rejects non-JSON mutation bodies at the route", async () => {
    const response = await submitProposalRoute(
      request("https://command-waves.example.com/api/command-wave/proposals", {
        method: "POST",
        headers: {
          "content-type": "text/plain",
        },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(415);
    await expect(responsePayload(response)).resolves.toMatchObject({
      error: "Content-Type must be application/json.",
    });
  });

  it.each([
    ["setup update", updateSetup, "/api/command-wave", "PATCH"],
    ["state replacement", replaceWave, "/api/command-wave", "PUT"],
    ["state reset", resetWave, "/api/command-wave", "DELETE"],
    ["proposal submit", submitProposalRoute, "/api/command-wave/proposals", "POST"],
    ["vote record", recordVoteRoute, "/api/command-wave/votes", "POST"],
    ["decision record", recordDecision, "/api/command-wave/decision", "POST"],
    ["PR build", executeCommand, "/api/command-wave/execute", "POST"],
    ["review record", reviewCommand, "/api/command-wave/review", "POST"],
    ["Codex packet", createCodexPacket, "/api/command-wave/codex-packet", "POST"],
    ["chat post", postChatMessage, "/api/6529/chat-post", "POST"],
  ] satisfies [string, RouteHandler, string, string][])(
    "requires admin auth for %s routes when configured",
    async (_label, handler, path, method) => {
      process.env.ADMIN_API_KEY = "strong-admin-key-for-route-tests";

      const response = await handler(
        request(`https://command-waves.example.com${path}`, {
          method,
          body: method === "DELETE" ? null : JSON.stringify({}),
        }),
      );

      expect(response.status).toBe(401);
      await expect(responsePayload(response)).resolves.toMatchObject({
        error: "Admin API key required.",
      });
    },
  );

  it("rejects Codex packets while the repo is a placeholder", async () => {
    const response = await createCodexPacket(
      request("https://command-waves.example.com/api/command-wave/codex-packet", {
        method: "POST",
        body: JSON.stringify({
          proposalId: "cmd-001",
        }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(responsePayload(response)).resolves.toMatchObject({
      error: "Select the GitHub repo before creating a Codex work packet.",
    });
  });

  it("publishes chat launch state without requiring a selected repo", async () => {
    const response = await getChatLaunch(request("https://command-waves.example.com/api/command-wave/launch/chat"));

    expect(response.status).toBe(200);
    await expect(responsePayload(response)).resolves.toMatchObject({
      audit: {
        version: "command-wave-chat-launch-v0.1",
        project: {
          repoUrl: "https://github.com/your-org/your-hook-repo",
        },
        prLoop: {
          status: "blocked",
        },
        verification: {
          launchStatus: "blocked",
        },
      },
    });
  });

  it("publishes the public verification manifest", async () => {
    const response = await getVerificationManifest(
      request("https://command-waves.example.com/api/command-wave/verification/manifest"),
    );

    expect(response.status).toBe(200);
    await expect(responsePayload(response)).resolves.toMatchObject({
      manifest: {
        version: "command-wave-verification-manifest-v0.1",
        project: {
          repoStatus: "placeholder",
        },
        stableAnchors: {
          waveStateHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          setupHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          projectIndexHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
        endpoints: expect.arrayContaining([
          expect.objectContaining({
            id: "verification_manifest",
            requiredHashFields: ["manifestHash"],
          }),
          expect.objectContaining({
            id: "chat_launch",
            requiredHashFields: ["chatLaunchHash", "sourceAuditHash"],
          }),
        ]),
        manifestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    });
  });

  it("creates Codex packets for approved PR proposals at the route", async () => {
    await updateSetup(
      request("https://command-waves.example.com/api/command-wave", {
        method: "PATCH",
        body: JSON.stringify({
          waveUrl: "https://6529.io/waves/6529-hook-builder",
          repoUrl: "https://github.com/6529-Collections/6529-hook",
        }),
      }),
    );

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
