import { describe, expect, it } from "vitest";
import { getConfiguredRepoAdapter, repoAdapterModeFromEnv } from "./configured-adapters";
import { localRepoAdapter } from "./local-adapters";

describe("configured adapters", () => {
  it("uses local repo mode by default", () => {
    expect(repoAdapterModeFromEnv({})).toBe("local");
    expect(getConfiguredRepoAdapter({})).toBe(localRepoAdapter);
  });

  it("uses GitHub repo mode only when explicitly configured", () => {
    expect(repoAdapterModeFromEnv({ COMMAND_WAVE_REPO_ADAPTER: "github" })).toBe("github");
    expect(getConfiguredRepoAdapter({ COMMAND_WAVE_REPO_ADAPTER: "github" })).not.toBe(localRepoAdapter);
  });
});
