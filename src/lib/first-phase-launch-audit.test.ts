import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createFirstPhaseLaunchAudit } from "./first-phase-launch-audit";
import { createPhaseChecklist } from "./phase-checklist";
import type { SetupValidation } from "./setup-validation";
import { getReadinessChecks } from "./system/readiness";

const productionReadyChecks = getReadinessChecks({
  NEXT_PUBLIC_APP_URL: "https://command-waves.example.com",
  DATABASE_URL: "postgresql://example",
  ADMIN_API_KEY: "admin",
  "6529_MOCK_MODE": "false",
  NODE_ENV: "production",
  COMMAND_WAVE_STORE: "postgres",
  COMMAND_WAVE_REPO_ADAPTER: "github",
  COMMAND_WAVE_GITHUB_TOKEN: "token",
  COMMAND_WAVE_STATE_URL: "https://command-waves.example.com/api/command-wave",
});

const productionSetupValidation: SetupValidation = {
  waveId: "6529-hook-builder",
  repo: {
    owner: "6529-Collections",
    repo: "6529-hook",
    htmlUrl: "https://github.com/6529-Collections/6529-hook",
  },
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
      status: 200,
      message: "Found CONTRIBUTING.md.",
    },
    {
      path: ".github/PULL_REQUEST_TEMPLATE.md",
      label: "PR template",
      exists: true,
      status: 200,
      message: "Found .github/PULL_REQUEST_TEMPLATE.md.",
    },
  ],
  checks: [
    { id: "wave_format", label: "6529 wave", status: "pass", message: "Using wave 6529-hook-builder." },
    { id: "repo_format", label: "GitHub repo", status: "pass", message: "Using 6529-Collections/6529-hook." },
    { id: "wave_reachable", label: "Wave reachable", status: "pass", message: "Live 6529 wave is reachable." },
    { id: "repo_reachable", label: "Repo reachable", status: "pass", message: "GitHub repo exists. Default branch: main." },
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

describe("first phase launch audit", () => {
  it("marks the completed demo flow and first-phase production checks ready", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(demoWave),
      readinessChecks: productionReadyChecks,
      setupValidation: productionSetupValidation,
      wave: demoWave,
    });

    expect(audit.status).toBe("ready");
    expect(audit.statusLabel).toBe("ready");
    expect(audit.nextAction).toMatchObject({
      status: "ready",
      itemId: null,
      title: "Start the public hook loop",
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
  });

  it("keeps launch in setup mode until setup is checked", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(demoWave),
      readinessChecks: productionReadyChecks,
      wave: demoWave,
    });

    expect(audit.status).toBe("needs_setup");
    expect(audit.statusLabel).toBe("checks needed");
    expect(audit.nextAction).toMatchObject({
      status: "needs_setup",
      itemId: "setup_not_checked",
      title: "Run launch setup check",
      detail: "Verify the wave, repo, contributor rules, and PR template before public launch.",
    });
  });

  it("keeps launch in setup mode until readiness is checked", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(demoWave),
      readinessChecks: null,
      setupValidation: productionSetupValidation,
      wave: demoWave,
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

  it("keeps launch in setup mode when the PR template is missing", () => {
    const setupValidation: SetupValidation = {
      ...productionSetupValidation,
      repoRequiredFiles: productionSetupValidation.repoRequiredFiles.map((file) =>
        file.path === ".github/PULL_REQUEST_TEMPLATE.md"
          ? { ...file, exists: false, status: 404, message: "Missing .github/PULL_REQUEST_TEMPLATE.md." }
          : file,
      ),
      checks: productionSetupValidation.checks.map((check) =>
        check.id === "repo_file_github_pull_request_template_md"
          ? {
              ...check,
              status: "warn",
              message: ".github/PULL_REQUEST_TEMPLATE.md is missing. Add it before public launch.",
            }
          : check,
      ),
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
      itemId: "setup_repo_file_github_pull_request_template_md",
      title: "Add PR template",
    });
    expect(audit.openItems).toContainEqual(
      expect.objectContaining({
        id: "setup_repo_file_github_pull_request_template_md",
        label: "PR template",
        status: "needed",
        detail: ".github/PULL_REQUEST_TEMPLATE.md is missing. Add it before public launch.",
      }),
    );
  });

  it("blocks public launch when required launch checks fail", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(demoWave),
      readinessChecks: getReadinessChecks({}),
      setupValidation: productionSetupValidation,
      wave: demoWave,
    });

    expect(audit.status).toBe("blocked");
    expect(audit.nextAction).toMatchObject({
      status: "blocked",
      itemId: "readiness_admin_api_key",
      title: "Fix Admin API key",
    });
    expect(audit.blockers.map((item) => item.label)).toEqual(["Admin API key"]);
    expect(audit.openItems[0]).toMatchObject({
      id: "readiness_admin_api_key",
      status: "blocked",
    });
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

  it("requires a builder wave decision receipt before public launch", () => {
    const wave = {
      ...demoWave,
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
      title: "Record the 6529 decision URL",
    });
    expect(audit.openItems).toContainEqual(
      expect.objectContaining({
        id: "flow_wave_decision_receipt",
        label: "Wave decision receipt",
        status: "needed",
      }),
    );
  });

  it("blocks public launch when a stored receipt points to another wave", () => {
    const decision = demoWave.polls[0].decision;

    if (!decision) {
      throw new Error("Expected demo decision receipt.");
    }

    const wave = {
      ...demoWave,
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
        detail: "Wave decision URL must match the configured builder wave.",
      }),
    );
  });

  it("blocks public launch when a PR receipt has only a drop id", () => {
    const decision = demoWave.polls[0].decision;

    if (!decision) {
      throw new Error("Expected demo decision receipt.");
    }

    const wave = {
      ...demoWave,
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
        detail: "Wave decision URL is required for PR work.",
      }),
    );
  });

  it("blocks public launch when reviewed PR work has no PR link", () => {
    const wave = {
      ...demoWave,
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
        detail: "Launch packet needs a GitHub PR link before public launch.",
      }),
    );
  });

  it("blocks public launch when reviewed PR work has no review proof", () => {
    const wave = {
      ...demoWave,
      reviews: [
        {
          ...demoWave.reviews[0],
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
        detail: "Launch packet needs Guardian review proof before public launch.",
      }),
    );
  });

  it("blocks public launch when participation notes imply live authority", () => {
    const wave = {
      ...demoWave,
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
          "Participation notes must be advisory until live REP, TDH, holder, allowlist, or QnA enforcement is wired.",
      }),
    );
  });

  it("does not require participation notes before public launch", () => {
    const wave = {
      ...demoWave,
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
      ...demoWave,
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
      phaseChecklist: createPhaseChecklist(demoWave),
      readinessChecks: getReadinessChecks({}),
      setupValidation: productionSetupValidation,
      wave: demoWave,
    });

    expect(JSON.stringify(audit)).not.toContain("\u2014");
  });
});
