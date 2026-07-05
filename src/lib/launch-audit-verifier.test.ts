import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createFirstPhaseLaunchSnapshot } from "./first-phase-launch-snapshot";
import { verifyLaunchAuditPayload } from "./launch-audit-verifier";
import { hashValue } from "./run-manifest";
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
    {
      id: "repo_required_guardian_check",
      label: "Required guardian check",
      status: "pass",
      message: "Command Waves Guardian is required by GitHub branch protection or rulesets.",
    },
  ],
  canSave: true,
  canRunCode: true,
};

const readyEnv = {
  NEXT_PUBLIC_APP_URL: "https://command-waves.example.com",
  DATABASE_URL: "postgresql://command_waves:strong-password@db.internal:5432/command_waves",
  ADMIN_API_KEY: "strong-admin-key-for-launch",
  COMMAND_WAVE_INITIAL_WAVE_URL: "https://6529.io/waves/6529-hook-builder",
  COMMAND_WAVE_INITIAL_REPO_URL: "https://github.com/6529-Collections/6529-hook",
  "6529_MOCK_MODE": "false",
  NODE_ENV: "production",
  COMMAND_WAVE_STORE: "postgres",
  COMMAND_WAVE_REPO_ADAPTER: "github",
  COMMAND_WAVE_GITHUB_TOKEN: "ghp_launch_readiness_token_1234567890",
  COMMAND_WAVE_STATE_URL: "https://command-waves.example.com/api/command-wave/state",
};

const configuredDemoWave = {
  ...demoWave,
  repoUrl: "https://github.com/6529-Collections/6529-hook",
  executions: demoWave.executions.map((execution) => ({
    ...execution,
    artifacts: execution.artifacts.map((artifact) => artifact.replace(demoWave.repoUrl, "https://github.com/6529-Collections/6529-hook")),
  })),
};

