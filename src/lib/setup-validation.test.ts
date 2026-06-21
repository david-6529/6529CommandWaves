import { describe, expect, it } from "vitest";
import { validateSetupShape } from "./setup-validation";

describe("setup validation", () => {
  it("normalizes 6529 wave links and GitHub repo URLs", () => {
    const validation = validateSetupShape({
      waveUrl: "https://6529.io/waves/49f0e595-ec7c-4235-8695-a527f61b69f4",
      repoUrl: "https://github.com/david-6529/6529CommandWaves",
    });

    expect(validation).toMatchObject({
      waveId: "49f0e595-ec7c-4235-8695-a527f61b69f4",
      repo: {
        owner: "david-6529",
        repo: "6529CommandWaves",
        htmlUrl: "https://github.com/david-6529/6529CommandWaves",
      },
      canSave: true,
      canRunCode: true,
    });
  });

  it("accepts owner/repo shorthand", () => {
    const validation = validateSetupShape({
      waveUrl: "mock-command-wave",
      repoUrl: "david-6529/6529CommandWaves",
    });

    expect(validation.repo?.htmlUrl).toBe("https://github.com/david-6529/6529CommandWaves");
    expect(validation.canSave).toBe(true);
  });

  it("fails invalid setup values", () => {
    const validation = validateSetupShape({
      waveUrl: "",
      repoUrl: "not a repo url",
    });

    expect(validation.canSave).toBe(false);
    expect(validation.canRunCode).toBe(false);
    expect(validation.checks.map((check) => check.status)).toEqual(["fail", "fail"]);
  });
}
);
