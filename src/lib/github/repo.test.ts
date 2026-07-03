import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  commandBranchName,
  getGitHubRepoRequiredFiles,
  parseGitHubRepoUrl,
  pullRequestUrl,
} from "./repo";

function response(body: string, init: ResponseInit = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
    ...init,
  });
}

describe("GitHub repo helpers", () => {
  it("keeps the local PR template launch-ready", () => {
    const template = readFileSync(".github/PULL_REQUEST_TEMPLATE.md", "utf8");

    expect(template).toContain("Decision receipt URL:");
    expect(template).toContain("Command Waves review request copied from the app:");
    expect(template).toContain("Launch packet or status link:");
    expect(template).toContain("<!-- command-waves:manifest:start -->");
    expect(template).toContain("<!-- command-waves:manifest:end -->");
    expect(template).not.toContain("\u2014");
  });

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

  it("rejects oversized or malformed GitHub references", () => {
    expect(parseGitHubRepoUrl(`${"a".repeat(101)}/repo`)).toBeNull();
    expect(parseGitHubRepoUrl(`owner/${"r".repeat(101)}`)).toBeNull();
    expect(parseGitHubRepoUrl("bad_owner/repo")).toBeNull();
    expect(parseGitHubRepoUrl("owner/repo name")).toBeNull();
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

  it("checks required hook repo files on the default branch", async () => {
    const calls: string[] = [];
    const files = await getGitHubRepoRequiredFiles("6529-Collections/6529-hook", {
      apiBaseUrl: "https://api.example.test",
      ref: "main",
      fetchImpl: async (input) => {
        const url = String(input);

        calls.push(url);

        if (url.includes("PULL_REQUEST_TEMPLATE.md")) {
          return response("not found", { status: 404, statusText: "Not Found" });
        }

        return response("{}");
      },
    });

    expect(calls).toEqual([
      "https://api.example.test/repos/6529-Collections/6529-hook/contents/CONTRIBUTING.md?ref=main",
      "https://api.example.test/repos/6529-Collections/6529-hook/contents/.github/PULL_REQUEST_TEMPLATE.md?ref=main",
    ]);
    expect(files).toEqual([
      expect.objectContaining({
        path: "CONTRIBUTING.md",
        label: "Contributor rules",
        exists: true,
        valid: true,
      }),
      expect.objectContaining({
        path: ".github/PULL_REQUEST_TEMPLATE.md",
        label: "PR template",
        exists: false,
        valid: false,
      }),
    ]);
  });

  it("validates PR template manifest markers", async () => {
    const files = await getGitHubRepoRequiredFiles("6529-Collections/6529-hook", {
      apiBaseUrl: "https://api.example.test",
      fetchImpl: async (input) => {
        const url = String(input);

        if (url.includes("PULL_REQUEST_TEMPLATE.md")) {
          return response("## Missing manifest markers");
        }

        return response("{}");
      },
    });

    expect(files.find((file) => file.path === ".github/PULL_REQUEST_TEMPLATE.md")).toMatchObject({
      exists: true,
      valid: false,
      message: ".github/PULL_REQUEST_TEMPLATE.md is missing Command Waves manifest markers.",
    });
  });

  it("accepts PR template manifest markers from GitHub content payloads", async () => {
    const template = [
      "## Command Waves Manifest",
      "<!-- command-waves:manifest:start -->",
      "{}",
      "<!-- command-waves:manifest:end -->",
    ].join("\n");
    const files = await getGitHubRepoRequiredFiles("6529-Collections/6529-hook", {
      apiBaseUrl: "https://api.example.test",
      fetchImpl: async (input) => {
        const url = String(input);

        if (url.includes("PULL_REQUEST_TEMPLATE.md")) {
          return response(JSON.stringify({ content: btoa(template), encoding: "base64" }));
        }

        return response("{}");
      },
    });

    expect(files.find((file) => file.path === ".github/PULL_REQUEST_TEMPLATE.md")).toMatchObject({
      exists: true,
      valid: true,
      message: "Found .github/PULL_REQUEST_TEMPLATE.md with Command Waves manifest markers.",
    });
  });
});
