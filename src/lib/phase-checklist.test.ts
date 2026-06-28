import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createPhaseChecklist } from "./phase-checklist";

describe("phase checklist", () => {
  it("marks the built-in hook demo as completed through log", () => {
    const checklist = createPhaseChecklist(demoWave);

    expect(checklist.map((item) => item.id)).toEqual(["project", "proposal", "decision", "build", "review", "log"]);
    expect(checklist.map((item) => item.status)).toEqual(["done", "done", "done", "done", "done", "done"]);
    expect(checklist.find((item) => item.id === "log")?.detail).toContain("wave update draft");
  });

  it("shows setup as active before a valid repo is configured", () => {
    const checklist = createPhaseChecklist({
      ...demoWave,
      waveUrl: "",
      repoUrl: "not github",
      proposals: [],
      polls: [],
      executions: [],
      reviews: [],
      ledger: [],
    });

    expect(checklist.map((item) => [item.id, item.status])).toEqual([
      ["project", "active"],
      ["proposal", "waiting"],
      ["decision", "waiting"],
      ["build", "waiting"],
      ["review", "waiting"],
      ["log", "waiting"],
    ]);
  });

  it("shows approved work as ready to build", () => {
    const checklist = createPhaseChecklist({
      ...demoWave,
      proposals: [{ ...demoWave.proposals[0], status: "approved" }],
      executions: [],
      reviews: [],
      ledger: [],
    });

    expect(checklist.find((item) => item.id === "build")).toMatchObject({
      status: "active",
      detail: "Approved work is ready for the PR build step.",
    });
  });
});
