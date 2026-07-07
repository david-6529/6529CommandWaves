import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createPublicProjectSnapshot } from "./public-project-snapshot";

describe("public project snapshot", () => {
  it("summarizes current hook work without implying the placeholder repo can run code", () => {
    const snapshot = createPublicProjectSnapshot(demoWave);

    expect(snapshot).toMatchObject({
      summary:
        "This page is the working snapshot for the 6529 AMM hook build. Builders use chat to shape ideas, record decisions, attach pull requests, and review the result. Current focus: Draft the non-upgradeable hook scaffold. Next step: Select the GitHub repo before PR work can run. The GitHub repo is a placeholder, so PR work waits until the repo is selected.",
      updatedAt: "2026-06-20T12:50:00.000Z",
      currentWork: {
        title: "Draft the non-upgradeable hook scaffold",
        status: "complete",
      },
      decision: {
        status: "recorded",
        detail: "5 yes, 1 no. Decision link recorded.",
      },
      repo: {
        status: "placeholder",
        label: "GitHub repo is also a placeholder.",
        url: null,
      },
      nextStep: {
        label: "Select repo",
        status: "active",
        detail: "Select the GitHub repo before PR work can run.",
      },
    });
    expect(snapshot.latestChanges[0]).toMatchObject({
      label: "review recorded",
      message: "Review passed cmd-001. The hook scaffold matched the vote and rules.",
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
    expect(createPublicProjectSnapshot(configuredWave).summary).toContain(
      "The GitHub repo is connected, so approved changes can move into PR review.",
    );
  });
});
