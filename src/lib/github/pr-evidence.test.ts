import { describe, expect, it } from "vitest";
import {
  configuredGitHubRepo,
  gitHubPullRequestUrlsForRepo,
  isGitHubPullRequestUrlForRepo,
} from "./pr-evidence";

describe("GitHub PR evidence", () => {
  it("accepts PR links only for a configured repo", () => {
    expect(configuredGitHubRepo("https://github.com/builders/hook")).toMatchObject({
      owner: "builders",
      repo: "hook",
    });
    expect(isGitHubPullRequestUrlForRepo("https://github.com/builders/hook/pull/12", "https://github.com/builders/hook")).toBe(
      true,
    );
    expect(isGitHubPullRequestUrlForRepo("https://github.com/other/hook/pull/12", "https://github.com/builders/hook")).toBe(
      false,
    );
    expect(
      isGitHubPullRequestUrlForRepo("https://github.com/your-org/your-hook-repo/pull/12", "https://github.com/your-org/your-hook-repo"),
    ).toBe(false);
  });

  it("filters artifact lists to PR links for the configured repo", () => {
    expect(
      gitHubPullRequestUrlsForRepo(
        [
          "run-manifest:abc",
          "https://github.com/builders/hook/pull/12",
          "https://github.com/other/hook/pull/13",
        ],
        "builders/hook",
      ),
    ).toEqual(["https://github.com/builders/hook/pull/12"]);
  });
});
