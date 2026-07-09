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
        name: "6529 AMM hook",
        status: "setup",
        waveUrl: demoWave.waveUrl,
        repoUrl: null,
        waveLabel: "6529-hook-builder",
        repoLabel: "GitHub repo placeholder",
        currentFocus: demoWave.proposals[0].title,
        participation: "Follow project chat, draft replies for manual posting, and track code work.",
        waveRole: "Where builders talk, propose, decide, and share updates.",
        platformRole: "Code state, PR record, review result, launch packet, and contribution report.",
        accessDetails: [
          "Manual builder review for phase 1",
          "REP or TDH access checks are planned, not enforced here",
          "AI contribution report scores are not permissions",
        ],
        accessSnapshotLabel: "manual review",
        orchestrationSnapshotLabel: "high approved",
        codeSnapshotLabel: "GitHub repo placeholder",
        nextActionStatus: "waiting",
        nextActionLabel: "waiting",
        nextActionTitle: "Repo not selected yet",
        nextActionDetail: "Select the hook repo before PR work starts.",
        waveStatus: "Builders approved with 5 yes and 1 no.",
        codeStatus: "GitHub repo is not selected yet.",
        latestPrUrl: null,
        reviewStatusLabel: "not ready",
        evidenceLabel: "1 proposal, GitHub repo not set",
        latestActivity: "Builders approved the hook scaffold with 5 yes and 1 no.",
        summaryParagraphs: [
          "Builders coordinate this hook in chat. Decisions approve scoped work. GitHub PRs and human review handle code.",
          "Now: Draft the non-upgradeable hook scaffold. Next: Keep discussing in chat. Select the hook repo before PR work starts. Repo: not selected. Latest: Builders approved the hook scaffold with 5 yes and 1 no.",
        ],
        managedBy: {
          summary: "daemon",
          changelog: "daemon",
          pullRequests: "daemon",
          reviewer: "review-agent",
        },
        currentVote: expect.objectContaining({
          status: "recorded",
          title: "No open vote",
          proposalId: "cmd-001",
          yesVotes: 5,
          noVotes: 1,
        }),
        discussionTopics: [
          expect.objectContaining({
            id: "proposal-cmd-001",
            title: "Draft hook scaffold",
            status: "repo not selected",
          }),
          expect.objectContaining({
            id: "repo-selection",
            title: "Select the pilot GitHub repo",
            status: "needed",
          }),
        ],
        pullRequests: [],
        memberCount: 6,
        members: expect.arrayContaining([
          expect.objectContaining({
            identity: "david",
            role: "Coordinator",
            voteSummary: "yes on cmd-001",
          }),
          expect.objectContaining({
            identity: "blocknoob",
            role: "Voter",
            voteSummary: "no on cmd-001",
          }),
        ]),
      }),
    ]);
  });

  it("lists a configured hook build with reviewer process pending", () => {
    const projects = createActiveHookProjects(configuredDemoWave);

    expect(projects[0]).toMatchObject({
      status: "active",
      repoUrl: configuredRepo.htmlUrl,
      repoLabel: "6529-Collections/6529-hook",
      codeSnapshotLabel: "reviewer pending",
      nextActionStatus: "action",
      nextActionLabel: "next",
      nextActionTitle: "Select reviewer process",
      nextActionDetail: "Select the reviewer process before marking review complete.",
      codeStatus: "Reviewer process must be selected before review is complete.",
      reviewStatusLabel: "reviewer process needed",
      evidenceLabel: "1 proposal, 1 run, reviewer pending",
      pullRequests: [
        {
          id: "cmd-001",
          title: "Draft hook scaffold",
          reason: "Draft the non-upgradeable AMM hook scaffold with fee parameters capped at 100 bps and tests.",
          url: "https://github.com/6529-Collections/6529-hook/pull/12",
          daemonSignoff: "signed off",
          reviewerSignoff: "proof recorded",
        },
      ],
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
      nextActionDetail: "Confirm the project chat. The GitHub repo can stay as a placeholder until maintainers choose it.",
      waveStatus: "No PR-sized hook change selected yet.",
      accessSnapshotLabel: "manual review",
      accessDetails: [
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
      waveStatus: "Builders approved with 5 yes and 1 no.",
      accessSnapshotLabel: "manual review",
      orchestrationSnapshotLabel: "high approved",
      codeStatus: "Approved PR change is ready to build.",
      codeSnapshotLabel: "ready to build",
      nextActionTitle: "Build the approved PR",
      nextActionDetail: "Use the approved packet or prepared branch, then record the PR.",
      latestPrUrl: null,
      reviewStatusLabel: "not reviewed",
    });
  });

  it("labels a passed local vote as waiting for the decision link", () => {
    const projects = createActiveHookProjects({
      ...configuredDemoWave,
      proposals: [{ ...demoWave.proposals[0], status: "ready_for_vote" }],
      polls: [{ ...demoWave.polls[0], decision: null }],
      executions: [],
      reviews: [],
    });

    expect(projects[0]).toMatchObject({
      orchestrationSnapshotLabel: "needs decision link",
      waveStatus: "Project decision link needed before PR work starts.",
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

  it("shows unset access notes and open orchestration before participation notes exist", () => {
    const projects = createActiveHookProjects({
      ...demoWave,
      gates: [],
      proposals: [],
      polls: [],
      executions: [],
      reviews: [],
    });

    expect(projects[0]).toMatchObject({
      accessSnapshotLabel: "access not set",
      accessDetails: ["Who can join is not set yet."],
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
      ...configuredDemoWave,
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
      repoUrl: "https://github.com/6529-Collections/community-hook",
      waveLabel: "community-hook-builder",
      repoLabel: "6529-Collections/community-hook",
      currentFocus: "Choose the first PR-sized hook change.",
    });
  });

  it("does not emit U+2014 characters", () => {
    expect(JSON.stringify(createActiveHookProjects(demoWave))).not.toContain("\u2014");
  });

  it("does not emit legacy gate field names", () => {
    const serialized = JSON.stringify(createActiveHookProjects(demoWave));

    expect(serialized).toContain("accessDetails");
    expect(serialized).toContain("accessSnapshotLabel");
    expect(serialized).not.toContain("gateDetails");
    expect(serialized).not.toContain("gateSnapshotLabel");
  });
});
