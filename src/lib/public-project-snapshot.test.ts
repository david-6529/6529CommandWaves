import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createPublicProjectSnapshot } from "./public-project-snapshot";

describe("public project snapshot", () => {
  it("summarizes current hook work without implying the placeholder repo can run code", () => {
    const snapshot = createPublicProjectSnapshot(demoWave);

    expect(snapshot).toMatchObject({
      summary:
        "This is a shared workspace for one hook project. Builders use chat to ask questions, suggest work, record decisions, and prepare approved changes for GitHub PRs. Current focus: Draft the non-upgradeable hook scaffold. Next: Select the hook repo before PR work starts. Repo is a placeholder until PR work starts. Latest change: Builders approved the hook scaffold with 5 yes and 1 no.",
      summaryParagraphs: [
        "This is a shared workspace for one hook project. Builders use chat to ask questions, suggest work, record decisions, and prepare approved changes for GitHub PRs.",
        "Current focus: Draft the non-upgradeable hook scaffold. Next: Select the hook repo before PR work starts. Repo is a placeholder until PR work starts. Latest change: Builders approved the hook scaffold with 5 yes and 1 no.",
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
        label: "GitHub repo placeholder. The GitHub repo is intentionally a placeholder until PR work starts.",
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

    expect(createPublicProjectSnapshot(emptyWave).summary).toContain("Current focus: Choose one hook change.");
    expect(createPublicProjectSnapshot(emptyWave).updatedAt).toBeNull();
    expect(createPublicProjectSnapshot(emptyWave).summary).toContain("No project changes recorded yet.");
    expect(createPublicProjectSnapshot(configuredWave).summary).toContain(
      "Repo is connected. Approved changes can move into PR review.",
    );
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
