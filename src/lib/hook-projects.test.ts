import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createActiveHookProjects } from "./hook-projects";

describe("active hook projects", () => {
  it("lists the 6529 hook with its builder wave and repo", () => {
    const projects = createActiveHookProjects(demoWave);

    expect(projects).toEqual([
      expect.objectContaining({
        id: demoWave.id,
        name: "6529 Hook",
        status: "active",
        waveUrl: demoWave.waveUrl,
        repoUrl: demoWave.repoUrl,
        waveLabel: "6529-hook-builder",
        repoLabel: "6529-Collections/6529-hook",
        currentFocus: demoWave.proposals[0].title,
        participation: "Read the wave, draft replies for manual posting, and track repo work.",
        waveRole: "Live discussion, proposals, decisions, and updates.",
        platformRole: "GitHub repo state, PR evidence, review proof, launch packet, and contribution report.",
        gateDetails: [
          "Builder wave allowlist for phase 1, manual note only",
          "REP or TDH gates are planned, not enforced here",
          "AI contribution report scores are not permissions",
        ],
        gateSnapshotLabel: "manual gate",
        orchestrationSnapshotLabel: "high approved",
        codeSnapshotLabel: "PR reviewed",
        nextActionStatus: "ready",
        nextActionLabel: "ready",
        nextActionTitle: "Loop complete",
        nextActionDetail: "The approved hook work has PR, review, wave update, and launch packet evidence.",
        waveStatus: "Wave decision recorded with 5 yes and 1 no.",
        codeStatus: "PR reviewed and logged.",
        latestPrUrl: "https://github.com/6529-Collections/6529-hook/pull/12",
        reviewStatusLabel: "review passed",
        evidenceLabel: "1 command, 1 run, 1 review",
      }),
    ]);
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
      waveLabel: "No builder wave",
      repoLabel: "No GitHub repo",
      currentFocus: "Choose the first PR-sized hook command.",
      nextActionStatus: "action",
      nextActionLabel: "next",
      nextActionTitle: "Set the project",
      nextActionDetail: "Confirm one builder wave and one GitHub repo before proposals start.",
      waveStatus: "Wave has not selected a PR-sized hook command yet.",
      gateSnapshotLabel: "manual gate",
      gateDetails: [
        "Builder wave allowlist for phase 1, manual note only",
        "REP or TDH gates are planned, not enforced here",
        "AI contribution report scores are not permissions",
      ],
      orchestrationSnapshotLabel: "needs idea",
      codeStatus: "No PR-sized hook command yet.",
      codeSnapshotLabel: "no PR yet",
    });
  });

  it("summarizes local wave approval before code evidence exists", () => {
    const projects = createActiveHookProjects({
      ...demoWave,
      proposals: [{ ...demoWave.proposals[0], status: "approved" }],
      executions: [],
      reviews: [],
    });

    expect(projects[0]).toMatchObject({
      waveStatus: "Wave decision recorded with 5 yes and 1 no.",
      gateSnapshotLabel: "manual gate",
      orchestrationSnapshotLabel: "high approved",
      codeStatus: "Approved PR command is ready to build.",
      codeSnapshotLabel: "ready to build",
      nextActionTitle: "Build the approved PR",
      nextActionDetail: "Use the approved packet or prepared branch, then record the PR evidence.",
      latestPrUrl: null,
      reviewStatusLabel: "not reviewed",
    });
  });

  it("shows a readable review state after PR evidence exists", () => {
    const projects = createActiveHookProjects({
      ...demoWave,
      proposals: [{ ...demoWave.proposals[0], status: "reviewing" }],
      reviews: [],
    });

    expect(projects[0]).toMatchObject({
      codeStatus: "PR evidence is ready for review.",
      codeSnapshotLabel: "PR ready",
      reviewStatusLabel: "ready for review",
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
      gateSnapshotLabel: "gate unset",
      gateDetails: ["Participation gate is not set yet."],
      orchestrationSnapshotLabel: "needs idea",
    });
  });

  it("shows a readable review state when changes are requested", () => {
    const projects = createActiveHookProjects({
      ...demoWave,
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
      repoLabel: "6529-Collections/6529-hook",
    });
    expect(projects[1]).toMatchObject({
      id: "cw-community-hook",
      name: "Community Hook",
      waveLabel: "community-hook-builder",
      repoLabel: "6529-Collections/community-hook",
      currentFocus: "Choose the first PR-sized hook command.",
    });
  });

  it("does not emit U+2014 characters", () => {
    expect(JSON.stringify(createActiveHookProjects(demoWave))).not.toContain("\u2014");
  });
});
