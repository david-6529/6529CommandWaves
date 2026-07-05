import { describe, expect, it } from "vitest";
import { createBuildTimeline } from "./build-timeline";
import { demoWave } from "./demo-wave";

describe("build timeline", () => {
  it("shows reviewed hook work as a completed loop with the next change current", () => {
    const timeline = createBuildTimeline(demoWave, "Add fee cap tests");

    expect(timeline.map((item) => [item.label, item.status])).toEqual([
      ["Proposal", "done"],
      ["Decision", "done"],
      ["PR", "done"],
      ["Review", "done"],
      ["Next", "current"],
    ]);
    expect(timeline[1]).toMatchObject({
      title: "Project decision recorded",
      detail: "5 yes, 1 no.",
      href: "https://6529.io/waves/6529-hook-builder/drops/drop-cmd-001-approval",
      hrefLabel: "Open decision",
    });
    expect(timeline[2].href).toBe(`${demoWave.repoUrl}/pull/12`);
    expect(timeline[2]).toMatchObject({
      title: "PR recorded",
      detail: "Approved PR record is ready for review.",
    });
    expect(timeline[3].detail).toBe("Reviewer checked the PR against the approved hook proposal and rules.");
    expect(timeline[4]).toMatchObject({
      title: "Add fee cap tests",
      detail: "Bring the next small hook change to chat.",
    });
  });

  it("starts with a proposal when no hook PR exists yet", () => {
    const timeline = createBuildTimeline({
      ...demoWave,
      proposals: [],
      polls: [],
      executions: [],
      reviews: [],
    });

    expect(timeline.map((item) => [item.label, item.status])).toEqual([
      ["Proposal", "current"],
      ["Decision", "waiting"],
      ["PR", "waiting"],
      ["Review", "waiting"],
      ["Next", "waiting"],
    ]);
    expect(timeline[0].title).toBe("Choose one hook change");
    expect(timeline.map((item) => item.detail).join(" ")).not.toContain("\u2014");
  });
});
