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
      title: "6529 decision recorded",
      detail: "5 yes, 1 no.",
      href: "https://6529.io/waves/6529-hook-builder/drops/drop-cmd-001-approval",
      hrefLabel: "Open decision",
    });
    expect(timeline[2].href).toBe("https://github.com/6529-Collections/6529-hook/pull/12");
    expect(timeline[2].detail).toBe("Approved PR evidence is recorded.");
    expect(timeline[3].detail).toBe("Reviewer checked the PR against the approved hook proposal and rules.");
    expect(timeline[4]).toMatchObject({
      title: "Add fee cap tests",
      detail: "Bring the next small hook change to the room.",
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
