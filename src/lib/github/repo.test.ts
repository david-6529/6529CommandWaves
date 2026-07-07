import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  commandBranchName,
  getGitHubRepoRequiredFiles,
  getGitHubRepoRequiredStatusChecks,
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

const validGuardianWorkflow = [
  "name: Command Waves Guardian",
  "run: npm run guardian:pr-check",
  "run: npm run guardian:verify-proof",
].join("\n");

describe("GitHub repo helpers", () => {
  it("keeps the local PR template launch-ready", () => {
    const template = readFileSync(".github/PULL_REQUEST_TEMPLATE.md", "utf8");
    const workflow = readFileSync(".github/workflows/guardian-review.yml", "utf8");

    expect(template).toContain("Decision link URL:");
    expect(template).toContain("Command Waves review request copied from the app:");
    expect(template).toContain("Launch packet or status link:");
    expect(template).toContain("<!-- command-waves:manifest:start -->");
    expect(template).toContain("<!-- command-waves:manifest:end -->");
    expect(template).not.toContain("\u2014");
    expect(workflow).toContain("name: Command Waves Guardian");
    expect(workflow).toContain("npm run guardian:pr-check");
    expect(workflow).toContain("npm run guardian:verify-proof");
    expect(workflow).not.toContain("\u2014");
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

        if (url.includes("guardian-review.yml")) {
          return response(validGuardianWorkflow);
        }

        return response("{}");
      },
    });

    expect(calls).toEqual([
      "https://api.example.test/repos/6529-Collections/6529-hook/contents/CONTRIBUTING.md?ref=main",
      "https://api.example.test/repos/6529-Collections/6529-hook/contents/.github/PULL_REQUEST_TEMPLATE.md?ref=main",
      "https://api.example.test/repos/6529-Collections/6529-hook/contents/.github/workflows/guardian-review.yml?ref=main",
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
      expect.objectContaining({
        path: ".github/workflows/guardian-review.yml",
        label: "Guardian workflow",
        exists: true,
        valid: true,
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

  it("validates guardian workflow commands", async () => {
    const files = await getGitHubRepoRequiredFiles("6529-Collections/6529-hook", {
      apiBaseUrl: "https://api.example.test",
      fetchImpl: async (input) => {
        const url = String(input);

        if (url.includes("guardian-review.yml")) {
          return response("name: Other workflow");
        }

        return response("{}");
      },
    });

    expect(files.find((file) => file.path === ".github/workflows/guardian-review.yml")).toMatchObject({
      exists: true,
      valid: false,
      message: ".github/workflows/guardian-review.yml is missing the guardian check or proof replay commands.",
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

  it("reads required guardian checks from rulesets and branch rules", async () => {
    const calls: string[] = [];
    const requiredChecks = await getGitHubRepoRequiredStatusChecks("6529-Collections/6529-hook", {
      apiBaseUrl: "https://api.example.test",
      ref: "main",
      fetchImpl: async (input) => {
        const url = String(input);

        calls.push(url);

        if (url.endsWith("/rulesets")) {
          return response(JSON.stringify([
            {
              type: "required_status_checks",
              parameters: {
                required_status_checks: [{ context: "Command Waves Guardian" }],
              },
            },
          ]));
        }

        return response(JSON.stringify({
          required_status_checks: {
            contexts: ["build"],
          },
        }));
      },
    });

    expect(calls).toEqual([
      "https://api.example.test/repos/6529-Collections/6529-hook/rulesets",
      "https://api.example.test/repos/6529-Collections/6529-hook/rules/branches/main",
    ]);
    expect(requiredChecks).toEqual(["build", "Command Waves Guardian"]);
  });

  it("allows missing branch rules when rulesets can be read", async () => {
    const requiredChecks = await getGitHubRepoRequiredStatusChecks("6529-Collections/6529-hook", {
      apiBaseUrl: "https://api.example.test",
      fetchImpl: async (input) => {
        const url = String(input);

        if (url.endsWith("/rulesets")) {
          return response(JSON.stringify([]));
        }

        return response("not found", { status: 404, statusText: "Not Found" });
      },
    });

    expect(requiredChecks).toEqual([]);
  });
});
