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

  it("waits for a wave decision receipt after local votes pass", () => {
    const checklist = createPhaseChecklist({
      ...demoWave,
      proposals: [{ ...demoWave.proposals[0], status: "ready_for_vote" }],
      polls: [{ ...demoWave.polls[0], decision: null }],
      executions: [],
      reviews: [],
      ledger: [],
    });

    expect(checklist.find((item) => item.id === "decision")).toMatchObject({
      status: "active",
      detail: "Vote passed locally. Record the 6529 decision URL.",
    });
    expect(checklist.find((item) => item.id === "build")).toMatchObject({
      status: "waiting",
      detail: "Build waits for a recorded wave decision.",
    });
  });

  it("does not treat a PR drop id receipt as a wave decision URL", () => {
    const checklist = createPhaseChecklist({
      ...demoWave,
      proposals: [{ ...demoWave.proposals[0], status: "approved" }],
      polls: [
        {
          ...demoWave.polls[0],
          decision: {
            ...demoWave.polls[0].decision!,
            url: null,
          },
        },
      ],
      executions: [],
      reviews: [],
      ledger: [],
    });

    expect(checklist.find((item) => item.id === "decision")).toMatchObject({
      status: "active",
      detail: "Wave decision URL is required for PR work.",
    });
    expect(checklist.find((item) => item.id === "build")).toMatchObject({
      status: "waiting",
      detail: "Build waits for a recorded wave decision.",
    });
  });

  it("keeps support commands outside the PR build checklist", () => {
    const checklist = createPhaseChecklist({
      ...demoWave,
      proposals: [
        {
          ...demoWave.proposals[0],
          id: "cmd-002",
          title: "Draft launch scope note",
          kind: "draft_response",
          status: "approved",
        },
      ],
      polls: [],
      executions: [],
      reviews: [],
      ledger: [],
    });

    expect(checklist.map((item) => [item.id, item.status])).toEqual([
      ["project", "done"],
      ["proposal", "active"],
      ["decision", "waiting"],
      ["build", "waiting"],
      ["review", "waiting"],
      ["log", "waiting"],
    ]);
    expect(checklist.find((item) => item.id === "proposal")?.detail).toBe(
      "Support command recorded. Write one PR-sized hook command.",
    );
  });

  it("keeps a completed PR loop complete when a support command is latest", () => {
    const checklist = createPhaseChecklist({
      ...demoWave,
      proposals: [
        {
          ...demoWave.proposals[0],
          id: "cmd-002",
          title: "Draft launch scope note",
          kind: "draft_response",
          status: "approved",
        },
        demoWave.proposals[0],
      ],
    });

    expect(checklist.map((item) => item.status)).toEqual(["done", "done", "done", "done", "done", "done"]);
    expect(checklist.find((item) => item.id === "proposal")?.detail).toContain("cmd-001");
  });
});
