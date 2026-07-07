import { publicGithubRepoPlaceholder } from "./agent-identities";
import { createChatLaunchSnapshot } from "./chat-launch-snapshot";
import { createCommandWaveStateSnapshot } from "./command-wave-state";
import type { CommandWave } from "./command-waves";
import { createFirstPhaseLaunchSnapshot } from "./first-phase-launch-snapshot";
import { createHookProjectIndex } from "./hook-project-index";
import { hashValue } from "./run-manifest";
import { createSetupProof, setupProofOptionsFromEnv } from "./setup-proof";

type VerificationEndpoint = {
  id: "verification_manifest" | "setup_proof" | "command_wave_state" | "project_index" | "launch_audit" | "chat_launch";
  label: string;
  url: string;
  payloadVersion: string;
  requiredHashFields: string[];
  hashes: {
    stable?: string;
    generated?: string;
    source?: string;
  };
  verifierCommand: string | null;
  note: string;
};

export type PublicVerificationManifest = {
  version: "command-wave-verification-manifest-v0.1";
  generatedAt: string;
  project: {
    id: string;
    name: string;
    waveUrl: string;
    repoStatus: "placeholder" | "configured";
  };
  stableAnchors: {
    waveStateHash: string;
    rulesHash: string;
    setupHash: string;
    projectIndexHash: string;
    proposalCount: number;
    reviewCount: number;
    ledgerEventCount: number;
  };
  endpoints: VerificationEndpoint[];
  agents: {
    orchestrator: {
      handle: string;
      status: string;
    };
    reviewer: {
      status: string;
    };
    githubRepo: typeof publicGithubRepoPlaceholder;
  };
  authority: {
    sourceOfTruth: "project chat";
    codeSurface: "GitHub PR";
    humansControl: string[];
  };
  manifestHash: string;
};

type PublicVerificationManifestOptions = {
  generatedAt?: string;
  env?: Record<string, string | undefined>;
};

export function publicVerificationManifestHashInput(manifest: PublicVerificationManifest) {
  return Object.fromEntries(Object.entries(manifest).filter(([key]) => key !== "manifestHash"));
}

export async function createPublicVerificationManifest(
  wave: CommandWave,
  options: PublicVerificationManifestOptions = {},
): Promise<PublicVerificationManifest> {
  const env = options.env ?? process.env;
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const launchSnapshot = await createFirstPhaseLaunchSnapshot(wave, {
    generatedAt,
    env,
  });
  const chatLaunchSnapshot = createChatLaunchSnapshot(launchSnapshot);
  const stateSnapshot = createCommandWaveStateSnapshot(wave, { generatedAt });
  const projectIndex = createHookProjectIndex(wave, { generatedAt });
  const setupProof = createSetupProof(wave, {
    ...setupProofOptionsFromEnv(env),
    generatedAt,
    commandWaveStateUrl: launchSnapshot.verificationTargets.commandWaveStateUrl,
  });
  const repoStatus = stateSnapshot.projectSnapshot.repo.status === "configured" ? "configured" : "placeholder";
  const manifestWithoutHash = {
    version: "command-wave-verification-manifest-v0.1",
    generatedAt,
    project: {
      id: wave.id,
      name: wave.name,
      waveUrl: wave.waveUrl,
      repoStatus,
    },
    stableAnchors: {
      waveStateHash: stateSnapshot.waveStateHash,
      rulesHash: launchSnapshot.stateEvidence.rulesHash,
      setupHash: setupProof.setupHash,
      projectIndexHash: projectIndex.projectsHash,
      proposalCount: launchSnapshot.stateEvidence.proposalCount,
      reviewCount: launchSnapshot.stateEvidence.reviewCount,
      ledgerEventCount: launchSnapshot.stateEvidence.ledgerEventCount,
    },
    endpoints: [
      {
        id: "verification_manifest",
        label: "Verification manifest",
        url: launchSnapshot.verificationTargets.verificationManifestUrl,
        payloadVersion: "command-wave-verification-manifest-v0.1",
        requiredHashFields: ["manifestHash"],
        hashes: {},
        verifierCommand: null,
        note: "manifestHash is the top-level hash for this verification manifest.",
      },
      {
        id: "setup_proof",
        label: "Setup proof",
        url: launchSnapshot.verificationTargets.setupProofUrl,
        payloadVersion: setupProof.version,
        requiredHashFields: ["setupHash", "attestationHash"],
        hashes: {
          stable: setupProof.setupHash,
          generated: setupProof.attestationHash,
        },
        verifierCommand: "npm run setup:verify",
        note: "setupHash is stable across generatedAt changes.",
      },
      {
        id: "command_wave_state",
        label: "Command-wave state",
        url: launchSnapshot.verificationTargets.commandWaveStateUrl,
        payloadVersion: stateSnapshot.version,
        requiredHashFields: ["waveStateHash", "stateHash"],
        hashes: {
          stable: stateSnapshot.waveStateHash,
          generated: stateSnapshot.stateHash,
        },
        verifierCommand: null,
        note: "waveStateHash is the stable current project-state anchor.",
      },
      {
        id: "project_index",
        label: "Project index",
        url: launchSnapshot.verificationTargets.projectIndexUrl,
        payloadVersion: projectIndex.version,
        requiredHashFields: ["projectsHash"],
        hashes: {
          stable: projectIndex.projectsHash,
        },
        verifierCommand: null,
        note: "projectsHash is stable across generatedAt changes.",
      },
      {
        id: "launch_audit",
        label: "Launch audit",
        url: launchSnapshot.verificationTargets.launchAuditUrl,
        payloadVersion: launchSnapshot.version,
        requiredHashFields: ["auditHash"],
        hashes: {
          generated: launchSnapshot.auditHash,
        },
        verifierCommand: "npm run launch:audit",
        note: "auditHash verifies the generated launch-audit payload.",
      },
      {
        id: "chat_launch",
        label: "Chat launch audit",
        url: launchSnapshot.verificationTargets.chatLaunchUrl,
        payloadVersion: chatLaunchSnapshot.version,
        requiredHashFields: ["chatLaunchHash", "sourceAuditHash"],
        hashes: {
          generated: chatLaunchSnapshot.chatLaunchHash,
          source: chatLaunchSnapshot.sourceAuditHash,
        },
        verifierCommand: "npm run chat:launch",
        note: "chatLaunchHash verifies the generated chat-launch payload.",
      },
    ],
    agents: {
      orchestrator: {
        handle: stateSnapshot.agents.orchestrator.handle,
        status: stateSnapshot.agents.orchestrator.status,
      },
      reviewer: {
        status: stateSnapshot.agents.reviewer.status,
      },
      githubRepo: stateSnapshot.agents.githubRepo,
    },
    authority: {
      sourceOfTruth: stateSnapshot.authorityBoundary.socialSourceOfTruth,
      codeSurface: stateSnapshot.authorityBoundary.codeSurface,
      humansControl: stateSnapshot.authorityBoundary.humansControl,
    },
  } satisfies Omit<PublicVerificationManifest, "manifestHash">;

  return {
    ...manifestWithoutHash,
    manifestHash: hashValue(manifestWithoutHash),
  };
}
