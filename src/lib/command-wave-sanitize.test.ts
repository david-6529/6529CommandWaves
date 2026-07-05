import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { withPlaceholderRepoSetupState } from "./command-wave-sanitize";

describe("command wave sanitizer", () => {
  it("removes seeded PR records when the built-in hook repo is a placeholder", () => {
    const wave = withPlaceholderRepoSetupState(demoWave);

    expect(wave.repoUrl).toBe("https://github.com/your-org/your-hook-repo");
    expect(wave.proposals[0]).toMatchObject({
      id: "cmd-001",
      status: "approved",
    });
    expect(wave.executions).toEqual([]);
    expect(wave.reviews).toEqual([]);
    expect(wave.ledger.map((event) => event.type)).not.toContain("execution_logged");
    expect(wave.ledger.map((event) => event.type)).not.toContain("guardian_reviewed");
    expect(JSON.stringify(wave)).not.toContain("\u2014");
  });

  it("keeps configured repos untouched", () => {
    const configuredWave = {
      ...demoWave,
      repoUrl: "https://github.com/6529-Collections/6529-hook",
    };

    expect(withPlaceholderRepoSetupState(configuredWave)).toBe(configuredWave);
  });
});
