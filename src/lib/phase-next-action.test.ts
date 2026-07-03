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
      detail: "The approved hook work has a PR, review, room update, and launch packet.",
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

  it("points local vote approval without a receipt back to decision", () => {
    const nextAction = createPhaseNextAction(
      createPhaseChecklist({
        ...demoWave,
        proposals: [{ ...demoWave.proposals[0], status: "ready_for_vote" }],
        polls: [{ ...demoWave.polls[0], decision: null }],
        executions: [],
        reviews: [],
        ledger: [],
      }),
    );

    expect(nextAction).toMatchObject({
      status: "action",
      stepLabel: "Decide",
      title: "Get the room decision",
      detail: "Ask the room to decide, then record the 6529 decision URL before work runs.",
    });
  });

  it("keeps result sharing draft-only and human reviewed", () => {
    const nextAction = createPhaseNextAction(
      createPhaseChecklist({
        ...demoWave,
        ledger: demoWave.ledger.filter((event) => event.type !== "guardian_reviewed"),
      }),
    );

    expect(nextAction).toMatchObject({
      status: "action",
      stepLabel: "Log",
      title: "Share the result",
      detail: "Review the discussion update draft, share it manually, and keep the launch packet with the PR audit trail.",
    });
    expect(nextAction.detail.toLowerCase()).not.toContain("automatic");
  });

  it("keeps support items from becoming the PR build next action", () => {
    const nextAction = createPhaseNextAction(
      createPhaseChecklist({
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
      }),
    );

    expect(nextAction).toMatchObject({
      status: "action",
      stepLabel: "Propose work",
      title: "Propose scoped hook work",
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
