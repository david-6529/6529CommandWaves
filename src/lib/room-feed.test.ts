import { describe, expect, it } from "vitest";
import { defaultRules, type CommandWave } from "./command-waves";
import { demoWave } from "./demo-wave";
import { createRoomFeed } from "./room-feed";

describe("room feed", () => {
  it("shows the next draft and local hook evidence when live posts are absent", () => {
    const feed = createRoomFeed(demoWave, {
      title: "Add fee cap tests",
      prompt: "Add tests for the fee cap.",
      proposer: "david",
    });

    expect(feed.map((item) => item.label)).toEqual(["Next proposal", "Draft status", "Last PR", "Last review"]);
    expect(feed[0]).toMatchObject({
      title: "Add fee cap tests",
      status: "draft",
    });
    expect(feed[1]).toMatchObject({
      title: "Not decided yet",
      body: "Share this draft in the room before PR work starts.",
      status: "needs decision",
    });
    expect(feed[2]).toMatchObject({
      title: "PR recorded",
      body: "The approved hook change has a PR record ready for builders to inspect.",
      hrefLabel: "Open PR",
      status: "complete",
    });
    expect(feed[3]).toMatchObject({
      body: "The review checked the PR against the approved hook proposal and rules.",
      title: "Review passed",
      status: "pass",
    });
  });

  it("falls back to a clear start item when no project activity exists", () => {
    const emptyWave: CommandWave = {
      id: "cw-empty",
      name: "6529 Hook",
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

    expect(createRoomFeed(emptyWave)).toEqual([
      {
        id: "start",
        label: "Start",
        title: "No hook activity yet",
        body: "Pick one small hook change and bring it to the room.",
        status: "waiting",
      },
    ]);
  });

  it("shows support proposals when no PR proposal is active", () => {
    const wave: CommandWave = {
      id: "cw-support",
      name: "6529 Hook",
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

    expect(createRoomFeed(wave)[0]).toMatchObject({
      id: "support-cmd-002",
      label: "Question",
      title: "Clarify fee cap options",
      body: "Compare the simplest fee cap options.",
      status: "approved",
    });
  });
});
