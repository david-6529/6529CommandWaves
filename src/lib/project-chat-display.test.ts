import { describe, expect, it } from "vitest";
import { projectChatAuthorLabel } from "./project-chat-display";

describe("project chat display", () => {
  it("humanizes system chat authors without changing builder handles", () => {
    expect(projectChatAuthorLabel("wave-poll")).toBe("decision");
    expect(projectChatAuthorLabel(" david ")).toBe("david");
    expect(projectChatAuthorLabel("")).toBe("unknown");
  });

  it("does not emit em dash characters", () => {
    expect(JSON.stringify([projectChatAuthorLabel("wave-poll"), projectChatAuthorLabel("david")])).not.toContain("\u2014");
  });
});
