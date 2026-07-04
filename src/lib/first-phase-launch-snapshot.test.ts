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
    expect(snapshot.productContract).toMatchObject({
      name: "Decentralized Coding",
      workflow: ["Choose project", "Discuss work", "Record decision", "Build PR", "Review", "Log result"],
      publicSurfaces: ["6529 wave discussion", "GitHub PR record", "Command Waves audit log"],
    });
    expect(snapshot.authorityBoundary).toMatchObject({
      phase: "first_public_hook_build",
      socialSourceOfTruth: "6529 wave",
      codeSurface: "GitHub PR",
      humansControl: ["Merges", "Deploys", "Payments", "Governance changes"],
    });
    expect(snapshot.authorityBoundary.appDoesNot).toContain("Auto-merge PRs");
    expect(snapshot.verificationTargets).toEqual({
      setupProofUrl: "https://command-waves.example.com/api/command-wave/setup/proof",
      commandWaveStateUrl: "https://command-waves.example.com/api/command-wave/state",
      launchAuditUrl: "https://command-waves.example.com/api/command-wave/launch/audit",
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
    expect(snapshot.verificationTargets.launchAuditUrl).toBe(
      "https://command-waves.example.com/api/command-wave/launch/audit?remote=1",
    );
  });

  it("does not publish placeholder app URLs as production verification targets", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: {
        ...launchEnv,
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "https://your-app.example",
      },
    });

    expect(snapshot.verificationTargets).toEqual({
      setupProofUrl: "/api/command-wave/setup/proof",
      commandWaveStateUrl: "/api/command-wave/state",
      launchAuditUrl: "/api/command-wave/launch/audit",
    });
  });

  it("does not emit em dash characters", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: launchEnv,
    });

    expect(JSON.stringify(snapshot)).not.toContain("\u2014");
  });
});
