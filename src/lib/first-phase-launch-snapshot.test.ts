import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createFirstPhaseLaunchSnapshot } from "./first-phase-launch-snapshot";

const launchEnv = {
  NEXT_PUBLIC_APP_URL: "https://command-waves.example.com",
  ADMIN_API_KEY: "admin",
  "6529_MOCK_MODE": "false",
};

describe("first phase launch snapshot", () => {
  it("exposes a public launch audit without running remote setup checks by default", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: launchEnv,
    });

    expect(snapshot.version).toBe("command-wave-launch-audit-v0.1");
    expect(snapshot.generatedAt).toBe("2026-06-20T13:00:00.000Z");
    expect(snapshot.project).toMatchObject({
      id: demoWave.id,
      name: demoWave.name,
      waveUrl: demoWave.waveUrl,
      repoUrl: demoWave.repoUrl,
    });
    expect(snapshot.setupCheckMode).toBe("shape");
    expect(snapshot.verificationTargets).toEqual({
      setupProofUrl: "https://command-waves.example.com/api/command-wave/setup/proof",
      commandWaveStateUrl: "https://command-waves.example.com/api/command-wave/state",
    });
    expect(snapshot.phaseChecklist.every((item) => item.status === "done")).toBe(true);
    expect(snapshot.launchAudit.nextAction).toMatchObject({
      itemId: "setup_remote_check",
      title: "Run launch setup check",
    });
  });

  it("keeps readiness evidence in the same payload", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: launchEnv,
    });

    expect(snapshot.readiness.summary.fail).toBe(0);
    expect(snapshot.readiness.checks.map((check) => check.id)).toContain("admin_api_key");
    expect(snapshot.readiness.checks.map((check) => check.id)).toContain("6529_mode");
    expect(snapshot.setupValidation.checks.map((check) => check.id)).toEqual(["wave_format", "repo_format"]);
  });

  it("marks the snapshot as remote when remote setup checks are requested", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: launchEnv,
      checkSetupRemote: true,
      setupValidation: {
        waveId: "6529-hook-builder",
        repo: null,
        repoMetadata: null,
        repoRequiredFiles: [],
        checks: [],
        canSave: true,
        canRunCode: true,
      },
    });

    expect(snapshot.setupCheckMode).toBe("remote");
  });

  it("does not emit em dash characters", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: launchEnv,
    });

    expect(JSON.stringify(snapshot)).not.toContain("\u2014");
  });
});
