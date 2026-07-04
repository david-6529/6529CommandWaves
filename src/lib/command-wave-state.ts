import type { CommandWave } from "./command-waves";
import { createContributionReport, type ContributionReport } from "./contribution-report";
import { hasProductionValue } from "./env-placeholders";
import { hashValue } from "./run-manifest";

export type CommandWaveStateSnapshot = {
  version: "command-wave-state-v0.1";
  generatedAt: string;
  wave: CommandWave;
  waveStateHash: string;
  authorityBoundary: {
    phase: "first_public_hook_build";
    socialSourceOfTruth: "6529 wave";
    codeSurface: "GitHub PR";
    humansControl: string[];
    appDoesNot: string[];
    agentLimits: string[];
    gateStatus: string;
  };
  reports: {
    contribution: ContributionReport;
  };
  guardian: {
    envVar: "COMMAND_WAVE_STATE_URL";
    expectedPayload: "command-wave-state-v0.1 snapshot";
  };
};

export const phaseOneAuthorityBoundary: CommandWaveStateSnapshot["authorityBoundary"] = {
  phase: "first_public_hook_build",
  socialSourceOfTruth: "6529 wave",
  codeSurface: "GitHub PR",
  humansControl: ["Merges", "Deploys", "Payments", "Governance changes"],
  appDoesNot: [
    "Auto-merge PRs",
    "Deploy contracts",
    "Move funds",
    "Grant REP, TDH, payouts, permissions, or merge rights from contribution scores",
  ],
  agentLimits: [
    "Agents prepare drafts, packets, PR records, and review evidence.",
    "Reviewer checks are evidence for humans before merge.",
    "Commands touching deployment, governance, payments, upgradeability, or uncapped parameters are blocked or require explicit review.",
  ],
  gateStatus: "REP, TDH, holder, allowlist, and QnA gates are advisory until wired and verified.",
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
    authorityBoundary: phaseOneAuthorityBoundary,
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
