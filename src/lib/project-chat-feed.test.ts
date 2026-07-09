import { describe, expect, it } from "vitest";
import { defaultRules, type CommandWave } from "./command-waves";
import { demoWave } from "./demo-wave";
import { createProjectChatFeed } from "./project-chat-feed";

describe("project chat feed", () => {
  it("shows the next draft and local hook evidence when live posts are absent", () => {
    const feed = createProjectChatFeed(demoWave, {
      title: "Add fee cap tests",
      prompt: "Add tests for the fee cap.",
      proposer: "david",
    });

    expect(feed.map((item) => item.label)).toEqual(["message", "message", "message", "message"]);
    expect(feed[0]).toMatchObject({
      author: "david",
      title: "Suggested work",
      body: "I want to discuss Add fee cap tests. Add tests for the fee cap.",
      status: "draft",
    });
    expect(feed[1]).toMatchObject({
      author: "daemon",
      title: "Waiting for agreement",
      body: "I am watching for clear agreement before this becomes PR work.",
      status: "needs decision",
    });
    expect(feed[2]).toMatchObject({
      author: "daemon",
      title: "Last PR",
      body: "I recorded the PR for the approved hook change so builders can inspect it.",
      hrefLabel: "Open PR",
      status: "complete",
    });
    expect(feed[3]).toMatchObject({
      author: "review-agent",
      body: "Review checked the PR against the approved hook proposal and rules.",
      title: "Review passed",
      status: "pass",
    });
  });

  it("falls back to a clear start item when no project activity exists", () => {
    const emptyWave: CommandWave = {
      id: "cw-empty",
      name: "6529 AMM hook",
      waveUrl: "",
      repoUrl: "",
      gates: [],
      rules: defaultRules,
      proposals: [],
      polls: [],
      executions: [],
      reviews: [],
      ledger: [],
    };

    expect(createProjectChatFeed(emptyWave)).toEqual([
      {
        id: "start",
        label: "message",
        author: "daemon",
        title: "Waiting for builders",
        body: "Start with one small hook change. I will summarize agreement and keep the next step current.",
        status: "waiting",
      },
    ]);
  });

  it("shows support proposals when no PR proposal is active", () => {
    const wave: CommandWave = {
      id: "cw-support",
      name: "6529 AMM hook",
      waveUrl: "https://6529.io/waves/6529-hook-builder",
      repoUrl: "https://github.com/6529-Collections/6529-hook",
      gates: [],
      rules: defaultRules,
      proposals: [
        {
          id: "cmd-002",
          title: "Clarify fee cap options",
          proposer: "david",
          kind: "draft_response",
          risk: "low",
          prompt: "Compare the simplest fee cap options.",
          spec: "Keep it short.",
          budgetUsd: 0,
          status: "approved",
        },
      ],
      polls: [],
      executions: [],
      reviews: [],
      ledger: [],
    };

    expect(createProjectChatFeed(wave)[0]).toMatchObject({
      id: "support-cmd-002",
      label: "message",
      author: "david",
      title: "Question",
      body: "Clarify fee cap options: Compare the simplest fee cap options.",
      status: "approved",
    });
  });
});
