import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createProjectWorkspaceView, findWorkspaceWorkItem } from "./project-workspace-view";
import { hashValue } from "./run-manifest";

describe("project workspace view", () => {
  it("creates an honest preview without seeded people or activity", () => {
    const view = createProjectWorkspaceView(demoWave, { previewMode: true });
    const text = JSON.stringify(view);

    expect(view.mode).toBe("preview");
    expect(view.projectName).toBe("Pilot: 6529 AMM Hook");
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
        id: "work-01",
        displayId: "WORK 01",
        href: "/work/work-01",
        title: "Define immutable fee behavior",
        reward: expect.objectContaining({ status: "Not claimable" }),
        decision: expect.objectContaining({ status: "Needs group decision" }),
        code: expect.objectContaining({ status: "Not started" }),
      }),
    );
    expect(findWorkspaceWorkItem(view, "WORK-01")).toBe(view.workItems[0]);
    expect(findWorkspaceWorkItem(view, "missing")).toBeNull();
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
    expect(view.projectName).toBe("Pilot: Public Hook Project");
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
    expect(view.workItems[0]).toEqual(
      expect.objectContaining({
        id: "cmd-001",
        displayId: "CMD-001",
        href: "/work/cmd-001",
        code: expect.objectContaining({
          status: "Not started",
          repoUrl: "https://github.com/6529/public-hook",
        }),
      }),
    );
  });

  it("binds live work evidence to the selected repository", () => {
    const repoUrl = "https://github.com/builders/hook";
    const wave = {
      ...demoWave,
      repoUrl,
      executions: demoWave.executions.map((execution) => ({
        ...execution,
        artifacts: execution.artifacts.map((artifact) => artifact.replace(demoWave.repoUrl, repoUrl)),
      })),
      reviews: demoWave.reviews.map((review) => ({
        ...review,
        proof: review.proof
          ? {
              ...review.proof,
              inputs: {
                ...review.proof.inputs,
                repositoryHash: hashValue({ owner: "builders", repo: "hook", htmlUrl: repoUrl }),
              },
            }
          : review.proof,
      })),
    };
    const item = createProjectWorkspaceView(wave, { previewMode: false }).workItems[0];

    expect(item.code).toEqual(
      expect.objectContaining({
        status: "PR recorded",
        repoUrl,
        pullRequestUrl: "https://github.com/builders/hook/pull/12",
        daemonStatus: "Signed off",
        reviewerStatus: "Proof recorded",
      }),
    );
    expect(item.decision).toEqual(
      expect.objectContaining({
        status: "Recorded",
        href: "https://6529.io/waves/6529-hook-builder/drops/drop-cmd-001-approval",
      }),
    );
    expect(item.evidence.map((entry) => entry.label)).toEqual([
      "Group decision",
      "Pull request",
      "Reviewer attestation",
    ]);
  });

  it("does not publish a mismatched discussion link as decision evidence", () => {
    const wave = {
      ...demoWave,
      polls: [
        {
          ...demoWave.polls[0],
          decision: {
            ...demoWave.polls[0].decision!,
            url: "https://6529.io/waves/other-project/drops/drop-cmd-001-approval",
          },
        },
      ],
    };
    const item = createProjectWorkspaceView(wave, { previewMode: false }).workItems[0];

    expect(item.decision).toEqual(
      expect.objectContaining({
        status: "Decision link needed",
        href: null,
      }),
    );
    expect(item.evidence.map((entry) => entry.label)).not.toContain("Group decision");
  });

  it("normalizes forbidden dash characters from runtime project content", () => {
    const forbiddenDash = String.fromCodePoint(0x2014);
    const wave = {
      ...demoWave,
      name: `Public${forbiddenDash}Hook`,
      proposals: [
        {
          ...demoWave.proposals[0],
          title: `Fee${forbiddenDash}cap tests`,
        },
      ],
      ledger: [
        {
          id: "evt-runtime-copy",
          at: "2026-07-09T20:00:00.000Z",
          actor: "daemon",
          type: "chat_observed" as const,
          message: `alice asked a question. Message: Scope${forbiddenDash}then test.`,
        },
      ],
    };
    const view = createProjectWorkspaceView(wave, { previewMode: false });

    expect(view.projectName).toBe("Pilot: Public-Hook");
    expect(view.workItems[0].title).toBe("Fee-cap tests");
    expect(view.discussion.messages[0].body).toBe("Scope-then test.");
    expect(JSON.stringify(view)).not.toContain(forbiddenDash);
  });
});