describe("launch audit verifier", () => {
  it("passes a ready first loop audit", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(configuredDemoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload(snapshot);

    expect(result).toMatchObject({
      status: "pass",
      launchStatus: "ready",
      generatedAt: "2026-06-20T13:00:00.000Z",
      projectName: configuredDemoWave.name,
      blockers: [],
    });
    expect(result.checks.find((item) => item.id === "authority_boundary")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "access_summary")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "agent_boundary")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "product_contract")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "state_evidence")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "status_draft")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "contribution_report")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "developer_fee_plan")).toMatchObject({
      status: "pass",
    });
    expect(result.nextAction?.title).toBe("Start the first public loop");
    expect(result.statusDraft).toContain("Project launch status");
    expect(result.statusDraft).toContain("Status: ready");
    expect(result.stateEvidence).toEqual({
      waveStateHash: hashValue(configuredDemoWave),
      rulesHash: hashValue(configuredDemoWave.rules),
      proposalCount: configuredDemoWave.proposals.length,
      reviewCount: configuredDemoWave.reviews.length,
      ledgerEventCount: configuredDemoWave.ledger.length,
    });
    expect(result.operatorChecklist).toContain("- Start the first public loop with one small reviewed hook change.");
  });

  it("fails a shape-only setup audit before public launch", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload(snapshot);

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "remote_setup")).toMatchObject({
      status: "fail",
      message: "Launch audit must be generated with remote setup checks.",
    });
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
    expect(result.blockers.join("\n")).toContain(
      "Admin API key: Set ADMIN_API_KEY before public launch so protected actions require a key.",
    );
    expect(result.openItems.length).toBeGreaterThan(0);
    expect(result.operatorChecklist).toContain("- Set a strong ADMIN_API_KEY before public launch.");
    expect(result.operatorChecklist).toContain("- Set COMMAND_WAVE_REPO_ADAPTER=github before automated PR creation.");
    expect(result.operatorChecklist).toContain("- Set COMMAND_WAVE_GITHUB_TOKEN or GITHUB_TOKEN with repo access.");
    expect(result.operatorChecklist).toContain(
      "- Set COMMAND_WAVE_STATE_URL to the deployed /api/command-wave/state URL for guardian PR checks.",
    );
    expect(result.nextAction?.title).toBe("Set ADMIN_API_KEY");
  });

  it("fails when the authority boundary is missing", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      authorityBoundary: undefined,
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "authority_boundary")).toMatchObject({
      status: "fail",
      message:
        "Launch audit must publish who controls merges, deploys, payments, governance changes, and blocked app actions.",
    });
  });

  it("fails when the authority boundary omits access status", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const authorityBoundary: Record<string, unknown> = { ...snapshot.authorityBoundary };
    delete authorityBoundary.accessStatus;
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      authorityBoundary,
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "authority_boundary")).toMatchObject({
      status: "fail",
    });
  });

  it("fails when the public access summary is missing", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      access: undefined,
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "access_summary")).toMatchObject({
      status: "fail",
      message: "Launch audit must publish who can join and how access works.",
    });
  });

  it("fails when daemon is not the active orchestrator identity", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      agents: {
        ...snapshot.agents,
        orchestrator: {
          ...snapshot.agents.orchestrator,
          handle: "other-agent",
        },
      },
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "agent_boundary")).toMatchObject({
      status: "fail",
      message: "Launch audit must publish daemon, reviewer placeholder, and GitHub repo placeholder boundaries.",
    });
  });

  it("fails when reviewer or repo placeholders are missing", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      agents: {
        ...snapshot.agents,
        reviewer: {
          ...snapshot.agents.reviewer,
          status: "active",
        },
      },
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "agent_boundary")).toMatchObject({
      status: "fail",
    });
  });

  it("fails when the product contract is missing", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      productContract: undefined,
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "product_contract")).toMatchObject({
      status: "fail",
      message: "Launch audit must publish the simple project, discussion, decision, PR, review, and log flow.",
    });
  });

  it("fails when state evidence is missing", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      stateEvidence: undefined,
    });

    expect(result.status).toBe("fail");
    expect(result.stateEvidence).toBeNull();
    expect(result.checks.find((item) => item.id === "state_evidence")).toMatchObject({
      status: "fail",
      message: "Launch audit must publish wave state hash, rules hash, and record counts.",
    });
  });

  it("fails when state evidence is malformed", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      stateEvidence: {
        ...snapshot.stateEvidence,
        waveStateHash: "not-a-hash",
      },
    });

    expect(result.status).toBe("fail");
    expect(result.stateEvidence).toBeNull();
    expect(result.checks.find((item) => item.id === "state_evidence")).toMatchObject({
      status: "fail",
    });
  });

  it("fails when the human-readable status draft is missing", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      statusDraft: undefined,
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "status_draft")).toMatchObject({
      status: "fail",
      message: "Launch audit must publish a human-readable launch status draft with guardrails and verification links.",
    });
  });

  it("fails when the status draft omits guardrails", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      statusDraft: "Project launch status\nStatus: ready\nOperator checklist:\nVerification:",
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "status_draft")).toMatchObject({
      status: "fail",
    });
  });

  it("fails when contribution reporting is missing", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      reports: {
        ...snapshot.reports,
        contribution: undefined,
      },
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "contribution_report")).toMatchObject({
      status: "fail",
      message: "Launch audit must publish contribution scoring as informational evidence, not authority.",
    });
  });

  it("fails when developer fee boundaries are missing", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      reports: {
        ...snapshot.reports,
        developerFee: undefined,
      },
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "developer_fee_plan")).toMatchObject({
      status: "fail",
      message: "Launch audit must publish manual fee boundaries and block automatic payouts.",
    });
  });

  it("fails an invalid payload without throwing", () => {
    const result = verifyLaunchAuditPayload({ nope: true });

    expect(result.status).toBe("fail");
    expect(result.launchStatus).toBe("unknown");
    expect(result.stateEvidence).toBeNull();
    expect(result.operatorChecklist).toEqual([]);
    expect(result.checks.find((item) => item.id === "payload_shape")).toMatchObject({
      status: "fail",
    });
  });

  it("does not emit em dash characters", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });

    expect(JSON.stringify(verifyLaunchAuditPayload(snapshot))).not.toContain("\u2014");
  });
});
