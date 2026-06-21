import { describe, expect, it } from "vitest";
import { commandBranchName, parseGitHubRepoUrl, pullRequestUrl } from "./repo";

describe("GitHub repo helpers", () => {
  it("parses HTTPS, SSH, and owner/repo GitHub references", () => {
    expect(parseGitHubRepoUrl("https://github.com/6529-Collections/6529CommandWaves")).toMatchObject({
      owner: "6529-Collections",
      repo: "6529CommandWaves",
      htmlUrl: "https://github.com/6529-Collections/6529CommandWaves",
    });
    expect(parseGitHubRepoUrl("git@github.com:6529-Collections/6529CommandWaves.git")).toMatchObject({
      owner: "6529-Collections",
      repo: "6529CommandWaves",
    });
    expect(parseGitHubRepoUrl("6529-Collections/6529CommandWaves")).toMatchObject({
      owner: "6529-Collections",
      repo: "6529CommandWaves",
    });
  });

  it("builds stable command branch names", () => {
    expect(commandBranchName("cmd-042", "Add a Command Waves overview!")).toBe("command/cmd-042-add-a-command-waves-overview");
  });

  it("builds pull request URLs only for valid repo refs", () => {
    expect(pullRequestUrl("https://github.com/6529-Collections/6529CommandWaves", 12)).toBe(
      "https://github.com/6529-Collections/6529CommandWaves/pull/12",
    );
    expect(pullRequestUrl("not a repo", 12)).toBeNull();
  });
});
