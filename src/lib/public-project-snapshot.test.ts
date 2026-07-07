import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createPublicProjectSnapshot } from "./public-project-snapshot";

describe("public project snapshot", () => {
  it("summarizes current hook work without implying the placeholder repo can run code", () => {
    const snapshot = createPublicProjectSnapshot(demoWave);

    expect(snapshot).toMatchObject({
      summary:
        "This project coordinates one hook build through chat, decisions, PRs, review, and a clear log. Current work: Draft the non-upgradeable hook scaffold. Next: Choose project. Add real repo before PR build.",
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
        label: "Add real repo before PR build.",
        url: null,
      },
      nextStep: {
        label: "Choose project",
        status: "active",
        detail: "Set a valid project chat and real GitHub repo.",
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

    expect(createPublicProjectSnapshot(emptyWave).summary).toContain("Current work: Choose one hook change.");
    expect(createPublicProjectSnapshot(configuredWave).summary).toContain("GitHub repo configured.");
  });
});
