import { describe, expect, it } from "vitest";
import {
  assertGuardianWaveStateConfigured,
  changedPathsFromEnv,
  changedPathsFromGitHubFilesPayload,
  demoWaveStateAllowed,
  hasConfiguredWaveState,
  pullRequestEvidenceFromGitHubEvent,
} from "./actions-pr-evidence";

describe("GitHub Actions PR evidence", () => {
  it("creates evidence from pull request event data", () => {
    expect(
      pullRequestEvidenceFromGitHubEvent(
        {
          pull_request: {
            body: "PR body",
            files_url: "https://api.github.com/repos/example/repo/pulls/1/files",
            number: 1,
          },
        },
        ["src/app/page.tsx"],
      ),
    ).toEqual({
      pullRequestBody: "PR body",
      changedPaths: ["src/app/page.tsx"],
    });
  });

  it("returns null for non-pull-request events", () => {
    expect(pullRequestEvidenceFromGitHubEvent({}, ["README.md"])).toBeNull();
  });

  it("normalizes changed file payloads", () => {
    expect(changedPathsFromGitHubFilesPayload([{ filename: "README.md" }, { filename: "src/app/page.tsx" }, {}])).toEqual([
      "README.md",
      "src/app/page.tsx",
    ]);
  });

  it("parses changed paths from env json or lists", () => {
    expect(changedPathsFromEnv("[\"a.ts\",\"b.ts\"]")).toEqual(["a.ts", "b.ts"]);
    expect(changedPathsFromEnv("a.ts,b.ts\nc.ts")).toEqual(["a.ts", "b.ts", "c.ts"]);
    expect(changedPathsFromEnv("[]")).toBeNull();
  });

  it("requires real wave state unless demo mode is explicit", () => {
    expect(hasConfiguredWaveState({ COMMAND_WAVE_STATE_PATH: "/tmp/wave.json" })).toBe(true);
    expect(hasConfiguredWaveState({ COMMAND_WAVE_STATE_URL: "https://example.com/wave.json" })).toBe(true);
    expect(demoWaveStateAllowed({ COMMAND_WAVE_ALLOW_DEMO_STATE: "true" })).toBe(true);

    expect(() => assertGuardianWaveStateConfigured({})).toThrow("Guardian PR checks require COMMAND_WAVE_STATE_PATH");
    expect(() => assertGuardianWaveStateConfigured({ COMMAND_WAVE_ALLOW_DEMO_STATE: "true" })).not.toThrow();
  });
});
