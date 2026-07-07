import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createPhaseChecklist } from "./phase-checklist";

const configuredDemoWave = {
  ...demoWave,
  repoUrl: "https://github.com/6529-Collections/6529-hook",
};

describe("phase checklist", () => {
  it("marks a configured hook demo as completed through log", () => {
    const checklist = createPhaseChecklist(configuredDemoWave);

    expect(checklist.map((item) => item.id)).toEqual(["project", "proposal", "decision", "build", "review", "log"]);
    expect(checklist.map((item) => item.status)).toEqual(["done", "done", "done", "done", "done", "done"]);
    expect(checklist.find((item) => item.id === "log")?.detail).toContain("discussion update draft");
    expect(checklist.find((item) => item.id === "log")?.detail).toContain("launch packet");
  });

  it("blocks PR work while the GitHub repo is a placeholder", () => {
    const checklist = createPhaseChecklist(demoWave);

    expect(checklist.map((item) => [item.id, item.status])).toEqual([
      ["project", "active"],
      ["proposal", "done"],
      ["decision", "done"],
      ["build", "waiting"],
      ["review", "waiting"],
      ["log", "waiting"],
    ]);
    expect(checklist.find((item) => item.id === "project")).toMatchObject({
      label: "Connect repo",
      detail: "Set a real GitHub repo before PR work can run.",
    });
    expect(checklist.find((item) => item.id === "build")?.detail).toBe("Build waits for a configured GitHub repo.");
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
    expect(checklist.find((item) => item.id === "project")).toMatchObject({
      label: "Choose project",
      detail: "Set a project chat and real GitHub repo.",
    });
  });

  it("shows approved work as ready to build", () => {
    const checklist = createPhaseChecklist({
      ...configuredDemoWave,
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

  it("waits for a project decision receipt after local votes pass", () => {
    const checklist = createPhaseChecklist({
      ...configuredDemoWave,
      proposals: [{ ...demoWave.proposals[0], status: "ready_for_vote" }],
      polls: [{ ...demoWave.polls[0], decision: null }],
      executions: [],
      reviews: [],
      ledger: [],
    });

    expect(checklist.find((item) => item.id === "decision")).toMatchObject({
      status: "active",
      detail: "Vote passed locally. Record the project decision URL.",
    });
    expect(checklist.find((item) => item.id === "build")).toMatchObject({
      status: "waiting",
      detail: "Build waits for a recorded project decision.",
    });
  });

  it("does not treat a PR drop id receipt as a wave decision URL", () => {
    const checklist = createPhaseChecklist({
      ...configuredDemoWave,
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
      detail: "Project decision URL is required for PR work.",
    });
    expect(checklist.find((item) => item.id === "build")).toMatchObject({
      status: "waiting",
      detail: "Build waits for a recorded project decision.",
    });
  });

  it("keeps support items outside the PR build checklist", () => {
    const checklist = createPhaseChecklist({
      ...configuredDemoWave,
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
      "Support item recorded. Write one PR-sized hook change.",
    );
  });

  it("keeps a completed PR loop complete when a support command is latest", () => {
    const checklist = createPhaseChecklist({
      ...configuredDemoWave,
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
