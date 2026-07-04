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
      scoreLabel: "activity 10",
      authorityNote: "Informational only",
      basis: expect.arrayContaining(["Proposal work: 6 report points"]),
      stats: expect.arrayContaining([
        { label: "Proposals", value: "1" },
        { label: "Votes", value: "1" },
        { label: "Decisions", value: "1" },
        { label: "Log", value: "1" },
      ]),
    });
    expect(roster.some((member) => member.identity === "gpebbles" && member.role === "Voter")).toBe(true);
    expect(roster.some((member) => member.identity === "Decision")).toBe(false);
  });

  it("keeps member activity separate from permissions", () => {
    const roster = createBuilderRoster(createContributionReport(demoWave));
    const copy = roster.map((member) => `${member.role} ${member.activity} ${member.authorityNote}`).join(" ");

    expect(copy).toContain("Informational only");
    expect(copy.toLowerCase()).not.toContain("permission");
    expect(copy).not.toContain("\u2014");
  });

  it("adds recent room authors without turning them into score authority", () => {
    const report = createContributionReport(demoWave, {
      roomPosts: [
        { author: "room-builder", preview: "I can review the next small hook change." },
        { author: "david", preview: "I posted an update for the room." },
        { author: "wave-poll", preview: "Decision passed." },
      ],
    });
    const roster = createBuilderRoster(report);

    expect(roster.find((member) => member.identity === "david")?.activity).toContain("1 room post");
    expect(roster.find((member) => member.identity === "room-builder")).toMatchObject({
      role: "Room participant",
      activity: "1 room post",
      scoreLabel: "room activity",
      authorityNote: "Informational only",
      detail: "Recent room post: I can review the next small hook change.",
      basis: ["Room posts: 1 report point"],
      stats: [{ label: "Room posts", value: "1" }],
    });
    expect(roster.some((member) => member.identity === "wave-poll")).toBe(false);
  });
});
