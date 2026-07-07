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
  it("prepares a branch from the configured base branch", async () => {
    const calls: Array<{ input: string | URL; init?: RequestInit }> = [];
    const baseSha = "0123456789abcdef0123456789abcdef01234567";
    const adapter = createGitHubPullRequestAdapter({
      apiBaseUrl: "https://api.example.test",
      token: "token",
      defaultBaseBranch: "main",
      fetchImpl: async (input, init) => {
        calls.push({ input, init });

        if (String(input).endsWith("/git/ref/heads/main")) {
          return jsonResponse({
            ref: "refs/heads/main",
            object: {
              sha: baseSha,
            },
          });
        }

        return jsonResponse({
          ref: "refs/heads/command/cmd-001-draft-hook",
          object: {
            sha: baseSha,
          },
        });
      },
    });

    const result = await adapter.prepareBranch?.({
      repoUrl: "https://github.com/6529-Collections/6529-hook",
      branchName: "command/cmd-001-draft-hook",
    });

    expect(result).toEqual({
      branchName: "command/cmd-001-draft-hook",
      baseBranch: "main",
      baseSha,
      ref: "refs/heads/command/cmd-001-draft-hook",
      url: "https://github.com/6529-Collections/6529-hook/tree/command/cmd-001-draft-hook",
    });
    expect(String(calls[0]?.input)).toBe("https://api.example.test/repos/6529-Collections/6529-hook/git/ref/heads/main");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(calls[0]?.init?.body).toBeUndefined();
    expect(String(calls[1]?.input)).toBe("https://api.example.test/repos/6529-Collections/6529-hook/git/refs");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      ref: "refs/heads/command/cmd-001-draft-hook",
      sha: baseSha,
    });
  });

  it("requires a GitHub token before preparing branches", async () => {
    const adapter = createGitHubPullRequestAdapter({
      env: {},
      fetchImpl: async () => jsonResponse({}),
    });

    await expect(
      adapter.prepareBranch?.({
        repoUrl: "6529-Collections/6529-hook",
        branchName: "command/no-token",
      }),
    ).rejects.toThrow("Preparing GitHub branches requires COMMAND_WAVE_GITHUB_TOKEN or GITHUB_TOKEN.");
  });

  it("validates prepared branch requests before calling GitHub", async () => {
    let called = false;
    const adapter = createGitHubPullRequestAdapter({
      token: "token",
      fetchImpl: async () => {
        called = true;

        return jsonResponse({});
      },
    });

    await expect(
      adapter.prepareBranch?.({
        repoUrl: "6529-Collections/6529-hook",
        branchName: "refs/heads/command/bad",
      }),
    ).rejects.toThrow("Head branch must be a prepared branch name in the target repo.");

    await expect(
      adapter.prepareBranch?.({
        repoUrl: "6529-Collections/6529-hook",
        branchName: "main",
        baseBranch: "main",
      }),
    ).rejects.toThrow("Head branch must differ from base branch.");
    expect(called).toBe(false);
  });

  it("surfaces GitHub branch preparation API failures", async () => {
    const adapter = createGitHubPullRequestAdapter({
      token: "token",
      fetchImpl: async () => new Response("missing base", { status: 404, statusText: "Not Found" }),
    });

    await expect(
      adapter.prepareBranch?.({
        repoUrl: "6529-Collections/6529-hook",
        branchName: "command/missing-base",
      }),
    ).rejects.toThrow("GitHub base branch lookup failed: 404 Not Found - missing base");
  });

  it("rejects malformed base branch responses", async () => {
    const adapter = createGitHubPullRequestAdapter({
      token: "token",
      fetchImpl: async () =>
        jsonResponse({
          object: {
            sha: "abc123",
          },
        }),
    });

    await expect(
      adapter.prepareBranch?.({
        repoUrl: "6529-Collections/6529-hook",
        branchName: "command/bad-base-response",
      }),
    ).rejects.toThrow("GitHub base branch response did not include a full 40-character SHA.");
  });

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

  it("posts a bounded comment to an existing pull request", async () => {
    const calls: Array<{ input: string | URL; init?: RequestInit }> = [];
    const adapter = createGitHubPullRequestAdapter({
      apiBaseUrl: "https://api.example.test",
      token: "token",
      fetchImpl: async (input, init) => {
        calls.push({ input, init });

        return jsonResponse({
          id: 101,
          html_url: "https://github.com/6529-Collections/6529-hook/pull/42#issuecomment-101",
        });
      },
    });

    const result = await adapter.commentOnPullRequest?.({
      repoUrl: "https://github.com/6529-Collections/6529-hook",
      prNumber: 42,
      body: "Guardian review passed. Attestation hash: abc123.",
    });

    expect(result).toEqual({
      id: 101,
      url: "https://github.com/6529-Collections/6529-hook/pull/42#issuecomment-101",
    });
    expect(String(calls[0]?.input)).toBe("https://api.example.test/repos/6529-Collections/6529-hook/issues/42/comments");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.headers).toMatchObject({
      authorization: "Bearer token",
      "content-type": "application/json",
    });
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      body: "Guardian review passed. Attestation hash: abc123.",
    });
  });

  it("requires a GitHub token before posting pull request comments", async () => {
    const adapter = createGitHubPullRequestAdapter({
      env: {},
      fetchImpl: async () => jsonResponse({}),
    });

    await expect(
      adapter.commentOnPullRequest?.({
        repoUrl: "6529-Collections/6529-hook",
        prNumber: 42,
        body: "Review note.",
      }),
    ).rejects.toThrow("Posting GitHub PR comments requires COMMAND_WAVE_GITHUB_TOKEN or GITHUB_TOKEN.");
  });

  it("validates pull request comment inputs before calling GitHub", async () => {
    let called = false;
    const adapter = createGitHubPullRequestAdapter({
      token: "token",
      fetchImpl: async () => {
        called = true;

        return jsonResponse({});
      },
    });

    await expect(
      adapter.commentOnPullRequest?.({
        repoUrl: "6529-Collections/6529-hook",
        prNumber: 0,
        body: "Review note.",
      }),
    ).rejects.toThrow("Pull request number must be a positive integer.");

    await expect(
      adapter.commentOnPullRequest?.({
        repoUrl: "6529-Collections/6529-hook",
        prNumber: 42,
        body: " ",
      }),
    ).rejects.toThrow("Pull request comment body is required.");

    await expect(
      adapter.commentOnPullRequest?.({
        repoUrl: "6529-Collections/6529-hook",
        prNumber: 42,
        body: "x".repeat(65_537),
      }),
    ).rejects.toThrow("Pull request comment body must be 65536 characters or less.");
    expect(called).toBe(false);
  });

  it("surfaces GitHub PR comment API failures", async () => {
    const adapter = createGitHubPullRequestAdapter({
      token: "token",
      fetchImpl: async () => new Response("bad comment", { status: 403, statusText: "Forbidden" }),
    });

    await expect(
      adapter.commentOnPullRequest?.({
        repoUrl: "6529-Collections/6529-hook",
        prNumber: 42,
        body: "Review note.",
      }),
    ).rejects.toThrow("GitHub PR comment failed: 403 Forbidden - bad comment");
  });

  it("creates a completed GitHub check run", async () => {
    const calls: Array<{ input: string | URL; init?: RequestInit }> = [];
    const adapter = createGitHubPullRequestAdapter({
      apiBaseUrl: "https://api.example.test",
      token: "token",
      fetchImpl: async (input, init) => {
        calls.push({ input, init });

        return jsonResponse({
          id: 202,
          html_url: "https://github.com/6529-Collections/6529-hook/runs/202",
          status: "completed",
          conclusion: "success",
        });
      },
    });

    const result = await adapter.createCheckRun?.({
      repoUrl: "https://github.com/6529-Collections/6529-hook",
      name: "Command Waves Guardian",
      headSha: "0123456789abcdef0123456789abcdef01234567",
      status: "completed",
      conclusion: "success",
      summary: "Guardian review passed. Attestation hash: abc123.",
      detailsUrl: "https://command-waves.example.com/proof",
      externalId: "guardian:cmd-001",
    });

    expect(result).toEqual({
      id: 202,
      url: "https://github.com/6529-Collections/6529-hook/runs/202",
      status: "completed",
      conclusion: "success",
    });
    expect(String(calls[0]?.input)).toBe("https://api.example.test/repos/6529-Collections/6529-hook/check-runs");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      name: "Command Waves Guardian",
      head_sha: "0123456789abcdef0123456789abcdef01234567",
      status: "completed",
      conclusion: "success",
      details_url: "https://command-waves.example.com/proof",
      external_id: "guardian:cmd-001",
      output: {
        title: "Command Waves Guardian",
        summary: "Guardian review passed. Attestation hash: abc123.",
      },
    });
  });

  it("requires a GitHub token before creating check runs", async () => {
    const adapter = createGitHubPullRequestAdapter({
      env: {},
      fetchImpl: async () => jsonResponse({}),
    });

    await expect(
      adapter.createCheckRun?.({
        repoUrl: "6529-Collections/6529-hook",
        name: "Command Waves Guardian",
        headSha: "0123456789abcdef0123456789abcdef01234567",
        status: "completed",
        conclusion: "success",
        summary: "Guardian review passed.",
      }),
    ).rejects.toThrow("Creating GitHub check runs requires COMMAND_WAVE_GITHUB_TOKEN or GITHUB_TOKEN.");
  });

  it("validates check run inputs before calling GitHub", async () => {
    let called = false;
    const adapter = createGitHubPullRequestAdapter({
      token: "token",
      fetchImpl: async () => {
        called = true;

        return jsonResponse({});
      },
    });

    await expect(
      adapter.createCheckRun?.({
        repoUrl: "6529-Collections/6529-hook",
        name: "",
        headSha: "0123456789abcdef0123456789abcdef01234567",
        status: "completed",
        conclusion: "success",
        summary: "Guardian review passed.",
      }),
    ).rejects.toThrow("GitHub check run name is required.");

    await expect(
      adapter.createCheckRun?.({
        repoUrl: "6529-Collections/6529-hook",
        name: "Command Waves Guardian",
        headSha: "abc123",
        status: "completed",
        conclusion: "success",
        summary: "Guardian review passed.",
      }),
    ).rejects.toThrow("GitHub check run head SHA must be a full 40-character SHA.");

    await expect(
      adapter.createCheckRun?.({
        repoUrl: "6529-Collections/6529-hook",
        name: "Command Waves Guardian",
        headSha: "0123456789abcdef0123456789abcdef01234567",
        status: "in_progress",
        conclusion: "success",
        summary: "Guardian review passed.",
      }),
    ).rejects.toThrow("GitHub check run conclusion requires completed status.");

    await expect(
      adapter.createCheckRun?.({
        repoUrl: "6529-Collections/6529-hook",
        name: "Command Waves Guardian",
        headSha: "0123456789abcdef0123456789abcdef01234567",
        status: "completed",
        summary: "Guardian review passed.",
      }),
    ).rejects.toThrow("Completed GitHub check runs require a conclusion.");

    await expect(
      adapter.createCheckRun?.({
        repoUrl: "6529-Collections/6529-hook",
        name: "Command Waves Guardian",
        headSha: "0123456789abcdef0123456789abcdef01234567",
        status: "completed",
        conclusion: "success",
        summary: " ",
      }),
    ).rejects.toThrow("GitHub check run summary is required.");
    expect(called).toBe(false);
  });

  it("surfaces GitHub check run API failures", async () => {
    const adapter = createGitHubPullRequestAdapter({
      token: "token",
      fetchImpl: async () => new Response("bad check", { status: 422, statusText: "Unprocessable Entity" }),
    });

    await expect(
      adapter.createCheckRun?.({
        repoUrl: "6529-Collections/6529-hook",
        name: "Command Waves Guardian",
        headSha: "0123456789abcdef0123456789abcdef01234567",
        status: "completed",
        conclusion: "failure",
        summary: "Guardian review failed.",
      }),
    ).rejects.toThrow("GitHub check run failed: 422 Unprocessable Entity - bad check");
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
