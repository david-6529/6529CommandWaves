import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createActiveHookProjects } from "./hook-projects";
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

describe("active hook projects", () => {
  it("lists the placeholder hook build as setup work", () => {
    const projects = createActiveHookProjects(demoWave);

    expect(projects).toEqual([
      expect.objectContaining({
        id: demoWave.id,
        name: "Hook Build",
        status: "setup",
        waveUrl: demoWave.waveUrl,
        repoUrl: demoWave.repoUrl,
        waveLabel: "6529-hook-builder",
        repoLabel: "GitHub repo placeholder",
        currentFocus: demoWave.proposals[0].title,
        participation: "Follow project chat, draft replies for manual posting, and track code work.",
        waveRole: "Where builders talk, propose, decide, and share updates.",
        platformRole: "Code state, PR record, review result, launch packet, and contribution report.",
        gateDetails: [
          "Manual builder review for phase 1",
          "REP or TDH access checks are planned, not enforced here",
          "AI contribution report scores are not permissions",
        ],
        gateSnapshotLabel: "manual review",
        orchestrationSnapshotLabel: "high approved",
        codeSnapshotLabel: "repo placeholder",
        nextActionStatus: "action",
        nextActionLabel: "next",
        nextActionTitle: "Select the repo",
        nextActionDetail: "Select the GitHub repo before PR work can run.",
        waveStatus: "Project decision recorded with 5 yes and 1 no.",
        codeStatus: "GitHub repo is also a placeholder until selected.",
        latestPrUrl: null,
        reviewStatusLabel: "not ready",
        evidenceLabel: "1 proposal, repo not set",
      }),
    ]);
  });

  it("lists a configured hook build with reviewed PR evidence", () => {
    const projects = createActiveHookProjects(configuredDemoWave);

    expect(projects[0]).toMatchObject({
      status: "active",
      repoLabel: "6529-Collections/6529-hook",
      codeSnapshotLabel: "PR reviewed",
      nextActionStatus: "ready",
      nextActionLabel: "ready",
      nextActionTitle: "Loop complete",
      nextActionDetail: "The approved hook work has a PR, review, project update, and launch packet.",
      codeStatus: "PR reviewed and logged.",
      reviewStatusLabel: "review passed",
      evidenceLabel: "1 proposal, 1 run, 1 review",
    });
  });

  it("falls back to setup state before a project is configured", () => {
    const projects = createActiveHookProjects({
      ...demoWave,
      waveUrl: "",
      repoUrl: "",
      proposals: [],
    });

    expect(projects[0]).toMatchObject({
      status: "setup",
      waveLabel: "No chat",
      repoLabel: "No GitHub repo",
      currentFocus: "Choose the first PR-sized hook change.",
      nextActionStatus: "action",
      nextActionLabel: "next",
      nextActionTitle: "Set the project",
      nextActionDetail: "Confirm one project chat and one GitHub repo before proposals start.",
      waveStatus: "No PR-sized hook change selected yet.",
      gateSnapshotLabel: "manual review",
      gateDetails: [
        "Manual builder review for phase 1",
        "REP or TDH access checks are planned, not enforced here",
        "AI contribution report scores are not permissions",
      ],
      orchestrationSnapshotLabel: "needs idea",
      codeStatus: "No PR-sized hook change yet.",
      codeSnapshotLabel: "no PR yet",
    });
  });

  it("summarizes local wave approval before code evidence exists", () => {
    const projects = createActiveHookProjects({
      ...configuredDemoWave,
      proposals: [{ ...demoWave.proposals[0], status: "approved" }],
      executions: [],
      reviews: [],
    });

    expect(projects[0]).toMatchObject({
      waveStatus: "Project decision recorded with 5 yes and 1 no.",
      gateSnapshotLabel: "manual review",
      orchestrationSnapshotLabel: "high approved",
      codeStatus: "Approved PR change is ready to build.",
      codeSnapshotLabel: "ready to build",
      nextActionTitle: "Build the approved PR",
      nextActionDetail: "Use the approved packet or prepared branch, then record the PR.",
      latestPrUrl: null,
      reviewStatusLabel: "not reviewed",
    });
  });

  it("shows a readable review state after a PR record exists", () => {
    const projects = createActiveHookProjects({
      ...configuredDemoWave,
      proposals: [{ ...demoWave.proposals[0], status: "reviewing" }],
      reviews: [],
    });

    expect(projects[0]).toMatchObject({
      codeStatus: "PR record is ready for review.",
      codeSnapshotLabel: "PR ready",
      reviewStatusLabel: "ready for review",
    });
  });

  it("does not surface stale PR links or review proof as ready", () => {
    const projects = createActiveHookProjects({
      ...configuredDemoWave,
      executions: configuredDemoWave.executions.map((execution) => ({
        ...execution,
        artifacts: execution.artifacts.map((artifact) =>
          artifact.startsWith("https://github.com/") ? "https://github.com/other-org/other-hook/pull/12" : artifact,
        ),
      })),
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

    expect(projects[0]).toMatchObject({
      codeStatus: "Reviewer proof must be bound to the selected GitHub repo.",
      codeSnapshotLabel: "review proof needed",
      latestPrUrl: null,
      reviewStatusLabel: "proof needs repo",
      evidenceLabel: "1 proposal, 1 run, 0 reviews",
    });
  });

  it("shows unset gates and open orchestration before participation notes exist", () => {
    const projects = createActiveHookProjects({
      ...demoWave,
      gates: [],
      proposals: [],
      polls: [],
      executions: [],
      reviews: [],
    });

    expect(projects[0]).toMatchObject({
      gateSnapshotLabel: "access not set",
      gateDetails: ["Who can join is not set yet."],
      orchestrationSnapshotLabel: "needs idea",
    });
  });

  it("shows a readable review state when changes are requested", () => {
    const projects = createActiveHookProjects({
      ...configuredDemoWave,
      reviews: [{ ...demoWave.reviews[0], status: "changes_requested" }],
    });

    expect(projects[0]).toMatchObject({
      reviewStatusLabel: "changes requested",
    });
  });

  it("uses the newest ledger timestamp for latest activity", () => {
    const projects = createActiveHookProjects({
      ...demoWave,
      ledger: [
        {
          id: "evt-newest",
          at: "2026-06-20T13:00:00.000Z",
          actor: "Reviewer",
          type: "guardian_reviewed",
          message: "Newest review event.",
        },
        {
          id: "evt-oldest",
          at: "2026-06-20T11:00:00.000Z",
          actor: "Setup",
          type: "wave_created",
          message: "Old setup event.",
        },
      ],
    });

    expect(projects[0]).toMatchObject({
      latestActivity: "Newest review event.",
    });
  });

  it("can list more than one hook project without merging wave or repo labels", () => {
    const projects = createActiveHookProjects([
      demoWave,
      {
        ...demoWave,
        id: "cw-community-hook",
        name: "Community Hook",
        waveUrl: "https://6529.io/waves/community-hook-builder",
        repoUrl: "https://github.com/6529-Collections/community-hook",
        proposals: [],
        polls: [],
        executions: [],
        reviews: [],
      },
    ]);

    expect(projects).toHaveLength(2);
    expect(projects[0]).toMatchObject({
      id: demoWave.id,
      waveLabel: "6529-hook-builder",
      repoLabel: "GitHub repo placeholder",
    });
    expect(projects[1]).toMatchObject({
      id: "cw-community-hook",
      name: "Community Hook",
      waveLabel: "community-hook-builder",
      repoLabel: "6529-Collections/community-hook",
      currentFocus: "Choose the first PR-sized hook change.",
    });
  });

  it("does not emit U+2014 characters", () => {
    expect(JSON.stringify(createActiveHookProjects(demoWave))).not.toContain("\u2014");
  });
});
