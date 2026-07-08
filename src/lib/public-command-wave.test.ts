import { describe, expect, it } from "vitest";
import { githubRepoPlaceholder } from "./agent-identities";
import { demoWave } from "./demo-wave";
import { createPublicCommandWave, createPublicCommandWaveSource } from "./public-command-wave";

describe("public command wave", () => {
  it("strips repo-bound evidence while the repo is a placeholder", () => {
    const sourceWave = createPublicCommandWaveSource(demoWave);
    const publicWave = createPublicCommandWave(demoWave);

    expect(sourceWave.repoUrl).toBe(githubRepoPlaceholder.url);
    expect(sourceWave.executions).toEqual([]);
    expect(sourceWave.reviews).toEqual([]);
    expect(sourceWave.ledger.map((event) => event.type)).not.toContain("execution_logged");
    expect(sourceWave.ledger.map((event) => event.type)).not.toContain("guardian_reviewed");
    expect(publicWave.repoUrl).toBeNull();
  });

  it("keeps configured repo evidence available for the PR loop", () => {
    const configuredWave = {
      ...demoWave,
      repoUrl: "https://github.com/builders/hook",
    };

    expect(createPublicCommandWaveSource(configuredWave).executions).toHaveLength(demoWave.executions.length);
    expect(createPublicCommandWave(configuredWave).repoUrl).toBe("https://github.com/builders/hook");
  });
});
