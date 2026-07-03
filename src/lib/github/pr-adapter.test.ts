import { describe, expect, it } from "vitest";
import { createGitHubPullRequestAdapter } from "./pr-adapter";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
    ...init,
  });
}

describe("GitHub pull request adapter", () => {
  it("opens a draft pull request from a prepared branch", async () => {
    const calls: Array<{ input: string | URL; init?: RequestInit }> = [];
    const adapter = createGitHubPullRequestAdapter({
      apiBaseUrl: "https://api.example.test",
      token: "token",
      defaultBaseBranch: "main",
      fetchImpl: async (input, init) => {
        calls.push({ input, init });

        return jsonResponse({
          number: 42,
          html_url: "https://github.com/6529-Collections/6529-hook/pull/42",
          head: {
            sha: "abc123",
          },
        });
      },
    });

    const result = await adapter.openPullRequest({
      repoUrl: "https://github.com/6529-Collections/6529-hook",
      title: "Draft the hook scaffold",
      body: "Command Waves manifest here.",
      branchName: "command/cmd-001-draft-hook",
    });

    expect(result).toEqual({
      prNumber: 42,
      url: "https://github.com/6529-Collections/6529-hook/pull/42",
      headSha: "abc123",
    });
    expect(String(calls[0]?.input)).toBe("https://api.example.test/repos/6529-Collections/6529-hook/pulls");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.headers).toMatchObject({
      authorization: "Bearer token",
      "content-type": "application/json",
    });
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      title: "Draft the hook scaffold",
      body: "Command Waves manifest here.",
      head: "command/cmd-001-draft-hook",
      base: "main",
      draft: true,
      maintainer_can_modify: false,
    });
  });

  it("requires a GitHub token before opening pull requests", async () => {
    const adapter = createGitHubPullRequestAdapter({
      env: {},
      fetchImpl: async () => jsonResponse({}),
    });

    await expect(
      adapter.openPullRequest({
        repoUrl: "6529-Collections/6529-hook",
        title: "No token",
        body: "No token",
        branchName: "command/no-token",
      }),
    ).rejects.toThrow("Opening GitHub PRs requires COMMAND_WAVE_GITHUB_TOKEN or GITHUB_TOKEN.");
  });

  it("rejects non-draft pull request requests in phase 1", async () => {
    let called = false;
    const adapter = createGitHubPullRequestAdapter({
      token: "token",
      fetchImpl: async () => {
        called = true;

        return jsonResponse({});
      },
    });

    await expect(
      adapter.openPullRequest({
        repoUrl: "6529-Collections/6529-hook",
        title: "Ready PR",
        body: "Command Waves manifest here.",
        branchName: "command/ready-pr",
        draft: false,
      }),
    ).rejects.toThrow("GitHub PR adapter only opens draft PRs in phase 1.");
    expect(called).toBe(false);
  });

  it("requires prepared branch names in the target repo", async () => {
    let called = false;
    const adapter = createGitHubPullRequestAdapter({
      token: "token",
      fetchImpl: async () => {
        called = true;

        return jsonResponse({});
      },
    });

    await expect(
      adapter.openPullRequest({
        repoUrl: "6529-Collections/6529-hook",
        title: "Fork branch",
        body: "Command Waves manifest here.",
        branchName: "other-owner:command/fork-branch",
      }),
    ).rejects.toThrow("Head branch must be a prepared branch name in the target repo.");

    await expect(
      adapter.openPullRequest({
        repoUrl: "6529-Collections/6529-hook",
        title: "Raw SHA",
        body: "Command Waves manifest here.",
        branchName: "0123456789abcdef0123456789abcdef01234567",
      }),
    ).rejects.toThrow("Head branch must be a prepared branch name in the target repo.");
    expect(called).toBe(false);
  });

  it("validates configured base branch names", async () => {
    let called = false;
    const adapter = createGitHubPullRequestAdapter({
      token: "token",
      defaultBaseBranch: "refs/heads/main",
      fetchImpl: async () => {
        called = true;

        return jsonResponse({});
      },
    });

    await expect(
      adapter.openPullRequest({
        repoUrl: "6529-Collections/6529-hook",
        title: "Bad base",
        body: "Command Waves manifest here.",
        branchName: "command/good-branch",
      }),
    ).rejects.toThrow("Base branch must be a prepared branch name in the target repo.");
    expect(called).toBe(false);
  });

  it("surfaces GitHub API failures", async () => {
    const adapter = createGitHubPullRequestAdapter({
      token: "token",
      fetchImpl: async () => new Response("bad head branch", { status: 422, statusText: "Unprocessable Entity" }),
    });

    await expect(
      adapter.openPullRequest({
        repoUrl: "6529-Collections/6529-hook",
        title: "Bad branch",
        body: "Bad branch",
        branchName: "missing-branch",
      }),
    ).rejects.toThrow("GitHub PR creation failed: 422 Unprocessable Entity - bad head branch");
  });

  it("rejects invalid GitHub PR creation JSON", async () => {
    const adapter = createGitHubPullRequestAdapter({
      token: "token",
      fetchImpl: async () => new Response("not json"),
    });

    await expect(
      adapter.openPullRequest({
        repoUrl: "6529-Collections/6529-hook",
        title: "Bad JSON",
        body: "Bad JSON",
        branchName: "command/bad-json",
      }),
    ).rejects.toThrow("GitHub PR creation response must be valid JSON.");
  });

  it("bounds GitHub PR creation response bodies", async () => {
    const adapter = createGitHubPullRequestAdapter({
      token: "token",
      fetchImpl: async () =>
        new Response("x".repeat(1_000_001), {
          headers: {
            "content-length": "1000001",
          },
        }),
    });

    await expect(
      adapter.openPullRequest({
        repoUrl: "6529-Collections/6529-hook",
        title: "Large response",
        body: "Large response",
        branchName: "command/large-response",
      }),
    ).rejects.toThrow("Response body from https://api.github.com/repos/6529-Collections/6529-hook/pulls must be 1000000 bytes or less.");
  });
});
