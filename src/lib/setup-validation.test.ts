import { describe, expect, it } from "vitest";
import { setupValidationNotice, validateCommandWaveSetup, validateSetupShape } from "./setup-validation";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
    ...init,
  });
}

describe("setup validation", () => {
  it("normalizes 6529 wave links and GitHub repo URLs", () => {
    const validation = validateSetupShape({
      waveUrl: "https://6529.io/waves/49f0e595-ec7c-4235-8695-a527f61b69f4",
      repoUrl: "https://github.com/david-6529/6529CommandWaves",
    });

    expect(validation).toMatchObject({
      waveId: "49f0e595-ec7c-4235-8695-a527f61b69f4",
      repo: {
        owner: "david-6529",
        repo: "6529CommandWaves",
        htmlUrl: "https://github.com/david-6529/6529CommandWaves",
      },
      canSave: true,
      canRunCode: true,
    });
    expect(setupValidationNotice(validation)).toBe("Setup check passed.");
  });

  it("accepts owner/repo shorthand", () => {
    const validation = validateSetupShape({
      waveUrl: "mock-command-wave",
      repoUrl: "david-6529/6529CommandWaves",
    });

    expect(validation.repo?.htmlUrl).toBe("https://github.com/david-6529/6529CommandWaves");
    expect(validation.canSave).toBe(true);
  });

  it("fails GitHub repo placeholders before PR work can run", () => {
    const validation = validateSetupShape({
      waveUrl: "mock-command-wave",
      repoUrl: "https://github.com/your-org/your-hook-repo",
    });

    expect(validation.canSave).toBe(false);
    expect(validation.canRunCode).toBe(false);
    expect(validation.checks).toContainEqual({
      id: "repo_placeholder",
      label: "GitHub repo placeholder",
      status: "fail",
      message: "Replace the GitHub repo placeholder before saving setup or running PR work.",
    });
  });

  it("fails invalid setup values", () => {
    const validation = validateSetupShape({
      waveUrl: "",
      repoUrl: "not a repo url",
    });

    expect(validation.canSave).toBe(false);
    expect(validation.canRunCode).toBe(false);
    expect(validation.checks.map((check) => check.status)).toEqual(["fail", "fail"]);
    expect(setupValidationNotice(validation)).toBe("Setup needs fixes before saving.");
  });

  it("warns when required launch repo files are missing", async () => {
    const validation = await validateCommandWaveSetup(
      {
        waveUrl: "mock-command-wave",
        repoUrl: "6529-Collections/6529-hook",
      },
      {
        checkRepoRemote: true,
        githubApi: {
          apiBaseUrl: "https://api.example.test",
          fetchImpl: async (input) => {
            const url = String(input);

            if (url.endsWith("/repos/6529-Collections/6529-hook")) {
              return jsonResponse({
                default_branch: "main",
                private: false,
                archived: false,
              });
            }

            if (url.includes("PULL_REQUEST_TEMPLATE.md")) {
              return new Response("not found", { status: 404, statusText: "Not Found" });
            }

            if (url.endsWith("/rulesets")) {
              return jsonResponse([
                {
                  type: "required_status_checks",
                  parameters: {
                    required_status_checks: [{ context: "Command Waves Guardian" }],
                  },
                },
              ]);
            }

            return jsonResponse({});
          },
        },
      },
    );

    expect(validation.canSave).toBe(true);
    expect(validation.canRunCode).toBe(true);
    expect(validation.repoRequiredFiles.map((file) => [file.path, file.exists, file.valid])).toEqual([
      ["CONTRIBUTING.md", true, true],
      [".github/PULL_REQUEST_TEMPLATE.md", false, false],
    ]);
    expect(validation.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "repo_file_contributing_md",
          label: "Contributor rules",
          status: "pass",
        }),
        expect.objectContaining({
          id: "repo_file_github_pull_request_template_md",
          label: "PR template",
          status: "warn",
          message: "Missing .github/PULL_REQUEST_TEMPLATE.md. Fix it before inviting contributors.",
        }),
      ]),
    );
    expect(setupValidationNotice(validation)).toBe("Setup check found 1 launch warning.");
  });

  it("warns when the PR template lacks Command Waves manifest markers", async () => {
    const validation = await validateCommandWaveSetup(
      {
        waveUrl: "mock-command-wave",
        repoUrl: "6529-Collections/6529-hook",
      },
      {
        checkRepoRemote: true,
        githubApi: {
          apiBaseUrl: "https://api.example.test",
          fetchImpl: async (input) => {
            const url = String(input);

            if (url.endsWith("/repos/6529-Collections/6529-hook")) {
              return jsonResponse({
                default_branch: "main",
                private: false,
                archived: false,
              });
            }

            if (url.includes("PULL_REQUEST_TEMPLATE.md")) {
              return new Response("## Hook PR", { status: 200 });
            }

            if (url.endsWith("/rulesets")) {
              return jsonResponse([
                {
                  type: "required_status_checks",
                  parameters: {
                    required_status_checks: [{ context: "Command Waves Guardian" }],
                  },
                },
              ]);
            }

            return jsonResponse({});
          },
        },
      },
    );

    expect(validation.repoRequiredFiles.find((file) => file.path === ".github/PULL_REQUEST_TEMPLATE.md")).toMatchObject({
      exists: true,
      valid: false,
    });
    expect(validation.checks).toContainEqual(
      expect.objectContaining({
        id: "repo_file_github_pull_request_template_md",
        status: "warn",
        message: ".github/PULL_REQUEST_TEMPLATE.md is missing Command Waves manifest markers. Fix it before inviting contributors.",
      }),
    );
  });

  it("explains unreachable repos as an operator setup action", async () => {
    const validation = await validateCommandWaveSetup(
      {
        waveUrl: "mock-command-wave",
        repoUrl: "6529-Collections/6529-hook",
      },
      {
        checkRepoRemote: true,
        githubApi: {
          apiBaseUrl: "https://api.example.test",
          fetchImpl: async () => new Response("not found", { status: 404, statusText: "Not Found" }),
        },
      },
    );

    expect(validation.canSave).toBe(false);
    expect(validation.checks).toContainEqual(
      expect.objectContaining({
        id: "repo_reachable",
        status: "fail",
        message:
          "Pick an existing public GitHub repo or configure token access. Could not fetch https://api.example.test/repos/6529-Collections/6529-hook: 404 Not Found",
      }),
    );
  });

  it("warns when the required guardian check is not enforced by GitHub", async () => {
    const template = [
      "## Command Waves Manifest",
      "<!-- command-waves:manifest:start -->",
      "{}",
      "<!-- command-waves:manifest:end -->",
    ].join("\n");
    const validation = await validateCommandWaveSetup(
      {
        waveUrl: "mock-command-wave",
        repoUrl: "6529-Collections/6529-hook",
      },
      {
        checkRepoRemote: true,
        githubApi: {
          apiBaseUrl: "https://api.example.test",
          fetchImpl: async (input) => {
            const url = String(input);

            if (url.endsWith("/repos/6529-Collections/6529-hook")) {
              return jsonResponse({
                default_branch: "main",
                private: false,
                archived: false,
              });
            }

            if (url.includes("PULL_REQUEST_TEMPLATE.md")) {
              return jsonResponse({ content: btoa(template), encoding: "base64" });
            }

            if (url.endsWith("/rulesets")) {
              return jsonResponse([]);
            }

            if (url.endsWith("/rules/branches/main")) {
              return new Response("not found", { status: 404, statusText: "Not Found" });
            }

            return jsonResponse({});
          },
        },
      },
    );

    expect(validation.canSave).toBe(true);
    expect(validation.checks).toContainEqual(
      expect.objectContaining({
        id: "repo_required_guardian_check",
        label: "Required guardian check",
        status: "warn",
        message: "Command Waves Guardian was not found in GitHub required status checks. Add it before inviting contributors.",
      }),
    );
    expect(setupValidationNotice(validation)).toBe("Setup check found 1 launch warning.");
  });
});
