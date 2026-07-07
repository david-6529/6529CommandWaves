import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createPublicProjectSnapshot } from "./public-project-snapshot";

describe("public project snapshot", () => {
  it("summarizes current hook work without implying the placeholder repo can run code", () => {
    const snapshot = createPublicProjectSnapshot(demoWave);

    expect(snapshot).toMatchObject({
      summary:
        "This pilot is the shared workspace for the 6529 AMM hook. Builders use chat to ask questions, suggest work, record decisions, and move approved changes into GitHub PRs. Current focus: Draft the non-upgradeable hook scaffold. Next: PR work waits until maintainers select the GitHub repo. GitHub repo is still a placeholder, so PR work waits. Latest change: Review passed the hook scaffold. It matched the builder decision and rules.",
      summaryParagraphs: [
        "This pilot is the shared workspace for the 6529 AMM hook. Builders use chat to ask questions, suggest work, record decisions, and move approved changes into GitHub PRs.",
        "Current focus: Draft the non-upgradeable hook scaffold. Next: PR work waits until maintainers select the GitHub repo. GitHub repo is still a placeholder, so PR work waits. Latest change: Review passed the hook scaffold. It matched the builder decision and rules.",
      ],
      updatedAt: "2026-06-20T12:50:00.000Z",
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
        label: "GitHub repo placeholder. The GitHub repo is a placeholder until the pilot repo is selected.",
        url: null,
      },
      nextStep: {
        label: "Repo placeholder",
        status: "active",
        detail: "PR work waits until maintainers select the GitHub repo.",
      },
    });
    expect(snapshot.latestChanges[0]).toMatchObject({
      label: "review recorded",
      message: "Review passed the hook scaffold. It matched the builder decision and rules.",
    });
    const approvalSnapshot = createPublicProjectSnapshot({
      ...demoWave,
      executions: [],
      reviews: [],
      ledger: demoWave.ledger.filter((event) => event.type !== "guardian_reviewed" && event.type !== "execution_logged"),
    });
    expect(approvalSnapshot.latestChanges[0]).toMatchObject({
      label: "builders approved",
      message: "Builders approved the hook scaffold with 5 yes and 1 no.",
    });
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
