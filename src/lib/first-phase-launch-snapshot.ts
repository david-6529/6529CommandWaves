import {
  commandWaveStateUrlFromEnv,
  phaseOneAuthorityBoundary,
  phaseOneProductContract,
  type CommandWaveStateSnapshot,
} from "./command-wave-state";
import { githubRepoPlaceholder, orchestratorAgentIdentity, reviewAgentIdentity } from "./agent-identities";
import type { CommandWave } from "./command-waves";
import { createContributionReport, type ContributionReport } from "./contribution-report";
import { createDeveloperFeePlan, type DeveloperFeePlan } from "./developer-fee-plan";
import { hasProductionValue } from "./env-placeholders";
import { createLaunchAuditHash } from "./launch-audit-hash";
import { createFirstPhaseLaunchAudit } from "./first-phase-launch-audit";
import { createLaunchPacket, type LaunchPacket } from "./launch-packet";
import { createLaunchStatusDraft } from "./launch-status-draft";
import { createParticipationAccessSnapshot } from "./participation-gates";
import { createPhaseChecklist } from "./phase-checklist";
import { selectPhaseWork } from "./phase-work";
import { publicHookSafety } from "./public-hook-safety";
import { createPublicProjectSnapshot } from "./public-project-snapshot";
import { createPublicWorkflowProof } from "./public-workflow-proof";
import { hashValue } from "./run-manifest";
import { validateCommandWaveSetup, type SetupValidation } from "./setup-validation";
import { getReadinessChecks, getReadinessSummary, type ReadinessCheck } from "./system/readiness";

export type FirstPhaseLaunchSnapshot = {
  version: "command-wave-launch-audit-v0.1";
  generatedAt: string;
  auditHash: string;
  project: {
    id: string;
    name: string;
    waveUrl: string;
    repoUrl: string;
  };
  setupCheckMode: "shape" | "remote";
  projectSnapshot: CommandWaveStateSnapshot["projectSnapshot"];
  hookSafety: CommandWaveStateSnapshot["hookSafety"];
  workflowProof: CommandWaveStateSnapshot["workflowProof"];
  access: CommandWaveStateSnapshot["access"];
  productContract: CommandWaveStateSnapshot["productContract"];
  authorityBoundary: CommandWaveStateSnapshot["authorityBoundary"];
  agents: CommandWaveStateSnapshot["agents"];
  stateEvidence: {
    waveStateHash: string;
    rulesHash: string;
    proposalCount: number;
    reviewCount: number;
    ledgerEventCount: number;
  };
  verificationTargets: {
    setupProofUrl: string;
    commandWaveStateUrl: string;
    launchAuditUrl: string;
  };
  setupValidation: SetupValidation;
  statusDraft: string;
  launchPacket: LaunchPacket;
  reports: {
    contribution: ContributionReport;
    developerFee: DeveloperFeePlan;
  };
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
  const appUrl = hasProductionValue(env.NEXT_PUBLIC_APP_URL, env)
    ? env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "")
    : "";

  return appUrl ? `${appUrl}${path}` : path;
}

export async function createFirstPhaseLaunchSnapshot(
  wave: CommandWave,
  options: FirstPhaseLaunchSnapshotOptions = {},
): Promise<FirstPhaseLaunchSnapshot> {
  const env = options.env ?? process.env;
  const generatedAt = options.generatedAt ?? new Date().toISOString();
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
  const phaseWork = selectPhaseWork(wave);
  const launchPacketProposal = phaseWork.prProposal ?? phaseWork.supportProposals[0] ?? null;
  const launchPacketUsesPrWork = Boolean(
    launchPacketProposal && phaseWork.prProposal && launchPacketProposal.id === phaseWork.prProposal.id,
  );
  const launchPacketPoll = launchPacketUsesPrWork
    ? phaseWork.prPoll
    : launchPacketProposal
      ? wave.polls.find((poll) => poll.proposalId === launchPacketProposal.id) ?? null
      : null;
  const launchPacketExecution = launchPacketUsesPrWork
    ? phaseWork.prExecution
    : launchPacketProposal
      ? wave.executions.find((execution) => execution.proposalId === launchPacketProposal.id) ?? null
      : null;
  const launchPacketReview = launchPacketUsesPrWork
    ? phaseWork.prReview
    : launchPacketProposal
      ? wave.reviews.find((review) => review.proposalId === launchPacketProposal.id) ?? null
      : null;
  const launchAudit = createFirstPhaseLaunchAudit({
    phaseChecklist,
    readinessChecks,
    setupValidation,
    wave,
  });
  const commandWaveStateUrl = commandWaveStateUrlFromEnv(env) ?? appRouteUrl("/api/command-wave/state", env);
  const launchAuditPath = options.checkSetupRemote ? "/api/command-wave/launch/audit?remote=1" : "/api/command-wave/launch/audit";
  const verificationTargets = {
    setupProofUrl: appRouteUrl("/api/command-wave/setup/proof", env),
    commandWaveStateUrl,
    launchAuditUrl: appRouteUrl(launchAuditPath, env),
  };
  const contributionReport = createContributionReport(wave, { generatedAt });
  const snapshotWithoutHash = {
    version: "command-wave-launch-audit-v0.1",
    generatedAt,
    project: {
      id: wave.id,
      name: wave.name,
      waveUrl: wave.waveUrl,
      repoUrl: wave.repoUrl,
    },
    setupCheckMode: options.checkSetupRemote ? "remote" : "shape",
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
    stateEvidence: {
      waveStateHash: hashValue(wave),
      rulesHash: hashValue(wave.rules),
      proposalCount: wave.proposals.length,
      reviewCount: wave.reviews.length,
      ledgerEventCount: wave.ledger.length,
    },
    verificationTargets,
    setupValidation,
    statusDraft: createLaunchStatusDraft({
      wave,
      audit: launchAudit,
      verificationTargets,
    }),
    launchPacket: createLaunchPacket({
      wave,
      proposal: launchPacketProposal,
      poll: launchPacketPoll,
      execution: launchPacketExecution,
      review: launchPacketReview,
      verificationTargets,
      generatedAt,
    }),
    reports: {
      contribution: contributionReport,
      developerFee: createDeveloperFeePlan(wave, contributionReport),
    },
    readiness: {
      summary: getReadinessSummary(readinessChecks),
      checks: readinessChecks,
    },
    phaseChecklist,
    launchAudit,
  } satisfies Omit<FirstPhaseLaunchSnapshot, "auditHash">;

  return {
    ...snapshotWithoutHash,
    auditHash: createLaunchAuditHash(snapshotWithoutHash),
  };
}
