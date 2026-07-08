import { describe, expect, it } from "vitest";
import { createCommandWaveStateSnapshot, publicCommandWaveHash } from "./command-wave-state";
import { demoWave } from "./demo-wave";
import { createFirstPhaseLaunchSnapshot } from "./first-phase-launch-snapshot";
import { createHookProjectIndex } from "./hook-project-index";
import { verifyLaunchAuditPayload } from "./launch-audit-verifier";
import { hashValue } from "./run-manifest";
import type { SetupValidation } from "./setup-validation";

const configuredRepo = {
  owner: "6529-Collections",
  repo: "6529-hook",
  htmlUrl: "https://github.com/6529-Collections/6529-hook",
};

const readySetupValidation: SetupValidation = {
  waveId: "6529-hook-builder",
  repo: configuredRepo,
  repoMetadata: null,
  repoRequiredFiles: [
    {
      path: "CONTRIBUTING.md",
      label: "Contributor rules",
      exists: true,
      valid: true,
      status: 200,
      message: "CONTRIBUTING.md is present.",
    },
    {
      path: ".github/PULL_REQUEST_TEMPLATE.md",
      label: "PR template",
      exists: true,
      valid: true,
      status: 200,
      message: ".github/PULL_REQUEST_TEMPLATE.md is present.",
    },
    {
      path: ".github/workflows/guardian-review.yml",
      label: "Guardian workflow",
      exists: true,
      valid: true,
      status: 200,
      message: ".github/workflows/guardian-review.yml is present.",
    },
  ],
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
      id: "repo_file_github_workflows_guardian_review_yml",
      label: "Guardian workflow",
      status: "pass",
      message: ".github/workflows/guardian-review.yml is present.",
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
  "6529_BOT_BEARER_TOKEN": "6529-live-bot-token",
  "6529_BOT_WALLET_ADDRESS": "0x1234567890abcdef1234567890abcdef12345678",
};

const configuredDemoWave = {
  ...demoWave,
  repoUrl: configuredRepo.htmlUrl,
  executions: demoWave.executions.map((execution) => ({
    ...execution,
    artifacts: execution.artifacts.map((artifact) => artifact.replace(demoWave.repoUrl, configuredRepo.htmlUrl)),
  })),
  reviews: demoWave.reviews.map((review) => ({
    ...review,
    proof: review.proof
      ? {
          ...review.proof,
          inputs: {
            ...review.proof.inputs,
            repositoryHash: hashValue(configuredRepo),
          },
        }
      : review.proof,
  })),
};

