import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createFirstPhaseLaunchSnapshot } from "./first-phase-launch-snapshot";
import { hashValue } from "./run-manifest";

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
      name: "Decentralized Coding: Beta",
      purpose: "A simple way for people and agents to build in public",
      workflow: ["Choose project", "Discuss work", "Record decision", "Build PR", "Review", "Log result"],
      publicSurfaces: ["Project chat discussion", "GitHub PR record", "Build audit log"],
    });
    expect(snapshot.authorityBoundary).toMatchObject({
      phase: "first_public_hook_build",
      socialSourceOfTruth: "project chat",
      codeSurface: "GitHub PR",
      humansControl: ["Merges", "Deploys", "Payments", "Governance changes"],
    });
    expect(snapshot.authorityBoundary.appDoesNot).toContain("Auto-merge PRs");
    expect(snapshot.stateEvidence).toEqual({
      waveStateHash: hashValue(demoWave),
      rulesHash: hashValue(demoWave.rules),
      proposalCount: demoWave.proposals.length,
      reviewCount: demoWave.reviews.length,
      ledgerEventCount: demoWave.ledger.length,
    });
    expect(snapshot.reports.contribution).toMatchObject({
      mode: "informational",
      generatedAt: "2026-06-20T13:00:00.000Z",
      method: {
        id: "visible_activity_v0",
        authority: "Informational only",
      },
    });
    expect(snapshot.reports.contribution.notes.join(" ")).toContain("not a permission system");
    expect(snapshot.reports.developerFee).toMatchObject({
      mode: "manual_review",
    });
    expect(snapshot.reports.developerFee.requiredDecisions).toContain("Builders approve the fee budget before any payment.");
    expect(snapshot.reports.developerFee.blockedActions).toContain("No automatic payouts.");
    expect(snapshot.verificationTargets).toEqual({
      setupProofUrl: "https://command-waves.example.com/api/command-wave/setup/proof",
      commandWaveStateUrl: "https://command-waves.example.com/api/command-wave/state",
      launchAuditUrl: "https://command-waves.example.com/api/command-wave/launch/audit",
    });
    expect(snapshot.statusDraft).toContain("Project launch status");
    expect(snapshot.statusDraft).toContain("Status: checks needed");
    expect(snapshot.statusDraft).toContain("Next action: Run launch setup check");
    expect(snapshot.statusDraft).toContain("- Setup proof: https://command-waves.example.com/api/command-wave/setup/proof");
    expect(snapshot.statusDraft).toContain("- Command-wave state: https://command-waves.example.com/api/command-wave/state");
    expect(snapshot.statusDraft).toContain("- Launch audit: https://command-waves.example.com/api/command-wave/launch/audit");
    expect(snapshot.statusDraft).toContain("does not approve work or move funds");
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
