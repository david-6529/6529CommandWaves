import { describe, expect, it } from "vitest";
import { demoWave } from "./demo-wave";
import { createFirstPhaseLaunchAudit } from "./first-phase-launch-audit";
import { createPhaseChecklist } from "./phase-checklist";
import { getReadinessChecks } from "./system/readiness";

const productionReadyChecks = getReadinessChecks({
  NEXT_PUBLIC_APP_URL: "https://command-waves.example.com",
  DATABASE_URL: "postgresql://example",
  ADMIN_API_KEY: "admin",
  CRON_SECRET: "cron",
  RATE_LIMIT_SALT: "salt",
  "6529_MOCK_MODE": "false",
  NODE_ENV: "production",
  COMMAND_WAVE_STORE: "postgres",
  COMMAND_WAVE_REPO_ADAPTER: "github",
  COMMAND_WAVE_GITHUB_TOKEN: "token",
  COMMAND_WAVE_STATE_URL: "https://command-waves.example.com/api/command-wave",
  COMMAND_WAVE_GUARDIAN_MODE: "external_github_app",
});

describe("first phase launch audit", () => {
  it("marks the completed demo flow and production checks ready", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(demoWave),
      readinessChecks: productionReadyChecks,
      wave: demoWave,
    });

    expect(audit.status).toBe("ready");
    expect(audit.statusLabel).toBe("ready");
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
  });

  it("keeps launch in setup mode until readiness is checked", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(demoWave),
      readinessChecks: null,
      wave: demoWave,
    });

    expect(audit.status).toBe("needs_setup");
    expect(audit.openItems).toEqual([
      expect.objectContaining({
        id: "readiness_not_checked",
        label: "Readiness check",
        status: "needed",
      }),
    ]);
  });

  it("blocks public launch when required launch checks fail", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(demoWave),
      readinessChecks: getReadinessChecks({}),
      wave: demoWave,
    });

    expect(audit.status).toBe("blocked");
    expect(audit.blockers.map((item) => item.label)).toEqual(["Admin API key", "Cron secret", "Rate-limit salt"]);
    expect(audit.openItems.slice(0, 3).map((item) => item.status)).toEqual(["blocked", "blocked", "blocked"]);
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
      wave,
    });

    expect(audit.status).toBe("needs_setup");
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
      wave: demoWave,
    });

    expect(JSON.stringify(audit)).not.toContain("\u2014");
  });
});