describe("launch audit verifier", () => {
  it("verifies a complete audit shape while the reviewer placeholder keeps full launch pending", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(configuredDemoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const commandWaveState = createCommandWaveStateSnapshot(configuredDemoWave, {
      generatedAt: "2026-06-20T13:01:00.000Z",
    });
    const projectIndex = createHookProjectIndex(configuredDemoWave, {
      generatedAt: "2026-06-20T13:02:00.000Z",
    });
    const result = verifyLaunchAuditPayload(snapshot, { commandWaveState, projectIndex });

    expect(result).toMatchObject({
      status: "fail",
      launchStatus: "needs_setup",
      generatedAt: "2026-06-20T13:00:00.000Z",
      projectName: configuredDemoWave.name,
      auditHash: snapshot.auditHash,
      blockers: [],
    });
    expect(result.openItems).toContain(
      "Review agent: Review agent is a placeholder. Select the reviewer process before claiming the reviewed PR loop is ready.",
    );
    expect(result.checks.find((item) => item.id === "launch_status")).toMatchObject({
      status: "fail",
      message: "First public loop is needs_setup.",
    });
    expect(result.checks.find((item) => item.id === "audit_hash")).toMatchObject({
      status: "pass",
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
    expect(snapshot.agents.githubRepo).toMatchObject({
      status: "placeholder",
      configuredUrl: null,
      nextStep: "Choose the pilot repo before creating or reviewing PRs.",
    });
    expect(result.checks.find((item) => item.id === "product_contract")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "project_snapshot")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "hook_safety")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "workflow_proof")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "workflow_proof_ready")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "state_evidence")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "public_state_endpoint")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "project_index_endpoint")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "status_draft")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "launch_packet")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "chat_launch_status")).toMatchObject({
      status: "pass",
    });
    expect(snapshot.launchPacket.packetHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.checks.find((item) => item.id === "contribution_report")).toMatchObject({
      status: "pass",
    });
    expect(result.checks.find((item) => item.id === "developer_fee_plan")).toMatchObject({
      status: "pass",
    });
    expect(result.nextAction?.title).toBe("Repo not selected yet");
    expect(result.statusDraft).toContain("Project launch status");
    expect(result.statusDraft).toContain("Status: checks needed");
    expect(result.stateEvidence).toEqual({
      waveStateHash: publicCommandWaveHash(configuredDemoWave),
      rulesHash: hashValue(configuredDemoWave.rules),
      proposalCount: configuredDemoWave.proposals.length,
      reviewCount: 0,
      ledgerEventCount: 4,
    });
    expect(result.publicState).toMatchObject({
      stateHash: commandWaveState.stateHash,
      waveStateHash: publicCommandWaveHash(configuredDemoWave),
    });
    expect(result.publicProjectIndex).toMatchObject({
      projectsHash: projectIndex.projectsHash,
      activeProjectId: configuredDemoWave.id,
      projectCount: 1,
    });
    expect(result.operatorChecklist).toContain("- Select the reviewer process before claiming the reviewed PR loop is ready.");
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
      message: "Run the launch audit with ?remote=1 before broad participation.",
    });
  });

  it("fails when the launch audit bundle hash is stale", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(configuredDemoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      project: {
        ...snapshot.project,
        name: "Changed project name",
      },
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "audit_hash")).toMatchObject({
      status: "fail",
      message: "Launch audit must publish a valid hash for the public audit bundle.",
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
    expect(result.blockers.join("\n")).not.toContain("Audit packet:");
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

  it("fails when the GitHub repo placeholder is configured as a real repo", async () => {
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
        githubRepo: {
          ...snapshot.agents.githubRepo,
          configuredUrl: "https://github.com/6529-Collections/6529-hook",
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

  it("fails when the public project snapshot is missing", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      projectSnapshot: undefined,
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "project_snapshot")).toMatchObject({
      status: "fail",
      message: "Launch audit must publish current work, decision, repo state, next step, and recent changes.",
    });
  });

  it("fails when the public hook safety contract is missing", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      hookSafety: undefined,
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "hook_safety")).toMatchObject({
      status: "fail",
      message: "Launch audit must publish immutable-hook, bounded-parameter, and blocked-action guardrails.",
    });
  });

  it("fails when the public workflow proof is missing", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      workflowProof: undefined,
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "workflow_proof")).toMatchObject({
      status: "fail",
      message: "Launch audit must publish chat, decision, PR, review, and log proof steps.",
    });
  });

  it("fails a ready audit when workflow proof is not complete", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(configuredDemoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      launchAudit: {
        ...snapshot.launchAudit,
        status: "ready",
        statusLabel: "ready",
        blockers: [],
        openItems: [],
        nextAction: {
          ...snapshot.launchAudit.nextAction,
          status: "ready",
          statusLabel: "ready",
          title: "Start the first public loop",
        },
      },
      workflowProof: {
        ...snapshot.workflowProof,
        readyCount: 4,
        steps: snapshot.workflowProof.steps.map((step) =>
          step.id === "pr"
            ? {
                ...step,
                status: "needed",
                evidenceUrl: null,
              }
            : step,
        ),
      },
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "workflow_proof_ready")).toMatchObject({
      status: "fail",
      message: "Ready launch audit must publish ready chat, decision, PR, review, and log proof steps.",
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

  it("fails when the public state endpoint payload is stale", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(configuredDemoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const commandWaveState = createCommandWaveStateSnapshot(configuredDemoWave, {
      generatedAt: "2026-06-20T13:01:00.000Z",
    });
    const result = verifyLaunchAuditPayload(snapshot, {
      commandWaveState: {
        ...commandWaveState,
        projectSnapshot: {
          ...commandWaveState.projectSnapshot,
          summary: "Tampered summary",
        },
      },
    });

    expect(result.status).toBe("fail");
    expect(result.publicState).toBeNull();
    expect(result.checks.find((item) => item.id === "public_state_endpoint")).toMatchObject({
      status: "fail",
    });
  });

  it("fails when the public project index points to another project", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(configuredDemoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const projectIndex = createHookProjectIndex({
      ...configuredDemoWave,
      id: "other-hook",
    });
    const result = verifyLaunchAuditPayload(snapshot, { projectIndex });

    expect(result.status).toBe("fail");
    expect(result.publicProjectIndex).toBeNull();
    expect(result.checks.find((item) => item.id === "project_index_endpoint")).toMatchObject({
      status: "fail",
      message: "Public project index must return a valid project list hash and include the launch project.",
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

  it("fails when the human-readable launch packet is missing", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      launchPacket: undefined,
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "launch_packet")).toMatchObject({
      status: "fail",
      message:
        "Launch audit must publish a human-readable launch packet with workflow proof, verification links, and authority limits.",
    });
  });

  it("fails when the human-readable launch packet hash is stale", async () => {
    const snapshot = await createFirstPhaseLaunchSnapshot(demoWave, {
      generatedAt: "2026-06-20T13:00:00.000Z",
      env: readyEnv,
      checkSetupRemote: true,
      setupValidation: readySetupValidation,
    });
    const result = verifyLaunchAuditPayload({
      ...snapshot,
      launchPacket: {
        ...snapshot.launchPacket,
        text: `${snapshot.launchPacket.text}\n- extra line`,
      },
    });

    expect(result.status).toBe("fail");
    expect(result.checks.find((item) => item.id === "launch_packet")).toMatchObject({
      status: "fail",
      message:
        "Launch audit must publish a human-readable launch packet with workflow proof, verification links, and authority limits.",
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
    expect(result.publicState).toBeNull();
    expect(result.publicProjectIndex).toBeNull();
    expect(result.auditHash).toBeNull();
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
