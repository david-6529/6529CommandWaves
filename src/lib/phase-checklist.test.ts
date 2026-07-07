import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createPhaseChecklist } from "./phase-checklist";
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

describe("phase checklist", () => {
  it("keeps a configured hook demo waiting on reviewer process", () => {
    const checklist = createPhaseChecklist(configuredDemoWave);

    expect(checklist.map((item) => item.id)).toEqual(["project", "proposal", "decision", "build", "review", "log"]);
    expect(checklist.map((item) => item.status)).toEqual(["done", "done", "done", "done", "active", "waiting"]);
    expect(checklist.find((item) => item.id === "review")).toMatchObject({
      status: "active",
      detail: "Select the reviewer process before marking review complete.",
    });
    expect(checklist.find((item) => item.id === "log")?.detail).toBe("Log the result before sharing it back.");
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
      label: "Repo placeholder",
      detail: "PR work waits until maintainers select the GitHub repo.",
    });
    expect(checklist.find((item) => item.id === "build")?.detail).toBe("Build waits for a selected GitHub repo.");
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
      detail: "Set a project chat and GitHub repo.",
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

  it("blocks a stale PR record that points outside the selected repo", () => {
    const checklist = createPhaseChecklist({
      ...configuredDemoWave,
      executions: configuredDemoWave.executions.map((execution) => ({
        ...execution,
        artifacts: execution.artifacts.map((artifact) =>
          artifact.startsWith("https://github.com/") ? "https://github.com/other-org/other-hook/pull/12" : artifact,
        ),
      })),
      reviews: [],
    });

    expect(checklist.find((item) => item.id === "build")).toMatchObject({
      status: "blocked",
      detail: "PR record must link to the selected GitHub repo.",
    });
    expect(checklist.find((item) => item.id === "review")).toMatchObject({
      status: "blocked",
      detail: "Review waits for a PR link that matches the selected GitHub repo.",
    });
  });

  it("blocks stale review proof that is not bound to the selected repo", () => {
    const checklist = createPhaseChecklist({
      ...configuredDemoWave,
      reviews: configuredDemoWave.reviews.map((review) => ({
        ...review,
        proof: review.proof
          ? {
              ...review.proof,
              inputs: {
                ...review.proof.inputs,
                repositoryHash: undefined,
              },
            }
          : review.proof,
      })),
    });

    expect(checklist.find((item) => item.id === "review")).toMatchObject({
      status: "blocked",
      detail: "Reviewer proof must be bound to the selected GitHub repo.",
    });
    expect(checklist.find((item) => item.id === "log")).toMatchObject({
      status: "blocked",
      detail: "Resolve review evidence before logging the result.",
    });
  });

  it("waits for a project decision link after local votes pass", () => {
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
      detail: "Build waits for a recorded project decision link.",
    });
  });

  it("does not treat a PR drop id as a project decision URL", () => {
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
      detail: "Build waits for a recorded project decision link.",
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

    expect(checklist.map((item) => item.status)).toEqual(["done", "done", "done", "done", "active", "waiting"]);
    expect(checklist.find((item) => item.id === "proposal")?.detail).toContain("cmd-001");
  });
});
