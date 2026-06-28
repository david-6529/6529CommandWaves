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
});

describe("first phase launch audit", () => {
  it("marks the completed demo flow and production checks ready", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(demoWave),
      readinessChecks: productionReadyChecks,
    });

    expect(audit.status).toBe("ready");
    expect(audit.statusLabel).toBe("ready");
    expect(audit.blockers).toHaveLength(0);
    expect(audit.openItems).toHaveLength(0);
  });

  it("keeps launch in setup mode until readiness is checked", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(demoWave),
      readinessChecks: null,
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
    });

    expect(audit.status).toBe("blocked");
    expect(audit.blockers.map((item) => item.label)).toEqual(["Admin API key", "Cron secret", "Rate-limit salt"]);
    expect(audit.openItems.slice(0, 3).map((item) => item.status)).toEqual(["blocked", "blocked", "blocked"]);
  });

  it("reports unfinished flow steps without blocking local work", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist({
        ...demoWave,
        waveUrl: "",
        repoUrl: "not github",
        proposals: [],
        polls: [],
        executions: [],
        reviews: [],
        ledger: [],
      }),
      readinessChecks: productionReadyChecks,
    });

    expect(audit.status).toBe("needs_setup");
    expect(audit.openItems.map((item) => item.label)).toContain("Choose project");
  });

  it("does not emit em dash characters", () => {
    const audit = createFirstPhaseLaunchAudit({
      phaseChecklist: createPhaseChecklist(demoWave),
      readinessChecks: getReadinessChecks({}),
    });

    expect(JSON.stringify(audit)).not.toContain("\u2014");
  });
});
