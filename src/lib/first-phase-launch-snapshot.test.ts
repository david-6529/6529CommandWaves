import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createFirstPhaseLaunchSnapshot } from "./first-phase-launch-snapshot";
import { createLaunchAuditHash } from "./launch-audit-hash";
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
    const { auditHash, ...snapshotWithoutHash } = snapshot;
    expect(auditHash).toMatch(/^[a-f0-9]{64}$/);
    expect(auditHash).toBe(createLaunchAuditHash(snapshotWithoutHash));
    expect(snapshot.project).toMatchObject({
      id: demoWave.id,
      name: demoWave.name,
      waveUrl: demoWave.waveUrl,
      repoUrl: demoWave.repoUrl,
    });
    expect(snapshot.setupCheckMode).toBe("shape");
    expect(snapshot.projectSnapshot).toMatchObject({
      currentWork: {
        title: "Draft the non-upgradeable hook scaffold",
      },
      updatedAt: "2026-06-20T12:50:00.000Z",
      repo: {
        status: "placeholder",
        label: "Add real repo before PR build.",
      },
      nextStep: {
        label: "Connect repo",
        detail: "Set a real GitHub repo before PR work can run.",
      },
    });
    expect(snapshot.hookSafety).toMatchObject({
      immutableDefault: true,
      summary: "Hook contracts are immutable by default. Parameter changes need explicit caps and bound-focused tests.",
    });
    expect(snapshot.hookSafety.parameterPolicy.join(" ")).toContain("explicit cap");
    expect(snapshot.hookSafety.blockedInPhaseOne.join(" ")).toContain("Deploy scripts");
    expect(snapshot.workflowProof).toMatchObject({
      summary: "Public proof of the chat, decision, PR, review, and log path for the first hook build.",
      sourceOfTruth: "project chat",
      codeSurface: "GitHub PR",
      blockedCount: 2,
    });
    expect(snapshot.workflowProof.steps.find((step) => step.id === "pr")).toMatchObject({
      status: "blocked",
      detail: "GitHub repo is still a placeholder. Replace it before PR work can run.",
    });
    expect(snapshot.access).toMatchObject({
      label: "manual review",
      summary: "Ask in chat to join. Access is reviewed manually for now.",
      notes: ["Manual builder review for phase 1", "REP or TDH access checks are planned, not enforced here"],
    });
    expect(snapshot.productContract).toMatchObject({
      name: "Decentralized Coding: Beta",
      purpose: "A simple way for people and agents to build in public",
      workflow: ["Choose project", "Discuss in chat", "Record decision", "Build PR", "Review", "Log result"],
      publicSurfaces: ["Project chat", "GitHub repo once configured", "Build audit log"],
    });
    expect(snapshot.authorityBoundary).toMatchObject({
      phase: "first_public_hook_build",
      socialSourceOfTruth: "project chat",
      codeSurface: "GitHub PR",
      humansControl: ["Merges", "Deploys", "Payments", "Governance changes"],
      accessStatus: "Reputation, token, holder, allowlist, and QnA access notes are advisory until wired and verified.",
    });
    expect(snapshot.authorityBoundary).not.toHaveProperty("gateStatus");
    expect(snapshot.agents).toMatchObject({
      orchestrator: {
        handle: "daemon",
        accountType: "6529 account",
        status: "active",
      },
      reviewer: {
        status: "placeholder",
      },
      githubRepo: {
        status: "placeholder",
      },
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
    expect(snapshot.statusDraft).toContain("Status: blocked");
    expect(snapshot.statusDraft).toContain("Next action: Fix setup");
    expect(snapshot.statusDraft).toContain("Replace the GitHub repo placeholder before saving setup or running PR work.");
    expect(snapshot.statusDraft).toContain("- Setup proof: https://command-waves.example.com/api/command-wave/setup/proof");
    expect(snapshot.statusDraft).toContain("- Command-wave state: https://command-waves.example.com/api/command-wave/state");
    expect(snapshot.statusDraft).toContain("- Launch audit: https://command-waves.example.com/api/command-wave/launch/audit");
    expect(snapshot.statusDraft).toContain("does not approve work or move funds");
    expect(snapshot.launchPacket).toMatchObject({
      version: "command-wave-launch-packet-v0.1",
      proposalId: "cmd-001",
      generatedAt: "2026-06-20T13:00:00.000Z",
    });
    expect(snapshot.launchPacket.packetHash).toMatch(/^[a-f0-9]{64}$/);
    expect(snapshot.launchPacket.text).toContain("# Project launch packet");
    expect(snapshot.launchPacket.text).toContain("## Workflow Proof");
    expect(snapshot.launchPacket.text).toContain("## Verification");
    expect(snapshot.launchPacket.text).toContain("## Authority Limits");
    expect(snapshot.launchPacket.text).toContain(
      "Command-wave state: https://command-waves.example.com/api/command-wave/state",
    );
    expect(snapshot.launchPacket.text).toContain(
      "Launch audit: https://command-waves.example.com/api/command-wave/launch/audit",
    );
    expect(snapshot.launchPacket.text).toContain(
      "This packet does not grant reputation, token weight, payouts, permissions, or merge rights.",
    );
    expect(snapshot.phaseChecklist.map((item) => [item.id, item.status])).toEqual([
      ["project", "active"],
      ["proposal", "done"],
      ["decision", "done"],
      ["build", "waiting"],
      ["review", "waiting"],
      ["log", "waiting"],
    ]);
    expect(snapshot.launchAudit.nextAction).toMatchObject({
      itemId: "setup_project_check",
      title: "Fix setup",
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
    expect(snapshot.setupValidation.checks.map((check) => check.id)).toEqual([
      "wave_format",
      "repo_format",
      "repo_placeholder",
    ]);
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
