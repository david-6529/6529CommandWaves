import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createFirstPhaseLaunchAudit } from "./first-phase-launch-audit";
import { createPhaseChecklist } from "./phase-checklist";
import { hashValue } from "./run-manifest";
import type { SetupValidation } from "./setup-validation";
import { getReadinessChecks } from "./system/readiness";

const productionReadyChecks = getReadinessChecks({
  NEXT_PUBLIC_APP_URL: "https://command-waves.6529.io",
  DATABASE_URL: "postgresql://command_waves:strong-password@db.internal:5432/command_waves",
  ADMIN_API_KEY: "strong-admin-key-for-launch",
  COMMAND_WAVE_INITIAL_WAVE_URL: "https://6529.io/waves/6529-hook-builder",
  COMMAND_WAVE_INITIAL_REPO_URL: "https://github.com/6529-Collections/6529-hook",
  "6529_MOCK_MODE": "false",
  NODE_ENV: "production",
  COMMAND_WAVE_STORE: "postgres",
  COMMAND_WAVE_REPO_ADAPTER: "github",
  COMMAND_WAVE_GITHUB_TOKEN: "ghp_launch_readiness_token_1234567890",
  COMMAND_WAVE_STATE_URL: "https://command-waves.6529.io/api/command-wave/state",
  "6529_BOT_BEARER_TOKEN": "6529-live-bot-token",
  "6529_BOT_WALLET_ADDRESS": "0x1234567890abcdef1234567890abcdef12345678",
});

