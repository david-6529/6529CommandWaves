import {
  commandWaveStateUrlFromEnv,
  phaseOneAuthorityBoundary,
  phaseOneProductContract,
  publicCommandWaveHash,
  type CommandWaveStateSnapshot,
} from "./command-wave-state";
import { orchestratorAgentIdentity, publicGithubRepoPlaceholder, reviewAgentIdentity } from "./agent-identities";
import type { CommandWave } from "./command-waves";
import { createContributionReport, type ContributionReport } from "./contribution-report";
import { createDeveloperFeePlan, type DeveloperFeePlan } from "./developer-fee-plan";
import { hasProductionValue, isPlaceholderValue } from "./env-placeholders";
import { createLaunchAuditHash } from "./launch-audit-hash";
import { createFirstPhaseLaunchAudit } from "./first-phase-launch-audit";
import { createLaunchPacket, type LaunchPacket } from "./launch-packet";
import { createLaunchStatusDraft } from "./launch-status-draft";
import { createParticipationAccessSnapshot } from "./participation-gates";
import { createPhaseChecklist } from "./phase-checklist";
import { selectPhaseWork } from "./phase-work";
import { createPublicCommandWave, createPublicCommandWaveSource } from "./public-command-wave";
import { publicHookSafety } from "./public-hook-safety";
import { createPublicProjectSnapshot } from "./public-project-snapshot";
import { createPublicWorkflowProof } from "./public-workflow-proof";
import { hashValue } from "./run-manifest";
import { validateCommandWaveSetup, validateSetupShape, type SetupValidation } from "./setup-validation";
import { getReadinessChecks, getReadinessSummary, type ReadinessCheck } from "./system/readiness";

