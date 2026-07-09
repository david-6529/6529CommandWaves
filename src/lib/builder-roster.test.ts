import { describe, expect, it } from "vitest";
import { createBuilderRoster } from "./builder-roster";
import { createContributionReport } from "./contribution-report";
import { demoWave } from "./demo-wave";

describe("builder roster", () => {
  it("turns contribution evidence into simple member rows", () => {
    const roster = createBuilderRoster(createContributionReport(demoWave), { limit: 6 });

    expect(roster[0]).toMatchObject({
      identity: "david",
      role: "Coordinator",
      activity: "1 proposal, 1 vote, 1 decision, 1 activity event",
      scoreLabel: "10 report points",
      voteSummary: "yes on cmd-001",
      basis: expect.arrayContaining(["Proposal work: 6 report points"]),
      stats: expect.arrayContaining([
        { label: "Proposals", value: "1" },
        { label: "Votes", value: "1" },
        { label: "Decisions", value: "1" },
        { label: "Log", value: "1" },
      ]),
    });
    expect(roster.some((member) => member.identity === "gpebbles" && member.role === "Voter")).toBe(true);
    expect(roster.find((member) => member.identity === "gpebbles")?.scoreLabel).toBe("1 report point");
    expect(roster.find((member) => member.identity === "gpebbles")?.voteSummary).toBe("yes on cmd-001");
    expect(roster.find((member) => member.identity === "blocknoob")?.voteSummary).toBe("no on cmd-001");
    expect(roster.some((member) => member.identity === "Decision")).toBe(false);
  });

  it("exposes activity signals without permission language", () => {
    const roster = createBuilderRoster(createContributionReport(demoWave));
    const copy = roster.map((member) => `${member.role} ${member.activity} ${member.scoreLabel}`).join(" ");

    expect(copy).toContain("report points");
    expect(copy.toLowerCase()).not.toContain("access");
    expect(copy.toLowerCase()).not.toContain("grant");
    expect(copy.toLowerCase()).not.toContain("merge");
    expect(copy).not.toContain("\u2014");
  });

  it("adds recent chat authors without turning them into score authority", () => {
    const report = createContributionReport(demoWave, {
      chatPosts: [
        { author: "chat-builder", preview: "I can review the next small hook change." },
        { author: "david", preview: "I posted an update in chat." },
        { author: "wave-poll", preview: "Decision passed." },
      ],
    });
    const roster = createBuilderRoster(report);

    expect(roster.find((member) => member.identity === "david")?.activity).toContain("1 chat post");
    expect(roster.find((member) => member.identity === "chat-builder")).toMatchObject({
      role: "Chat participant",
      activity: "1 chat post",
      scoreLabel: "chat activity",
      detail: "Recent chat post: I can review the next small hook change.",
      basis: ["Chat posts: 1 report point"],
      stats: [{ label: "Chat posts", value: "1" }],
    });
    expect(roster.some((member) => member.identity === "wave-poll")).toBe(false);
  });

  it("does not turn daemon observations into member profiles", () => {
    const report = createContributionReport({
      ...demoWave,
      ledger: [
        {
          id: "evt-chat",
          at: "2026-06-20T13:10:00.000Z",
          actor: "daemon",
          type: "chat_observed",
          message:
            "Read alice's chat message and updated the project summary: Can we discuss fee cap tests before anyone opens a PR?",
        },
        ...demoWave.ledger,
      ],
    });
    const roster = createBuilderRoster(report);

    expect(roster.some((member) => member.identity === "daemon")).toBe(false);
    expect(roster[0]).toMatchObject({
      identity: "david",
      scoreLabel: "10 report points",
    });
  });
});