const configuredRepo = {
  owner: "6529-Collections",
  repo: "6529-hook",
  htmlUrl: "https://github.com/6529-Collections/6529-hook",
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

const productionSetupValidation: SetupValidation = {
  waveId: "6529-hook-builder",
  repo: configuredRepo,
  repoMetadata: {
    owner: "6529-Collections",
    repo: "6529-hook",
    htmlUrl: "https://github.com/6529-Collections/6529-hook",
    defaultBranch: "main",
    private: false,
    archived: false,
  },
  repoRequiredFiles: [
    {
      path: "CONTRIBUTING.md",
      label: "Contributor rules",
      exists: true,
      valid: true,
      status: 200,
      message: "Found CONTRIBUTING.md.",
    },
    {
      path: ".github/PULL_REQUEST_TEMPLATE.md",
      label: "PR template",
      exists: true,
      valid: true,
      status: 200,
      message: "Found .github/PULL_REQUEST_TEMPLATE.md with Command Waves manifest markers.",
    },
    {
      path: ".github/workflows/guardian-review.yml",
      label: "Guardian workflow",
      exists: true,
      valid: true,
      status: 200,
      message: "Found .github/workflows/guardian-review.yml with guardian check and proof replay commands.",
    },
  ],
  checks: [
    { id: "wave_format", label: "6529 wave", status: "pass", message: "Using wave 6529-hook-builder." },
    { id: "repo_format", label: "GitHub repo", status: "pass", message: "Using 6529-Collections/6529-hook." },
    { id: "wave_reachable", label: "Wave reachable", status: "pass", message: "Live 6529 wave is reachable." },
    { id: "repo_reachable", label: "Repo reachable", status: "pass", message: "GitHub repo exists. Default branch: main." },
    { id: "repo_file_contributing_md", label: "Contributor rules", status: "pass", message: "Found CONTRIBUTING.md." },
    {
      id: "repo_file_github_pull_request_template_md",
      label: "PR template",
      status: "pass",
      message: "Found .github/PULL_REQUEST_TEMPLATE.md with Command Waves manifest markers.",
    },
    {
      id: "repo_file_github_workflows_guardian_review_yml",
      label: "Guardian workflow",
      status: "pass",
      message: "Found .github/workflows/guardian-review.yml with guardian check and proof replay commands.",
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

describe("first phase launch audit", () => {
  it("marks the completed demo flow and first-phase production checks ready", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(configuredDemoWave),
      readinessChecks: productionReadyChecks,
      setupValidation: productionSetupValidation,
      wave: configuredDemoWave,
    });

    expect(audit.status).toBe("ready");
    expect(audit.statusLabel).toBe("ready");
    expect(audit.nextAction).toMatchObject({
      status: "ready",
      itemId: null,
      title: "Start the first public loop",
    });
    expect(audit.blockers).toHaveLength(0);
    expect(audit.openItems).toHaveLength(0);
    expect(audit.readyItems.length).toBeGreaterThan(0);
    expect(audit.items).toContainEqual(
      expect.objectContaining({
        id: "flow_wave_decision_receipt",
        status: "ready",
      }),
    );
    expect(audit.items).toContainEqual(
      expect.objectContaining({
        id: "flow_audit_packet",
        label: "Audit packet",
        status: "ready",
      }),
    );
    expect(audit.items).toContainEqual(
      expect.objectContaining({
        id: "flow_participation_notes",
        label: "Participation notes",
        status: "ready",
      }),
    );
    expect(audit.items).toContainEqual(
      expect.objectContaining({
        id: "setup_repo_file_contributing_md",
        status: "ready",
      }),
    );
    expect(audit.items).toContainEqual(
      expect.objectContaining({
        id: "readiness_initial_hook_project",
        status: "ready",
      }),
    );
  });

  it("keeps launch in setup mode until setup is checked", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(configuredDemoWave),
      readinessChecks: productionReadyChecks,
      wave: configuredDemoWave,
    });

    expect(audit.status).toBe("needs_setup");
    expect(audit.statusLabel).toBe("checks needed");
    expect(audit.nextAction).toMatchObject({
      status: "needs_setup",
      itemId: "setup_not_checked",
      title: "Run launch setup check",
      detail: "Verify the project chat, repo, contributor rules, PR template, guardian workflow, and required guardian check before inviting contributors.",
    });
  });

  it("keeps launch in setup mode until readiness is checked", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(configuredDemoWave),
      readinessChecks: null,
      setupValidation: productionSetupValidation,
      wave: configuredDemoWave,
    });

    expect(audit.status).toBe("needs_setup");
    expect(audit.statusLabel).toBe("checks needed");
    expect(audit.nextAction).toMatchObject({
      status: "needs_setup",
      itemId: "readiness_not_checked",
      title: "Run readiness",
    });
    expect(audit.openItems).toEqual([
      expect.objectContaining({
        id: "readiness_not_checked",
        label: "Readiness check",
        status: "needed",
      }),
    ]);
  });

  it("names unreachable setup targets in the next action", () => {
    const setupValidation: SetupValidation = {
      ...productionSetupValidation,
      checks: [
        ...productionSetupValidation.checks,
        {
          id: "repo_reachable",
          label: "Repo reachable",
          status: "fail",
          message: "GitHub repo check failed: 404 Not Found",
        },
      ],
      canSave: false,
      canRunCode: false,
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(configuredDemoWave),
      readinessChecks: productionReadyChecks,
      setupValidation,
      wave: configuredDemoWave,
    });

    expect(audit.status).toBe("blocked");
    expect(audit.nextAction).toMatchObject({
      status: "blocked",
      itemId: "setup_repo_reachable",
      title: "Pick reachable GitHub repo",
      detail: "GitHub repo check failed: 404 Not Found",
    });
    expect(audit.blockers).toContainEqual(
      expect.objectContaining({
        id: "setup_repo_reachable",
        label: "GitHub repo",
        status: "blocked",
      }),
    );
  });

  it("names placeholder repo setup in the next action", () => {
    const setupValidation: SetupValidation = {
      ...productionSetupValidation,
      repo: {
        owner: "your-org",
        repo: "your-hook-repo",
        htmlUrl: "https://github.com/your-org/your-hook-repo",
      },
      repoMetadata: null,
      repoRequiredFiles: [],
      checks: [
        { id: "wave_format", label: "6529 wave", status: "pass", message: "Using wave 6529-hook-builder." },
        { id: "repo_format", label: "GitHub repo", status: "pass", message: "Using your-org/your-hook-repo." },
        {
          id: "repo_placeholder",
          label: "GitHub repo placeholder",
          status: "warn",
          message: "GitHub repo is a placeholder. PR work stays blocked until the repo is selected.",
        },
      ],
      canSave: true,
      canRunCode: false,
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(demoWave),
      readinessChecks: productionReadyChecks,
      setupValidation,
      wave: demoWave,
    });

    expect(audit.status).toBe("needs_setup");
    expect(audit.nextAction).toMatchObject({
      status: "needs_setup",
      itemId: "flow_project",
      title: "Select the repo",
      detail: "Select the GitHub repo before PR work can run.",
    });
    expect(audit.blockers).toEqual([]);
    expect(audit.openItems).toContainEqual(
      expect.objectContaining({
        id: "setup_repo_placeholder",
        label: "GitHub repo placeholder",
        status: "needed",
      }),
    );
  });

  it("keeps launch in setup mode when the PR template is missing", () => {
    const setupValidation: SetupValidation = {
      ...productionSetupValidation,
      repoRequiredFiles: productionSetupValidation.repoRequiredFiles.map((file) =>
        file.path === ".github/PULL_REQUEST_TEMPLATE.md"
          ? { ...file, exists: false, valid: false, status: 404, message: "Missing .github/PULL_REQUEST_TEMPLATE.md." }
          : file,
      ),
      checks: productionSetupValidation.checks.map((check) =>
        check.id === "repo_file_github_pull_request_template_md"
          ? {
              ...check,
              status: "warn",
              message: "Missing .github/PULL_REQUEST_TEMPLATE.md. Fix it before inviting contributors.",
            }
          : check,
      ),
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(configuredDemoWave),
      readinessChecks: productionReadyChecks,
      setupValidation,
      wave: configuredDemoWave,
    });

    expect(audit.status).toBe("needs_setup");
    expect(audit.nextAction).toMatchObject({
      status: "needs_setup",
      itemId: "setup_repo_file_github_pull_request_template_md",
      title: "Add PR template",
    });
    expect(audit.openItems).toContainEqual(
      expect.objectContaining({
        id: "setup_repo_file_github_pull_request_template_md",
        label: "PR template",
        status: "needed",
        detail: "Missing .github/PULL_REQUEST_TEMPLATE.md. Fix it before inviting contributors.",
      }),
    );
  });

  it("keeps launch in setup mode when the guardian check is not required", () => {
    const setupValidation: SetupValidation = {
      ...productionSetupValidation,
      checks: productionSetupValidation.checks.map((check) =>
        check.id === "repo_required_guardian_check"
          ? {
              ...check,
              status: "warn",
              message: "Command Waves Guardian was not found in GitHub required status checks. Add it before inviting contributors.",
            }
          : check,
      ),
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(configuredDemoWave),
      readinessChecks: productionReadyChecks,
      setupValidation,
      wave: configuredDemoWave,
    });

    expect(audit.status).toBe("needs_setup");
    expect(audit.nextAction).toMatchObject({
      status: "needs_setup",
      itemId: "setup_repo_required_guardian_check",
      title: "Require guardian check",
    });
    expect(audit.openItems).toContainEqual(
      expect.objectContaining({
        id: "setup_repo_required_guardian_check",
        label: "Required guardian check",
        status: "needed",
        detail: "Command Waves Guardian was not found in GitHub required status checks. Add it before inviting contributors.",
      }),
    );
  });

  it("keeps launch in setup mode when the guardian workflow is missing", () => {
    const setupValidation: SetupValidation = {
      ...productionSetupValidation,
      repoRequiredFiles: productionSetupValidation.repoRequiredFiles.map((file) =>
        file.path === ".github/workflows/guardian-review.yml"
          ? { ...file, exists: false, valid: false, status: 404, message: "Missing .github/workflows/guardian-review.yml." }
          : file,
      ),
      checks: productionSetupValidation.checks.map((check) =>
        check.id === "repo_file_github_workflows_guardian_review_yml"
          ? {
              ...check,
              status: "warn",
              message: "Missing .github/workflows/guardian-review.yml. Fix it before inviting contributors.",
            }
          : check,
      ),
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(configuredDemoWave),
      readinessChecks: productionReadyChecks,
      setupValidation,
      wave: configuredDemoWave,
    });

    expect(audit.status).toBe("needs_setup");
    expect(audit.nextAction).toMatchObject({
      status: "needs_setup",
      itemId: "setup_repo_file_github_workflows_guardian_review_yml",
      title: "Add guardian workflow",
    });
    expect(audit.openItems).toContainEqual(
      expect.objectContaining({
        id: "setup_repo_file_github_workflows_guardian_review_yml",
        label: "Guardian workflow",
        status: "needed",
        detail: "Missing .github/workflows/guardian-review.yml. Fix it before inviting contributors.",
      }),
    );
  });

  it("blocks the first loop when required launch checks fail", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(configuredDemoWave),
      readinessChecks: getReadinessChecks({}),
      setupValidation: productionSetupValidation,
      wave: configuredDemoWave,
    });

    expect(audit.status).toBe("blocked");
    expect(audit.nextAction).toMatchObject({
      status: "blocked",
      itemId: "readiness_admin_api_key",
      title: "Set ADMIN_API_KEY",
      detail: "Set ADMIN_API_KEY before public launch so protected actions require a key.",
    });
    expect(audit.blockers.map((item) => item.label)).toEqual(["Admin API key"]);
    expect(audit.openItems[0]).toMatchObject({
      id: "readiness_admin_api_key",
      status: "blocked",
      detail: "Set ADMIN_API_KEY before public launch so protected actions require a key.",
    });
  });

  it("surfaces production hardening warnings as launch gaps", () => {
    const firstLoopChecks = getReadinessChecks({
      NEXT_PUBLIC_APP_URL: "https://command-waves.example.com",
      ADMIN_API_KEY: "admin",
      "6529_MOCK_MODE": "false",
    });
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(configuredDemoWave),
      readinessChecks: firstLoopChecks,
      setupValidation: productionSetupValidation,
      wave: configuredDemoWave,
    });

    expect(audit.status).toBe("needs_setup");
    expect(audit.blockers).toEqual([]);
    expect(audit.openItems).toEqual([
      expect.objectContaining({
        id: "readiness_initial_hook_project",
        status: "needed",
      }),
      expect.objectContaining({
        id: "readiness_database",
        status: "needed",
      }),
      expect.objectContaining({
        id: "readiness_command_wave_store",
        status: "needed",
      }),
      expect.objectContaining({
        id: "readiness_6529_chat_posting",
        status: "needed",
      }),
      expect.objectContaining({
        id: "readiness_github_pr_adapter",
        status: "needed",
      }),
      expect.objectContaining({
        id: "readiness_guardian_wave_state",
        status: "needed",
      }),
    ]);
  });

  it("keeps live 6529 mode as a first-loop launch gap", () => {
    const mockModeChecks = getReadinessChecks({
      NEXT_PUBLIC_APP_URL: "https://command-waves.example.com",
      ADMIN_API_KEY: "admin",
    });
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(configuredDemoWave),
      readinessChecks: mockModeChecks,
      setupValidation: productionSetupValidation,
      wave: configuredDemoWave,
    });

    expect(audit.status).toBe("needs_setup");
    expect(audit.openItems).toContainEqual(
      expect.objectContaining({
        id: "readiness_6529_mode",
        label: "6529 mode",
        status: "needed",
        detail: "Set 6529_MOCK_MODE=false before public launch.",
      }),
    );
  });

  it("reports unfinished flow steps without blocking local work", () => {
    const wave = {
      ...demoWave,
      waveUrl: "",
      repoUrl: "not github",
      proposals: [],
      polls: [],
      executions: [],
      reviews: [],
      ledger: [],
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(wave),
      readinessChecks: productionReadyChecks,
      setupValidation: productionSetupValidation,
      wave,
    });

    expect(audit.status).toBe("needs_setup");
    expect(audit.openItems.map((item) => item.label)).toContain("Choose project");
  });

  it("requires a project decision receipt before the first loop", () => {
    const wave = {
      ...configuredDemoWave,
      polls: [{ ...demoWave.polls[0], decision: null }],
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(wave),
      readinessChecks: productionReadyChecks,
      setupValidation: productionSetupValidation,
      wave,
    });

    expect(audit.status).toBe("needs_setup");
    expect(audit.nextAction).toMatchObject({
      status: "needs_setup",
      itemId: "flow_wave_decision_receipt",
      title: "Record the project decision URL",
    });
    expect(audit.openItems).toContainEqual(
      expect.objectContaining({
        id: "flow_wave_decision_receipt",
        label: "Project decision receipt",
        status: "needed",
      }),
    );
  });

  it("blocks the first loop when a stored receipt points to another wave", () => {
    const decision = demoWave.polls[0].decision;

    if (!decision) {
      throw new Error("Expected demo decision receipt.");
    }

    const wave = {
      ...configuredDemoWave,
      polls: [
        {
          ...demoWave.polls[0],
          decision: {
            ...decision,
            url: "https://6529.io/waves/other-builder-wave/drops/drop-cmd-001-approval",
          },
        },
      ],
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(wave),
      readinessChecks: productionReadyChecks,
      setupValidation: productionSetupValidation,
      wave,
    });

    expect(audit.status).toBe("blocked");
    expect(audit.blockers).toContainEqual(
      expect.objectContaining({
        id: "flow_wave_decision_receipt",
        status: "blocked",
        detail: "Project decision URL must match the configured discussion.",
      }),
    );
  });

  it("blocks the first loop when a PR receipt has only a drop id", () => {
    const decision = demoWave.polls[0].decision;

    if (!decision) {
      throw new Error("Expected demo decision receipt.");
    }

    const wave = {
      ...configuredDemoWave,
      polls: [
        {
          ...demoWave.polls[0],
          decision: {
            ...decision,
            url: null,
          },
        },
      ],
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(wave),
      readinessChecks: productionReadyChecks,
      setupValidation: productionSetupValidation,
      wave,
    });

    expect(audit.status).toBe("blocked");
    expect(audit.blockers).toContainEqual(
      expect.objectContaining({
        id: "flow_wave_decision_receipt",
        status: "blocked",
        detail: "Project decision URL is required for PR work.",
      }),
    );
  });

  it("blocks the first loop when reviewed PR work has no PR link", () => {
    const wave = {
      ...configuredDemoWave,
      executions: [
        {
          ...demoWave.executions[0],
          artifacts: demoWave.executions[0].artifacts.filter((artifact) => !artifact.startsWith("https://github.com/")),
        },
      ],
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(wave),
      readinessChecks: productionReadyChecks,
      setupValidation: productionSetupValidation,
      wave,
    });

    expect(audit.status).toBe("blocked");
    expect(audit.blockers).toContainEqual(
      expect.objectContaining({
        id: "flow_audit_packet",
        status: "blocked",
        detail: "Launch packet needs a GitHub PR link for the configured repo before contributors audit it.",
      }),
    );
  });

  it("blocks the first loop when reviewed PR work points to another repo", () => {
    const wave = {
      ...configuredDemoWave,
      executions: [
        {
          ...demoWave.executions[0],
          artifacts: demoWave.executions[0].artifacts.map((artifact) =>
            artifact.startsWith("https://github.com/") ? "https://github.com/other-org/other-hook/pull/12" : artifact,
          ),
        },
      ],
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(wave),
      readinessChecks: productionReadyChecks,
      setupValidation: productionSetupValidation,
      wave,
    });

    expect(audit.status).toBe("blocked");
    expect(audit.blockers).toContainEqual(
      expect.objectContaining({
        id: "flow_audit_packet",
        status: "blocked",
        detail: "Launch packet needs a GitHub PR link for the configured repo before contributors audit it.",
      }),
    );
  });

  it("keeps stale reviewed PR evidence in setup mode while the repo is still a placeholder", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(demoWave),
      readinessChecks: productionReadyChecks,
      setupValidation: productionSetupValidation,
      wave: demoWave,
    });

    expect(audit.status).toBe("needs_setup");
    expect(audit.blockers).toEqual([]);
    expect(audit.openItems).toContainEqual(
      expect.objectContaining({
        id: "flow_audit_packet",
        status: "needed",
        detail: "Launch packet waits for the selected GitHub repo and matching PR evidence.",
      }),
    );
  });

  it("blocks the first loop when reviewed PR work has no review proof", () => {
    const wave = {
      ...configuredDemoWave,
      reviews: [
        {
          ...configuredDemoWave.reviews[0],
          proof: undefined,
        },
      ],
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(wave),
      readinessChecks: productionReadyChecks,
      setupValidation: productionSetupValidation,
      wave,
    });

    expect(audit.status).toBe("blocked");
    expect(audit.blockers).toContainEqual(
      expect.objectContaining({
        id: "flow_audit_packet",
        status: "blocked",
        detail: "Launch packet needs Guardian review proof before contributors audit it.",
      }),
    );
  });

  it("blocks the first loop when review proof is not bound to the configured repo", () => {
    const wave = {
      ...configuredDemoWave,
      reviews: configuredDemoWave.reviews.map((review) => ({
        ...review,
        proof: review.proof
          ? {
              ...review.proof,
              inputs: {
                ...review.proof.inputs,
                repositoryHash: undefined,
              },
            }
          : review.proof,
      })),
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(wave),
      readinessChecks: productionReadyChecks,
      setupValidation: productionSetupValidation,
      wave,
    });

    expect(audit.status).toBe("blocked");
    expect(audit.blockers).toContainEqual(
      expect.objectContaining({
        id: "flow_audit_packet",
        status: "blocked",
        detail: "Launch packet needs Guardian review proof bound to the configured repo before contributors audit it.",
      }),
    );
  });

  it("blocks the first loop when participation notes imply live authority", () => {
    const wave = {
      ...configuredDemoWave,
      gates: ["30% of TDH holders can contribute"],
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(wave),
      readinessChecks: productionReadyChecks,
      setupValidation: productionSetupValidation,
      wave,
    });

    expect(audit.status).toBe("blocked");
    expect(audit.blockers).toContainEqual(
      expect.objectContaining({
        id: "flow_participation_notes",
        label: "Participation notes",
        status: "blocked",
        detail:
          "Participation notes must be advisory until live reputation, token, holder, allowlist, or QnA enforcement is wired.",
      }),
    );
  });

  it("does not require participation notes before the first loop", () => {
    const wave = {
      ...configuredDemoWave,
      gates: [],
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(wave),
      readinessChecks: productionReadyChecks,
      setupValidation: productionSetupValidation,
      wave,
    });

    expect(audit.items).toContainEqual(
      expect.objectContaining({
        id: "flow_participation_notes",
        status: "ready",
        detail: "No participation notes recorded.",
      }),
    );
  });

  it("allows harmless participation note formatting differences", () => {
    const wave = {
      ...configuredDemoWave,
      gates: ["  Community builders welcome  "],
    };
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(wave),
      readinessChecks: productionReadyChecks,
      setupValidation: productionSetupValidation,
      wave,
    });

    expect(audit.items).toContainEqual(
      expect.objectContaining({
        id: "flow_participation_notes",
        status: "ready",
        detail: "Participation notes are advisory and do not grant permissions.",
      }),
    );
  });

  it("does not emit em dash characters", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(configuredDemoWave),
      readinessChecks: getReadinessChecks({}),
      setupValidation: productionSetupValidation,
      wave: configuredDemoWave,
    });

    expect(JSON.stringify(audit)).not.toContain("\u2014");
  });
});
