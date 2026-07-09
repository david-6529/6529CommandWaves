import { describe, expect, it } from "vitest";
import { defaultRules, type CommandWave } from "./command-waves";
import { demoWave } from "./demo-wave";
import { createProjectChatFeed } from "./project-chat-feed";

describe("project chat feed", () => {
  it("shows project thread evidence without echoing the composer draft", () => {
    const feed = createProjectChatFeed(demoWave);

    expect(feed.map((item) => item.label)).toEqual(["message", "message", "message", "message"]);
    expect(feed[0]).toMatchObject({
      author: "david",
      title: "Suggested work",
      body:
        "I think the next hook change should be Draft the non-upgradeable hook scaffold. Draft the non-upgradeable AMM hook scaffold with fee parameters capped at 100 bps and tests.",
      status: "complete",
    });
    expect(feed[1]).toMatchObject({
      author: "gpebbles",
      title: "Scope check",
      body: "Let's keep this to the non-upgradeable scaffold, fee cap, and tests. No deploy or ownership change.",
      status: "scope",
    });
    expect(feed[2]).toMatchObject({
      author: "builders",
      title: "Decision linked",
      body: "The hook scaffold vote passed with 5 yes and 1 no. This is the scope PRs should follow.",
      status: "5 yes, 1 no",
    });
    expect(feed[3]).toMatchObject({
      author: "david",
      title: "PR",
      body: "I linked the PR for the approved hook change so everyone can inspect the code and tests.",
      hrefLabel: "Open PR",
      status: "complete",
    });
    expect(feed.map((item) => item.body).join(" ")).not.toContain("Can we discuss Add fee cap tests?");
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
        author: "builders",
        title: "Start the thread",
        body: "Say what you want to build or ask what the group should decide next. daemon will keep the project summary current.",
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

  it("shows builder conversation when PR work is waiting on a repo", () => {
    const wave: CommandWave = {
      id: "cw-repo-needed",
      name: "6529 AMM hook",
      waveUrl: "https://6529.io/waves/6529-hook-builder",
      repoUrl: "",
      gates: [],
      rules: defaultRules,
      proposals: [
        {
          id: "cmd-001",
          title: "Draft the non-upgradeable hook scaffold",
          proposer: "david",
          kind: "open_pr",
          risk: "high",
          prompt: "Draft the hook scaffold with capped fee parameters and tests.",
          spec: "No deploy scripts or ownership changes.",
          budgetUsd: 0,
          status: "approved",
        },
      ],
      polls: [],
      executions: [],
      reviews: [],
      ledger: [
        {
          id: "evt-001",
          at: "2026-06-20T12:05:03.000Z",
          actor: "Rule Engine",
          type: "rule_check",
          message: "Marked the hook scaffold high risk.",
        },
      ],
    };
    const feed = createProjectChatFeed(wave);

    expect(feed).toHaveLength(4);
    expect(feed[0]).toMatchObject({
      author: "david",
      title: "Suggested work",
    });
    expect(feed[1]).toMatchObject({
      author: "gpebbles",
      title: "Scope check",
      body: "Let's keep this to the non-upgradeable scaffold, fee cap, and tests. No deploy or ownership change.",
    });
    expect(feed[2]).toMatchObject({
      author: "simo",
      title: "Repo next",
      body: "PR work can start once maintainers select the pilot GitHub repo.",
    });
    expect(feed.map((item) => item.author)).not.toContain("Rule Engine");
  });
});
