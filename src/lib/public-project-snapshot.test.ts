import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createPublicProjectSnapshot } from "./public-project-snapshot";

describe("public project snapshot", () => {
  it("summarizes current hook work without implying the placeholder repo can run code", () => {
    const snapshot = createPublicProjectSnapshot(demoWave);

    expect(snapshot).toMatchObject({
      summary:
        "Builders coordinate this hook in chat. Decisions approve scoped work. GitHub PRs and human review handle code. Now: Draft the non-upgradeable hook scaffold. Next: Keep discussing in chat. Select the hook repo before PR work starts. Repo: not selected. Latest: Builders approved the hook scaffold with 5 yes and 1 no.",
      summaryParagraphs: [
        "Builders coordinate this hook in chat. Decisions approve scoped work. GitHub PRs and human review handle code.",
        "Now: Draft the non-upgradeable hook scaffold. Next: Keep discussing in chat. Select the hook repo before PR work starts. Repo: not selected. Latest: Builders approved the hook scaffold with 5 yes and 1 no.",
      ],
      updatedAt: "2026-06-20T12:40:00.000Z",
      currentWork: {
        title: "Draft the non-upgradeable hook scaffold",
        status: "complete",
      },
      decision: {
        status: "recorded",
        detail: "Builders approved with 5 yes and 1 no.",
      },
      repo: {
        status: "placeholder",
        label: "GitHub repo placeholder. No GitHub repo is selected yet. PR work stays blocked until maintainers choose the repo.",
        url: null,
      },
      nextStep: {
        label: "Build PR",
        status: "waiting",
        detail: "Select the hook repo before PR work starts.",
      },
    });
    expect(snapshot.latestChanges[0]).toMatchObject({
      label: "builders approved",
      message: "Builders approved the hook scaffold with 5 yes and 1 no.",
    });
    expect(snapshot.latestChanges.map((event) => event.label)).not.toContain("review recorded");
    expect(JSON.stringify(snapshot)).not.toContain("\u2014");
  });

  it("updates the daemon summary from current project state", () => {
    const emptyWave = {
      ...demoWave,
      proposals: [],
      polls: [],
      executions: [],
      reviews: [],
      ledger: [],
    };
    const configuredWave = {
      ...demoWave,
      repoUrl: "https://github.com/builders/hook",
    };

    expect(createPublicProjectSnapshot(emptyWave).summary).toContain("Now: Choose one hook change.");
    expect(createPublicProjectSnapshot(emptyWave).updatedAt).toBeNull();
    expect(createPublicProjectSnapshot(emptyWave).summary).toContain("Latest: no project changes recorded yet.");
    expect(createPublicProjectSnapshot(configuredWave).summary).toContain(
      "Repo: connected. Approved changes can enter PR review.",
    );
  });

  it("moves new proposal activity into the current summary and changelog", () => {
    const snapshot = createPublicProjectSnapshot({
      ...demoWave,
      proposals: [
        {
          ...demoWave.proposals[0],
          id: "cmd-002",
          title: "Add swap fee cap tests",
          status: "ready_for_vote",
        },
        ...demoWave.proposals,
      ],
      ledger: [
        ...demoWave.ledger,
        {
          id: "evt-new-work",
          at: "2026-06-20T13:05:00.000Z",
          actor: "daemon",
          type: "proposal_submitted",
          message: "Submitted cmd-002: Add swap fee cap tests.",
        },
      ],
    });

    expect(snapshot.currentWork).toMatchObject({
      title: "Add swap fee cap tests",
      status: "ready for vote",
    });
    expect(snapshot.summary).toContain("Now: Add swap fee cap tests.");
    expect(snapshot.summary).toContain("Latest: Submitted cmd-002: Add swap fee cap tests.");
    expect(snapshot.latestChanges[0]).toMatchObject({
      label: "work proposed",
      message: "Submitted cmd-002: Add swap fee cap tests.",
    });
    expect(snapshot.updatedAt).toBe("2026-06-20T13:05:00.000Z");
  });

  it("labels local approval as waiting for a decision link", () => {
    const snapshot = createPublicProjectSnapshot({
      ...demoWave,
      proposals: [{ ...demoWave.proposals[0], status: "ready_for_vote" }],
      polls: [{ ...demoWave.polls[0], decision: null }],
      executions: [],
      reviews: [],
    });

    expect(snapshot.decision).toMatchObject({
      status: "decision link needed",
      detail: "Local vote passed. Record the project decision link before PR work starts.",
    });
  });
});
