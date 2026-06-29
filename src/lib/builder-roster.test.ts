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
    });
    expect(roster.some((member) => member.identity === "gpebbles" && member.role === "Voter")).toBe(true);
  });

  it("keeps member activity separate from permissions", () => {
    const roster = createBuilderRoster(createContributionReport(demoWave));
    const copy = roster.map((member) => `${member.role} ${member.activity} ${member.authorityNote}`).join(" ");

    expect(copy).toContain("Informational only");
    expect(copy.toLowerCase()).not.toContain("permission");
    expect(copy).not.toContain("\u2014");
  });
});
