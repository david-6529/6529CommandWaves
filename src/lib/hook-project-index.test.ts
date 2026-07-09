import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createHookProjectIndex, hookProjectIndexHashInput } from "./hook-project-index";
import { hashValue } from "./run-manifest";

describe("hook project index", () => {
  it("publishes a hashed active project list", () => {
    const index = createHookProjectIndex(demoWave, {
      generatedAt: "2026-06-21T12:00:00.000Z",
    });
    const { projectsHash, ...indexWithoutHash } = index;

    expect(index).toMatchObject({
      version: "command-wave-projects-v0.1",
      generatedAt: "2026-06-21T12:00:00.000Z",
      activeProjectId: demoWave.id,
      projectCount: 1,
      projects: [
        {
          id: demoWave.id,
          name: "6529 AMM hook",
          waveLabel: "6529-hook-builder",
          repoUrl: null,
          repoLabel: "GitHub repo placeholder",
          nextActionTitle: "Repo not selected yet",
          managedBy: {
            summary: "daemon",
            changelog: "daemon",
            pullRequests: "daemon",
            reviewer: "review-agent",
          },
          currentVote: {
            status: "recorded",
            title: "No open vote",
            proposalId: "cmd-001",
            yesVotes: 5,
            noVotes: 1,
          },
          discussionTopics: expect.arrayContaining([
            expect.objectContaining({
              title: "Draft hook scaffold",
            }),
            expect.objectContaining({
              title: "Select the pilot GitHub repo",
            }),
          ]),
          chatSections: expect.arrayContaining([
            expect.objectContaining({
              id: "general",
              label: "General",
            }),
            expect.objectContaining({
              id: "build",
              label: "Build",
            }),
            expect.objectContaining({
              id: "review",
              label: "Review",
            }),
          ]),
          pullRequests: [],
          rules: expect.arrayContaining([
            expect.objectContaining({
              question: "How are PRs approved?",
              answer: "Builders record a project decision before PR work starts. Reviewer status is shown on each PR.",
            }),
          ]),
          memberCount: 6,
          members: expect.arrayContaining([
            expect.objectContaining({
              identity: "david",
              voteSummary: "yes on cmd-001",
            }),
          ]),
        },
      ],
    });
    expect(projectsHash).toMatch(/^[a-f0-9]{64}$/);
    expect(projectsHash).toBe(hashValue(hookProjectIndexHashInput(indexWithoutHash)));
    expect(JSON.stringify(index.projects)).toContain("accessDetails");
    expect(JSON.stringify(index.projects)).toContain("accessSnapshotLabel");
    expect(JSON.stringify(index.projects)).toContain("currentVote");
    expect(JSON.stringify(index.projects)).toContain("discussionTopics");
    expect(JSON.stringify(index.projects)).toContain("chatSections");
    expect(JSON.stringify(index.projects)).toContain("pullRequests");
    expect(JSON.stringify(index.projects)).toContain("managedBy");
    expect(JSON.stringify(index.projects)).toContain("rules");
    expect(JSON.stringify(index.projects)).toContain("How are PRs approved?");
    expect(JSON.stringify(index.projects)).toContain("members");
    expect(JSON.stringify(index.projects)).toContain("voteSummary");
    expect(JSON.stringify(index.projects)).not.toContain("gateDetails");
    expect(JSON.stringify(index.projects)).not.toContain("gateSnapshotLabel");
    expect(JSON.stringify(index)).not.toContain("\u2014");
  });

  it("keeps the project hash stable across generation times", () => {
    const first = createHookProjectIndex(demoWave, {
      generatedAt: "2026-06-21T12:00:00.000Z",
    });
    const second = createHookProjectIndex(demoWave, {
      generatedAt: "2026-06-21T12:01:00.000Z",
    });

    expect(first.generatedAt).not.toBe(second.generatedAt);
    expect(first.projectsHash).toBe(second.projectsHash);
  });
});
