import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createActiveHookProjects } from "./hook-projects";

describe("active hook projects", () => {
  it("lists the 6529 hook with its builder wave and repo", () => {
    const projects = createActiveHookProjects(demoWave);

    expect(projects).toEqual([
      expect.objectContaining({
        id: demoWave.id,
        name: "6529 Hook",
        status: "active",
        waveUrl: demoWave.waveUrl,
        repoUrl: demoWave.repoUrl,
        currentFocus: demoWave.proposals[0].title,
        participation: "Anyone can propose PR-sized hook work through the builder wave.",
      }),
    ]);
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
      currentFocus: "Choose the first PR-sized hook command.",
    });
  });

  it("does not emit U+2014 characters", () => {
    expect(JSON.stringify(createActiveHookProjects(demoWave))).not.toContain("\u2014");
  });
});
