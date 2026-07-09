import { describe, expect, it } from "vitest";
import {
  compactPublicChatMessage,
  createProjectChatObservation,
  messageFromProjectChatObservation,
  projectChatObservationLabel,
  projectChatSignal,
  publicChatAuthor,
  signalFromProjectChatObservation,
} from "./project-chat-observation";

describe("project chat observation", () => {
  it("detects useful daemon signals from normal group chat messages", () => {
    expect(projectChatSignal("I opened https://github.com/builders/hook/pull/45 for fee cap tests.")).toBe("pr_link");
    expect(projectChatSignal("Can we vote on the fee cap direction?")).toBe("decision_request");
    expect(projectChatSignal("Please review the hook tests before we merge.")).toBe("review_request");
    expect(projectChatSignal("Which GitHub repo should we use?")).toBe("repo_setup");
    expect(projectChatSignal("I suggest a small fee cap test PR next.")).toBe("suggested_work");
    expect(projectChatSignal("Why is the hook immutable?")).toBe("question");
    expect(projectChatSignal("I am reading the fee cap notes.")).toBe("chat");
    expect(projectChatSignal("No deploy or ownership change.")).toBe("chat");
  });

  it("creates concise public daemon observations without leaking obvious secrets", () => {
    const observation = createProjectChatObservation({
      author: " 0x1234567890abcdef1234567890abcdef12345678 ",
      content:
        "Can we review this PR? https://github.com/builders/hook/pull/45 token=abc1234567890 private_key=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    });

    expect(observation).toMatchObject({
      author: "0x1234...5678",
      signal: "pr_link",
    });
    expect(observation.summary).toContain("0x1234...5678 shared a PR link for discussion. Message:");
    expect(observation.summary).toContain("https://github.com/builders/hook/pull/45");
    expect(observation.summary).toContain("token=[redacted]");
    expect(observation.summary).toContain("private_key=[redacted]");
    expect(observation.summary).not.toContain("abc1234567890");
    expect(observation.summary).not.toContain("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
  });

  it("keeps legacy observation messages readable for existing state", () => {
    expect(messageFromProjectChatObservation("alice suggested work. Message: Can we discuss fee caps?")).toBe(
      "Can we discuss fee caps?",
    );
    expect(
      messageFromProjectChatObservation(
        "Read alice's chat message and updated the project summary: Can we discuss fee caps?",
      ),
    ).toBe("Can we discuss fee caps?");
  });

  it("labels parsed daemon observations for public changelogs", () => {
    expect(projectChatObservationLabel("alice shared a PR link for discussion. Message: https://github.com/builders/hook/pull/45")).toBe(
      "PR link",
    );
    expect(projectChatObservationLabel("alice asked for a decision. Message: Can we vote?")).toBe("decision request");
    expect(projectChatObservationLabel("alice asked for review. Message: Please test this.")).toBe("review request");
    expect(projectChatObservationLabel("alice discussed repo setup. Message: Which GitHub repo should we use?")).toBe("repo setup");
    expect(projectChatObservationLabel("alice suggested work. Message: I suggest a fee cap test PR.")).toBe("work suggested");
    expect(projectChatObservationLabel("alice raised a question. Message: Why immutable?")).toBe("question");
    expect(signalFromProjectChatObservation("Legacy note with https://github.com/builders/hook/pull/45")).toBe("pr_link");
  });

  it("keeps public author and message compaction deterministic", () => {
    expect(publicChatAuthor("")).toBe("builder");
    expect(publicChatAuthor("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234...5678");
    expect(compactPublicChatMessage("x".repeat(160))).toBe(`${"x".repeat(137)}...`);
  });
});
