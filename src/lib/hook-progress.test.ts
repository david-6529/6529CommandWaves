import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createHookProgress } from "./hook-progress";

describe("hook progress", () => {
  it("starts a fresh visible loop after the previous PR review passes", () => {
    const progress = createHookProgress(demoWave, "Add fee cap tests");

    expect(progress.map((step) => [step.id, step.status])).toEqual([
      ["discuss", "current"],
      ["decide", "waiting"],
      ["build", "waiting"],
      ["review", "waiting"],
    ]);
    expect(progress[0].detail).toBe("Shape this proposal in the room.");
  });

  it("shows decision as current when a proposal needs a 6529 receipt", () => {
    const progress = createHookProgress({
      ...demoWave,
      proposals: [{ ...demoWave.proposals[0], status: "ready_for_vote" }],
      polls: [{ ...demoWave.polls[0], decision: null }],
      executions: [],
      reviews: [],
    });

    expect(progress.map((step) => [step.id, step.status])).toEqual([
      ["discuss", "done"],
      ["decide", "current"],
      ["build", "waiting"],
      ["review", "waiting"],
    ]);
  });

  it("shows PR as current after a valid decision is recorded", () => {
    const progress = createHookProgress({
      ...demoWave,
      proposals: [{ ...demoWave.proposals[0], status: "approved" }],
      executions: [],
      reviews: [],
    });

    expect(progress.map((step) => [step.id, step.status])).toEqual([
      ["discuss", "done"],
      ["decide", "done"],
      ["build", "current"],
      ["review", "waiting"],
    ]);
  });

  it("shows review as current after PR evidence is recorded", () => {
    const progress = createHookProgress({
      ...demoWave,
      proposals: [{ ...demoWave.proposals[0], status: "reviewing" }],
      reviews: [],
    });

    expect(progress.map((step) => [step.id, step.status])).toEqual([
      ["discuss", "done"],
      ["decide", "done"],
      ["build", "done"],
      ["review", "current"],
    ]);
  });
});
