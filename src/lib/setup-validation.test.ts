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

            return jsonResponse({});
          },
        },
      },
    );

    expect(validation.canSave).toBe(true);
    expect(validation.canRunCode).toBe(true);
    expect(validation.repoRequiredFiles.map((file) => [file.path, file.exists])).toEqual([
      ["CONTRIBUTING.md", true],
      [".github/PULL_REQUEST_TEMPLATE.md", false],
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
          message: ".github/PULL_REQUEST_TEMPLATE.md is missing. Add it before public launch.",
        }),
      ]),
    );
    expect(setupValidationNotice(validation)).toBe("Setup check found 1 launch warning.");
  });
});
