import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createProjectWorkspaceView } from "./project-workspace-view";

describe("project workspace view", () => {
  it("creates an honest preview without seeded people or activity", () => {
    const view = createProjectWorkspaceView(demoWave, { previewMode: true });
    const text = JSON.stringify(view);

    expect(view.mode).toBe("preview");
    expect(view.projectName).toBe("6529 AMM Hook");
    expect(view.statusLabel).toBe("Design preview");
    expect(view.stats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Builders", value: "50 max", detail: "Enrollment not open" }),
        expect.objectContaining({ label: "Contributor share", value: "Needs approval" }),
        expect.objectContaining({ label: "Repository", value: "Not connected" }),
        expect.objectContaining({ label: "Reviewer", value: "Not selected" }),
      ]),
    );
    expect(view.decision).toEqual(
      expect.objectContaining({
        title: "Approve the pilot rules",
        status: "Needs decision",
      }),
    );
    expect(view.workItems).toHaveLength(3);
    expect(view.workItems[0]).toEqual(
      expect.objectContaining({
        title: "Define immutable fee behavior",
        credits: "Set before claim",
      }),
    );
    expect(view.discussion.messages).toEqual([]);
    expect(view.contributors).toEqual([]);
    expect(view.pullRequests).toEqual([]);
    expect(text).not.toContain("5 yes");
    expect(text).not.toContain("report points");
    expect(text).not.toContain("preview-redaction");
    expect(text).not.toContain("runtime-check");
  });

  it("maps configured project discussion and repository evidence", () => {
    const wave = {
      ...demoWave,
      name: "Public Hook Project",
      repoUrl: "https://github.com/6529/public-hook",
      executions: [],
      reviews: [],
      ledger: [
        {
          id: "evt-live-chat",
          at: "2026-07-09T20:00:00.000Z",
          actor: "daemon",
          type: "chat_observed" as const,
          message: "alice suggested work. Message: Can we add invariant tests for the fee cap?",
        },
      ],
    };
    const view = createProjectWorkspaceView(wave, { previewMode: false });

    expect(view.mode).toBe("live");
    expect(view.projectName).toBe("Public Hook Project");
    expect(view.repoUrl).toBe("https://github.com/6529/public-hook");
    expect(view.stats).toContainEqual(
      expect.objectContaining({
        label: "Repository",
        value: "6529/public-hook",
        detail: "GitHub connected",
      }),
    );
    expect(view.discussion.messages).toEqual([
      {
        id: "evt-live-chat",
        author: "alice",
        body: "Can we add invariant tests for the fee cap?",
        at: "2026-07-09T20:00:00.000Z",
        channel: "design",
      },
    ]);
    expect(view.discussion.summary).toBe("daemon has indexed 1 recent builder message.");
    expect(view.proof.events).toBe("1 recorded event");
  });
});
