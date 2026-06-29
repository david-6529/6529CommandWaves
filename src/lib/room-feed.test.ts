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

    expect(feed.map((item) => item.label)).toEqual(["Next proposal", "Decision", "PR", "Review"]);
    expect(feed[0]).toMatchObject({
      title: "Add fee cap tests",
      status: "draft",
    });
    expect(feed[1].href).toContain("https://6529.io/waves/6529-hook-builder");
    expect(feed[1].body).toBe("The 6529 decision recorded 5 yes and 1 no.");
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
