import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createFirstPhaseLaunchSnapshot } from "./first-phase-launch-snapshot";
import { verifyLaunchAuditPayload } from "./launch-audit-verifier";
import type { SetupValidation } from "./setup-validation";

const readySetupValidation: SetupValidation = {
  waveId: "6529-hook-builder",
  repo: {
    owner: "6529-Collections",
    repo: "6529-hook",
    htmlUrl: "https://github.com/6529-Collections/6529-hook",
  },
  repoMetadata: null,
  repoRequiredFiles: [],
  checks: [
    { id: "wave_reachable", label: "Wave reachable", status: "pass", message: "Live 6529 wave is reachable." },
    { id: "repo_reachable", label: "Repo reachable", status: "pass", message: "GitHub repo exists." },
    { id: "repo_file_contributing_md", label: "Contributor rules", status: "pass", message: "CONTRIBUTING.md is present." },
    {
      id: "repo_file_github_pull_request_template_md",
      label: "PR template",
      status: "pass",
      message: ".github/PULL_REQUEST_TEMPLATE.md is present.",
    },
  ],
  canSave: true,
  canRunCode: true,
};

const readyEnv = {
  NEXT_PUBLIC_APP_URL: "https://command-waves.example.com",
  ADMIN_API_KEY: "admin",
  "6529_MOCK_MODE": "false",
};

describe("launch audit verifier", () => {
  it("passes a ready first loop audit", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload(snapshot);

    expect(result).toMatchObject({
      status: "pass",
      launchStatus: "ready",
      generatedAt: "2026-06-20T13:00:00.000Z",
      projectName: demoWave.name,
      blockers: [],
    });
    expect(result.nextAction?.title).toBe("Start the first public loop");
  });

  it("fails a blocked audit and lists blocker details", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: {},
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({ audit: snapshot });

    expect(result.status).toBe("fail");
    expect(result.launchStatus).toBe("blocked");
    expect(result.blockers.join("\n")).toContain("Admin API key: Missing.");
    expect(result.openItems.length).toBeGreaterThan(0);
    expect(result.nextAction?.title).toBe("Fix Admin API key");
  });

  it("fails an invalid payload without throwing", () => {
    const result = verifyLaunchAuditPayload({ nope: true });

    expect(result.status).toBe("fail");
    expect(result.launchStatus).toBe("unknown");
    expect(result.checks.find((item) => item.id === "payload_shape")).toMatchObject({
      status: "fail",
    });
  });

  it("does not emit em dash characters", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      setupValidation: readySetupValidation,
    });

    expect(JSON.stringify(verifyLaunchAuditPayload(snapshot))).not.toContain("\u2014");
  });
});
