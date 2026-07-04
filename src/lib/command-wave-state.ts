import type { CommandWave } from "./command-waves";
import { createContributionReport, type ContributionReport } from "./contribution-report";
import { hasProductionValue } from "./env-placeholders";
import { hashValue } from "./run-manifest";

export type CommandWaveStateSnapshot = {
  version: "command-wave-state-v0.1";
  generatedAt: string;
  wave: CommandWave;
  waveStateHash: string;
  reports: {
    contribution: ContributionReport;
  };
  guardian: {
    envVar: "COMMAND_WAVE_STATE_URL";
    expectedPayload: "command-wave-state-v0.1 snapshot";
  };
};

export function createCommandWaveStateSnapshot(
  wave: CommandWave,
  options: { generatedAt?: string } = {},
): CommandWaveStateSnapshot {
  const generatedAt = options.generatedAt ?? new Date().toISOString();

  return {
    version: "command-wave-state-v0.1",
    generatedAt,
    wave,
    waveStateHash: hashValue(wave),
    reports: {
      contribution: createContributionReport(wave, { generatedAt }),
    },
    guardian: {
      envVar: "COMMAND_WAVE_STATE_URL",
      expectedPayload: "command-wave-state-v0.1 snapshot",
    },
  };
}

export function commandWaveStateUrlFromEnv(env: Record<string, string | undefined> = process.env) {
  const explicitUrl = env.COMMAND_WAVE_STATE_URL?.trim();

  if (hasProductionValue(explicitUrl, env)) {
    return explicitUrl;
  }

  const appUrl = hasProductionValue(env.NEXT_PUBLIC_APP_URL, env)
    ? env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "")
    : "";

  return appUrl ? `${appUrl}/api/command-wave/state` : null;
}
