import { githubRepoPlaceholder, orchestratorAgentIdentity, reviewAgentIdentity } from "./agent-identities";
import { createCommandWaveStateHash } from "./command-wave-state-hash";
import type { CommandWave } from "./command-waves";
import { createContributionReport, type ContributionReport } from "./contribution-report";
import { hasProductionValue } from "./env-placeholders";
import { createParticipationAccessSnapshot } from "./participation-gates";
import { commandWaveProductCopy } from "./product-copy";
import { publicHookSafety, type PublicHookSafety } from "./public-hook-safety";
import { createPublicProjectSnapshot, type PublicProjectSnapshot } from "./public-project-snapshot";
import { createPublicWorkflowProof, type PublicWorkflowProof } from "./public-workflow-proof";
import { hashValue } from "./run-manifest";

export type CommandWaveStateSnapshot = {
  version: "command-wave-state-v0.1";
  generatedAt: string;
  wave: CommandWave;
  waveStateHash: string;
  stateHash: string;
  projectSnapshot: PublicProjectSnapshot;
  hookSafety: PublicHookSafety;
  workflowProof: PublicWorkflowProof;
  access: ReturnType<typeof createParticipationAccessSnapshot>;
  productContract: PhaseOneProductContract;
  authorityBoundary: {
    phase: "first_public_hook_build";
    socialSourceOfTruth: "project chat";
    codeSurface: "GitHub PR";
    humansControl: string[];
    appDoesNot: string[];
    agentLimits: string[];
    accessStatus: string;
  };
  agents: {
    orchestrator: typeof orchestratorAgentIdentity;
    reviewer: typeof reviewAgentIdentity;
    githubRepo: typeof githubRepoPlaceholder;
  };
  reports: {
    contribution: ContributionReport;
  };
  guardian: {
    envVar: "COMMAND_WAVE_STATE_URL";
    expectedPayload: "command-wave-state-v0.1 snapshot";
  };
};

export type PhaseOneProductContract = {
  name: typeof commandWaveProductCopy.headline;
  purpose: string;
  workflow: string[];
  publicSurfaces: string[];
  firstPhaseLimits: string[];
};

export const phaseOneProductContract: PhaseOneProductContract = {
  name: commandWaveProductCopy.headline,
  purpose: commandWaveProductCopy.subhead,
  workflow: ["Choose project", "Discuss in chat", "Record decision", "Build PR", "Review", "Log result"],
  publicSurfaces: ["Project chat", "GitHub repo once configured", "Build audit log"],
  firstPhaseLimits: [
    "Start with one public project.",
    "No auto merges, deploys, payments, or live token-weighted authority in this app.",
    "Contribution reports are evidence for humans, not authority.",
  ],
};

export const phaseOneAuthorityBoundary: CommandWaveStateSnapshot["authorityBoundary"] = {
  phase: "first_public_hook_build",
  socialSourceOfTruth: "project chat",
  codeSurface: "GitHub PR",
  humansControl: ["Merges", "Deploys", "Payments", "Governance changes"],
  appDoesNot: [
    "Auto-merge PRs",
    "Deploy contracts",
    "Move funds",
    "Grant reputation, token weight, payouts, permissions, or merge rights from contribution scores",
  ],
  agentLimits: [
    "Agents prepare drafts, packets, PR records, and review evidence.",
    "Reviewer checks are evidence for humans before merge.",
    "Commands touching deployment, governance, payments, upgradeability, or uncapped parameters are blocked or require explicit review.",
  ],
  accessStatus: "Reputation, token, holder, allowlist, and QnA access notes are advisory until wired and verified.",
};

export function createCommandWaveStateSnapshot(
  wave: CommandWave,
  options: { generatedAt?: string } = {},
): CommandWaveStateSnapshot {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const snapshotWithoutHash = {
    version: "command-wave-state-v0.1",
    generatedAt,
    wave,
    waveStateHash: hashValue(wave),
    projectSnapshot: createPublicProjectSnapshot(wave),
    hookSafety: publicHookSafety,
    workflowProof: createPublicWorkflowProof(wave),
    access: createParticipationAccessSnapshot(wave.gates),
    productContract: phaseOneProductContract,
    authorityBoundary: phaseOneAuthorityBoundary,
    agents: {
      orchestrator: orchestratorAgentIdentity,
      reviewer: reviewAgentIdentity,
      githubRepo: githubRepoPlaceholder,
    },
    reports: {
      contribution: createContributionReport(wave, { generatedAt }),
    },
    guardian: {
      envVar: "COMMAND_WAVE_STATE_URL",
      expectedPayload: "command-wave-state-v0.1 snapshot",
    },
  } satisfies Omit<CommandWaveStateSnapshot, "stateHash">;

  return {
    ...snapshotWithoutHash,
    stateHash: createCommandWaveStateHash(snapshotWithoutHash),
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
