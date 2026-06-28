import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createPhaseChecklist } from "./phase-checklist";
import { createPhaseNextAction } from "./phase-next-action";

describe("phase next action", () => {
  it("marks the completed demo loop ready", () => {
    const nextAction = createPhaseNextAction(createPhaseChecklist(demoWave));

    expect(nextAction).toMatchObject({
      status: "ready",
      statusLabel: "ready",
      stepLabel: "Log",
      title: "Loop complete",
    });
  });

  it("points incomplete setup to the project step", () => {
    const nextAction = createPhaseNextAction(
      createPhaseChecklist({
        ...demoWave,
        waveUrl: "",
        repoUrl: "not github",
        proposals: [],
        polls: [],
        executions: [],
        reviews: [],
        ledger: [],
      }),
    );

    expect(nextAction).toMatchObject({
      status: "action",
      stepLabel: "Choose project",
      title: "Set the project",
    });
  });

  it("points approved work to the PR build step", () => {
    const nextAction = createPhaseNextAction(
      createPhaseChecklist({
        ...demoWave,
        proposals: [{ ...demoWave.proposals[0], status: "approved" }],
        executions: [],
        reviews: [],
        ledger: [],
      }),
    );

    expect(nextAction).toMatchObject({
      status: "action",
      stepLabel: "Build PR",
      title: "Build the approved PR",
    });
  });

  it("surfaces blocked decisions before later waiting steps", () => {
    const nextAction = createPhaseNextAction(
      createPhaseChecklist({
        ...demoWave,
        proposals: [{ ...demoWave.proposals[0], status: "rejected" }],
        polls: [{ ...demoWave.polls[0], status: "failed" }],
        executions: [],
        reviews: [],
        ledger: [],
      }),
    );

    expect(nextAction).toMatchObject({
      status: "blocked",
      stepLabel: "Decide",
      title: "Fix decide",
    });
  });

  it("does not emit em dash characters", () => {
    const nextAction = createPhaseNextAction(createPhaseChecklist(demoWave));

    expect(JSON.stringify(nextAction)).not.toContain("\u2014");
  });
});
