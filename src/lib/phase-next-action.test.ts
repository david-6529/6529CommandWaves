import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createPhaseChecklist } from "./phase-checklist";
import { createPhaseNextAction } from "./phase-next-action";
import { hashValue } from "./run-manifest";

const configuredRepo = {
  owner: "6529-Collections",
  repo: "6529-hook",
  htmlUrl: "https://github.com/6529-Collections/6529-hook",
};

const configuredDemoWave = {
  ...demoWave,
  repoUrl: configuredRepo.htmlUrl,
  executions: demoWave.executions.map((execution) => ({
    ...execution,
    artifacts: execution.artifacts.map((artifact) => artifact.replace(demoWave.repoUrl, configuredRepo.htmlUrl)),
  })),
  reviews: demoWave.reviews.map((review) => ({
    ...review,
    proof: review.proof
      ? {
          ...review.proof,
          inputs: {
            ...review.proof.inputs,
            repositoryHash: hashValue(configuredRepo),
          },
        }
      : review.proof,
  })),
};

describe("phase next action", () => {
  it("points configured demo loop to reviewer process selection", () => {
    const nextAction = createPhaseNextAction(createPhaseChecklist(configuredDemoWave));

    expect(nextAction).toMatchObject({
      status: "action",
      statusLabel: "next",
      stepLabel: "Review",
      title: "Select reviewer process",
      detail: "Select the reviewer process before marking review complete.",
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

  it("shows placeholder repo as the PR blocker after chat is selected", () => {
    const nextAction = createPhaseNextAction(createPhaseChecklist(demoWave));

    expect(nextAction).toMatchObject({
      status: "waiting",
      stepLabel: "Build PR",
      title: "Repo not selected yet",
      detail: "Select the hook repo before PR work starts.",
    });
  });

  it("points approved work to the PR build step", () => {
    const nextAction = createPhaseNextAction(
      createPhaseChecklist({
        ...configuredDemoWave,
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

  it("points local vote approval without a decision link back to decision", () => {
    const nextAction = createPhaseNextAction(
      createPhaseChecklist({
        ...configuredDemoWave,
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
      title: "Get the project decision",
      detail: "Ask builders to decide, then record the project decision URL before work runs.",
    });
  });

  it("keeps result sharing draft-only and human reviewed", () => {
    const nextAction = createPhaseNextAction([
      { id: "project", label: "Choose project", status: "done", detail: "Project chat and GitHub repo are set." },
      { id: "proposal", label: "Propose work", status: "done", detail: "cmd-001: Draft hook scaffold" },
      { id: "decision", label: "Decide", status: "done", detail: "Decision link recorded." },
      { id: "build", label: "Build PR", status: "done", detail: "PR record is ready." },
      { id: "review", label: "Review", status: "done", detail: "Reviewer proof and checks are recorded." },
      { id: "log", label: "Log", status: "active", detail: "Log the result before sharing it back." },
    ]);

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
        ...configuredDemoWave,
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
    const nextAction = createPhaseNextAction(createPhaseChecklist(configuredDemoWave));

    expect(JSON.stringify(nextAction)).not.toContain("\u2014");
  });
});
