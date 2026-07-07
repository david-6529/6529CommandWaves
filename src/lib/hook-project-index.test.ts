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
          name: "Hook Build",
          waveLabel: "6529-hook-builder",
          repoLabel: "GitHub repo placeholder",
          nextActionTitle: "Select the repo",
        },
      ],
    });
    expect(projectsHash).toMatch(/^[a-f0-9]{64}$/);
    expect(projectsHash).toBe(hashValue(hookProjectIndexHashInput(indexWithoutHash)));
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
