import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { postChatMessage } from "./chat-post";
import { resetMockDropsForTests } from "./mock";
import { previewWaveContext } from "./wave-context";

describe("6529 chat posting", () => {
  const previousMockMode = process.env["6529_MOCK_MODE"];
  const previousToken = process.env["6529_BOT_BEARER_TOKEN"];
  const previousWallet = process.env["6529_BOT_WALLET_ADDRESS"];

  beforeEach(() => {
    resetMockDropsForTests();
  });

  afterEach(() => {
    resetMockDropsForTests();

    if (previousMockMode === undefined) {
      delete process.env["6529_MOCK_MODE"];
    } else {
      process.env["6529_MOCK_MODE"] = previousMockMode;
    }

    if (previousToken === undefined) {
      delete process.env["6529_BOT_BEARER_TOKEN"];
    } else {
      process.env["6529_BOT_BEARER_TOKEN"] = previousToken;
    }

    if (previousWallet === undefined) {
      delete process.env["6529_BOT_WALLET_ADDRESS"];
    } else {
      process.env["6529_BOT_WALLET_ADDRESS"] = previousWallet;
    }
  });

  it("posts a chat drop in mock mode", async () => {
    process.env["6529_MOCK_MODE"] = "true";

    const result = await postChatMessage({
      waveUrl: "https://6529.io/waves/6529-hook-builder",
      content: "I can review the fee cap tests.",
    });

    expect(result).toMatchObject({
      waveId: "6529-hook-builder",
      mode: "mock",
    });
    expect(result.dropId).toMatch(/^mock-post-/);
    expect(result.url).toContain("/waves/6529-hook-builder/drops/mock-post-");
  });

  it("makes mock posts visible in later project chat context", async () => {
    process.env["6529_MOCK_MODE"] = "true";

    await postChatMessage({
      waveId: "mock-command-wave",
      content: "Fresh chat note for the hook builders.",
    });

    const preview = await previewWaveContext({
      waveId: "mock-command-wave",
      includeAllHistory: true,
    });

    expect(preview.dropCount).toBe(4);
    expect(preview.sampleDrops.at(-1)).toMatchObject({
      id: "mock-post-4",
      author: "chat-builder",
      preview: "Fresh chat note for the hook builders.",
    });
  });

  it("blocks live posting when the bot is not configured", async () => {
    process.env["6529_MOCK_MODE"] = "false";
    delete process.env["6529_BOT_BEARER_TOKEN"];
    delete process.env["6529_BOT_WALLET_ADDRESS"];

    await expect(
      postChatMessage({
        waveId: "6529-hook-builder",
        content: "Please review this hook idea.",
      }),
    ).rejects.toMatchObject({
      message: "Chat posting is not configured. Copy the draft instead.",
      status: 409,
    });
  });

  it("requires a project chat and message", async () => {
    await expect(postChatMessage({ content: "hello" })).rejects.toMatchObject({
      message: "Choose project chat before posting.",
      status: 400,
    });
    await expect(postChatMessage({ waveId: "6529-hook-builder", content: "" })).rejects.toMatchObject({
      message: "Write a message before posting.",
      status: 400,
    });
  });

  it("rejects oversized chat messages", async () => {
    await expect(
      postChatMessage({
        waveId: "6529-hook-builder",
        content: "x".repeat(4001),
      }),
    ).rejects.toMatchObject({
      message: "Keep chat messages under 4000 characters.",
      status: 400,
    });
  });
});
