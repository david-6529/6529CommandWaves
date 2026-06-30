import { commandWaveStateUrlFromEnv } from "./command-wave-state";
import type { CommandWave } from "./command-waves";
import { createFirstPhaseLaunchAudit } from "./first-phase-launch-audit";
import { createPhaseChecklist } from "./phase-checklist";
import { validateCommandWaveSetup, type SetupValidation } from "./setup-validation";
import { getReadinessChecks, getReadinessSummary, type ReadinessCheck } from "./system/readiness";

export type FirstPhaseLaunchSnapshot = {
  version: "command-wave-launch-audit-v0.1";
  generatedAt: string;
  project: {
    id: string;
    name: string;
    waveUrl: string;
    repoUrl: string;
  };
  setupCheckMode: "shape" | "remote";
  verificationTargets: {
    setupProofUrl: string;
    commandWaveStateUrl: string;
    launchAuditUrl: string;
  };
  setupValidation: SetupValidation;
  readiness: {
    summary: ReturnType<typeof getReadinessSummary>;
    checks: ReadinessCheck[];
  };
  phaseChecklist: ReturnType<typeof createPhaseChecklist>;
  launchAudit: ReturnType<typeof createFirstPhaseLaunchAudit>;
};

type FirstPhaseLaunchSnapshotOptions = {
  generatedAt?: string;
  env?: Record<string, string | undefined>;
  checkSetupRemote?: boolean;
  setupValidation?: SetupValidation;
  readinessChecks?: ReadinessCheck[];
};

function appRouteUrl(path: string, env: Record<string, string | undefined>) {
  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");

  return appUrl ? `${appUrl}${path}` : path;
}

export async function createFirstPhaseLaunchSnapshot(
  wave: CommandWave,
  options: FirstPhaseLaunchSnapshotOptions = {},
): Promise<FirstPhaseLaunchSnapshot> {
  const env = options.env ?? process.env;
  const setupValidation =
    options.setupValidation ??
    (await validateCommandWaveSetup(
      {
        waveUrl: wave.waveUrl,
        repoUrl: wave.repoUrl,
      },
      {
        checkWaveRemote: Boolean(options.checkSetupRemote),
        checkRepoRemote: Boolean(options.checkSetupRemote),
      },
    ));
  const readinessChecks = options.readinessChecks ?? getReadinessChecks(env);
  const phaseChecklist = createPhaseChecklist(wave);
  const launchAudit = createFirstPhaseLaunchAudit({
    phaseChecklist,
    readinessChecks,
    setupValidation,
    wave,
  });
  const commandWaveStateUrl = commandWaveStateUrlFromEnv(env) ?? appRouteUrl("/api/command-wave/state", env);
  const launchAuditPath = options.checkSetupRemote ? "/api/command-wave/launch/audit?remote=1" : "/api/command-wave/launch/audit";

  return {
    version: "command-wave-launch-audit-v0.1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    project: {
      id: wave.id,
      name: wave.name,
      waveUrl: wave.waveUrl,
      repoUrl: wave.repoUrl,
    },
    setupCheckMode: options.checkSetupRemote ? "remote" : "shape",
    verificationTargets: {
      setupProofUrl: appRouteUrl("/api/command-wave/setup/proof", env),
      commandWaveStateUrl,
      launchAuditUrl: appRouteUrl(launchAuditPath, env),
    },
    setupValidation,
    readiness: {
      summary: getReadinessSummary(readinessChecks),
      checks: readinessChecks,
    },
    phaseChecklist,
    launchAudit,
  };
}
