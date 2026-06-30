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
      body: "Discuss this draft in the room before PR work starts.",
      status: "needs decision",
    });
    expect(feed[2]).toMatchObject({
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
});
