import { describe, expect, it } from "vitest";
import { chatPostPaceIdentity, directChatPostPace } from "./chat-posting-policy";

describe("chat posting policy", () => {
  it("publishes the direct posting pace used by the project chat route", () => {
    expect(directChatPostPace).toEqual({
      maxPosts: 3,
      windowMs: 300_000,
      windowSeconds: 300,
      identity: "builder identity",
      enforcedBy: "daemon",
    });
  });

  it("chooses a stable pacing identity without granting authority", () => {
    expect(chatPostPaceIdentity({ senderId: " david " })).toBe("david");
    expect(chatPostPaceIdentity({ walletAddress: " 0x123 " })).toBe("0x123");
    expect(chatPostPaceIdentity({ author: "builder" })).toBe("builder");
    expect(chatPostPaceIdentity({})).toBe("anonymous-builder");
  });
});