export type FirstPhaseLaunchSnapshot = {
  version: "command-wave-launch-audit-v0.1";
  generatedAt: string;
  auditHash: string;
  project: {
    id: string;
    name: string;
    waveUrl: string;
    repoUrl: string | null;
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
    verificationManifestUrl: string;
    setupProofUrl: string;
    projectIndexUrl: string;
    contributionReportUrl: string;
    commandWaveStateUrl: string;
    chatLaunchUrl: string;
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

function hasFailedPublicSetupCheck(setupValidation: SetupValidation) {
  return setupValidation.checks.some((check) => check.status === "fail");
}

function createPublicSetupValidation(setupValidation: SetupValidation, publicSourceWave: CommandWave): SetupValidation {
  if (isPlaceholderValue(publicSourceWave.repoUrl)) {
    const placeholderValidation = validateSetupShape({
      waveUrl: publicSourceWave.waveUrl,
      repoUrl: publicSourceWave.repoUrl,
    });
    const baseCheckIds = new Set(placeholderValidation.checks.map((check) => check.id));
    const waveOnlyRemoteChecks = setupValidation.checks.filter(
      (check) => check.id.startsWith("wave_") && !baseCheckIds.has(check.id),
    );
    const checks = [
      ...placeholderValidation.checks.map((check) =>
        check.id === "repo_format"
          ? {
              ...check,
              message: "GitHub repo is not selected yet.",
            }
          : check,
      ),
      ...waveOnlyRemoteChecks,
    ];

    const publicValidation = {
      ...placeholderValidation,
      repo: null,
      repoMetadata: null,
      repoRequiredFiles: [],
      checks,
      canRunCode: false,
    };

    return {
      ...publicValidation,
      canSave: !hasFailedPublicSetupCheck(publicValidation),
    };
  }

  const repoUrl = setupValidation.repo?.htmlUrl ?? "";

  if (!repoUrl || !isPlaceholderValue(repoUrl)) {
    return setupValidation;
  }

  return {
    ...setupValidation,
    repo: null,
    repoMetadata: null,
    repoRequiredFiles: [],
  };
}

export async function createFirstPhaseLaunchSnapshot(
  wave: CommandWave,
  options: FirstPhaseLaunchSnapshotOptions = {},
): Promise<FirstPhaseLaunchSnapshot> {
  const env = options.env ?? process.env;
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const publicSourceWave = createPublicCommandWaveSource(wave);
  const publicWave = createPublicCommandWave(publicSourceWave);
  const setupValidation =
    options.setupValidation ??
    (await validateCommandWaveSetup(
      {
        waveUrl: publicSourceWave.waveUrl,
        repoUrl: publicSourceWave.repoUrl,
      },
      {
        checkWaveRemote: Boolean(options.checkSetupRemote),
        checkRepoRemote: Boolean(options.checkSetupRemote),
      },
    ));
  const readinessChecks = options.readinessChecks ?? getReadinessChecks(env);
  const phaseChecklist = createPhaseChecklist(publicSourceWave);
  const phaseWork = selectPhaseWork(publicSourceWave);
  const launchPacketProposal = phaseWork.prProposal ?? phaseWork.supportProposals[0] ?? null;
  const launchPacketUsesPrWork = Boolean(
    launchPacketProposal && phaseWork.prProposal && launchPacketProposal.id === phaseWork.prProposal.id,
  );
  const launchPacketPoll = launchPacketUsesPrWork
    ? phaseWork.prPoll
    : launchPacketProposal
      ? publicSourceWave.polls.find((poll) => poll.proposalId === launchPacketProposal.id) ?? null
      : null;
  const launchPacketExecution = launchPacketUsesPrWork
    ? phaseWork.prExecution
    : launchPacketProposal
      ? publicSourceWave.executions.find((execution) => execution.proposalId === launchPacketProposal.id) ?? null
      : null;
  const launchPacketReview = launchPacketUsesPrWork
    ? phaseWork.prReview
    : launchPacketProposal
      ? publicSourceWave.reviews.find((review) => review.proposalId === launchPacketProposal.id) ?? null
      : null;
  const launchAudit = createFirstPhaseLaunchAudit({
    phaseChecklist,
    readinessChecks,
    setupValidation,
    wave: publicSourceWave,
  });
  const commandWaveStateUrl = commandWaveStateUrlFromEnv(env) ?? appRouteUrl("/api/command-wave/state", env);
  const launchAuditPath = options.checkSetupRemote ? "/api/command-wave/launch/audit?remote=1" : "/api/command-wave/launch/audit";
  const chatLaunchPath = options.checkSetupRemote ? "/api/command-wave/launch/chat?remote=1" : "/api/command-wave/launch/chat";
  const verificationTargets = {
    verificationManifestUrl: appRouteUrl("/api/command-wave/verification/manifest", env),
    setupProofUrl: appRouteUrl("/api/command-wave/setup/proof", env),
    projectIndexUrl: appRouteUrl("/api/command-wave/projects", env),
    contributionReportUrl: appRouteUrl("/api/command-wave/reports/contribution", env),
    commandWaveStateUrl,
    chatLaunchUrl: appRouteUrl(chatLaunchPath, env),
    launchAuditUrl: appRouteUrl(launchAuditPath, env),
  };
  const contributionReport = createContributionReport(publicSourceWave, { generatedAt });
  const publicSetupValidation = createPublicSetupValidation(setupValidation, publicSourceWave);
  const snapshotWithoutHash = {
    version: "command-wave-launch-audit-v0.1",
    generatedAt,
    project: {
      id: publicSourceWave.id,
      name: publicSourceWave.name,
      waveUrl: publicSourceWave.waveUrl,
      repoUrl: publicWave.repoUrl,
    },
    setupCheckMode: options.checkSetupRemote ? "remote" : "shape",
    projectSnapshot: createPublicProjectSnapshot(publicSourceWave),
    hookSafety: publicHookSafety,
    workflowProof: createPublicWorkflowProof(publicSourceWave),
    access: createParticipationAccessSnapshot(publicSourceWave.gates),
    productContract: phaseOneProductContract,
    authorityBoundary: phaseOneAuthorityBoundary,
    agents: {
      orchestrator: orchestratorAgentIdentity,
      reviewer: reviewAgentIdentity,
      githubRepo: publicGithubRepoPlaceholder,
    },
    stateEvidence: {
      waveStateHash: publicCommandWaveHash(publicSourceWave),
      rulesHash: hashValue(publicSourceWave.rules),
      proposalCount: publicWave.proposals.length,
      reviewCount: publicWave.reviews.length,
      ledgerEventCount: publicWave.ledger.length,
    },
    verificationTargets,
    setupValidation: publicSetupValidation,
    statusDraft: createLaunchStatusDraft({
      wave: publicSourceWave,
      audit: launchAudit,
      verificationTargets,
    }),
    launchPacket: createLaunchPacket({
      wave: publicSourceWave,
      proposal: launchPacketProposal,
      poll: launchPacketPoll,
      execution: launchPacketExecution,
      review: launchPacketReview,
      verificationTargets,
      generatedAt,
    }),
    reports: {
      contribution: contributionReport,
      developerFee: createDeveloperFeePlan(publicSourceWave, contributionReport),
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
