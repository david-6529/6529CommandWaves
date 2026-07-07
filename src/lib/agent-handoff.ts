import type { CommandProposal, CommandWave, PollState } from "./command-waves";
import { normalizeWaveId } from "./6529/client";
import { createCommandPrManifest } from "./github/pr-reviewer-gate";
import { createCommandRunManifest, hashValue, type CommandRunManifest } from "./run-manifest";
import { findHookContractSignals } from "./safety/hook-contract-policy";
import { hookParameterPolicySummary } from "./safety/hook-parameter-policy";
import type { ToolPermission } from "./safety/tool-policy";

export type AgentHandoffPacket = {
  version: "command-wave-agent-handoff-v0.1";
  harness: "codex";
  waveId: string;
  proposalId: string;
  repoUrl: string;
  baseBranch: string;
  targetBranch: string;
  runManifestHash: string;
  prManifestHash: string | null;
  promptHash: string;
  specHash: string;
  allowedPermissions: ToolPermission[];
  maxRuntimeSeconds: number;
  maxCostUsd: number;
  constraints: string[];
  repoOperations: AgentHandoffRepoOperation[];
  requiredEvidence: string[];
  forbiddenActions: string[];
  packetHash: string;
};

export type AgentHandoffRepoOperation = {
  id: "prepare_branch" | "commit_files" | "open_draft_pr" | "post_review_comment" | "create_check_run";
  label: string;
  adapterMethod: "prepareBranch" | "commitFiles" | "openPullRequest" | "commentOnPullRequest" | "createCheckRun";
  evidence: string;
};

function handoffWithoutHash(packet: Omit<AgentHandoffPacket, "packetHash">) {
  return packet;
}

function contractEvidence(proposal: CommandProposal) {
  const signals = findHookContractSignals({
    proposalText: `${proposal.prompt}\n${proposal.spec}`,
  });

  if (!signals.length) {
    return [];
  }

  return [
    "Changed contract file list.",
    "Contract test output, for example forge test or an equivalent project test command.",
    "Short note explaining explicit parameter caps, governance surfaces, and deployment files touched.",
  ];
}

const repoOperations: AgentHandoffRepoOperation[] = [
  {
    id: "prepare_branch",
    label: "Prepare the target branch from the approved base branch",
    adapterMethod: "prepareBranch",
    evidence: "Branch name, base branch, and base SHA.",
  },
  {
    id: "commit_files",
    label: "Commit bounded text file changes to the target branch",
    adapterMethod: "commitFiles",
    evidence: "Commit SHA and changed file list.",
  },
  {
    id: "open_draft_pr",
    label: "Open a draft PR with the Command Waves manifest",
    adapterMethod: "openPullRequest",
    evidence: "Draft PR URL and head SHA.",
  },
  {
    id: "post_review_comment",
    label: "Post bounded review context after the reviewer result exists",
    adapterMethod: "commentOnPullRequest",
    evidence: "PR comment URL.",
  },
  {
    id: "create_check_run",
    label: "Create or update bounded reviewer check-run state",
    adapterMethod: "createCheckRun",
    evidence: "Check-run URL, status, and conclusion.",
  },
];

export function createAgentHandoffPacket({
  wave,
  proposal,
  poll,
  runManifest = createCommandRunManifest({ wave, proposal }),
  baseBranch = "main",
}: {
  wave: CommandWave;
  proposal: CommandProposal;
  poll: PollState | null;
  runManifest?: CommandRunManifest;
  baseBranch?: string;
}): AgentHandoffPacket {
  const prManifest = proposal.kind === "open_pr" ? createCommandPrManifest({ wave, proposal, poll }) : null;
  const packet = handoffWithoutHash({
    version: "command-wave-agent-handoff-v0.1",
    harness: "codex",
    waveId: normalizeWaveId(wave.waveUrl),
    proposalId: proposal.id,
    repoUrl: wave.repoUrl,
    baseBranch,
    targetBranch: runManifest.targetBranch,
    runManifestHash: runManifest.manifestHash,
    prManifestHash: prManifest ? hashValue(prManifest) : null,
    promptHash: runManifest.promptHash,
    specHash: runManifest.specHash,
    allowedPermissions: runManifest.allowedPermissions,
    maxRuntimeSeconds: runManifest.maxRuntimeSeconds,
    maxCostUsd: runManifest.maxCostUsd,
    constraints: [
      `Work only on target branch ${runManifest.targetBranch}.`,
      "Implement only the approved command and success criteria.",
      "Keep secrets out of prompts, commits, logs, artifacts, and PR bodies.",
      "Open a draft PR only after the branch is prepared.",
      "Leave merges, deploys, payments, and governance changes to humans.",
      ...hookParameterPolicySummary,
    ],
    repoOperations,
    requiredEvidence: [
      "Prepared branch name.",
      "Head commit SHA for the prepared branch.",
      "Changed file list.",
      "Test output or a clear reason tests were not run.",
      "Command Waves PR manifest in the PR body.",
      ...contractEvidence(proposal),
    ],
    forbiddenActions: [
      "Do not merge PRs.",
      "Do not deploy contracts.",
      "Do not spend funds.",
      "Do not change repo settings.",
      "Do not create upgradeable hook contracts by default.",
      "Do not add or change hook parameters unless the approved command names explicit caps and bound-focused evidence.",
      "Do not use proxy, delegatecall, initializer, UUPS, or diamond patterns unless the approved command includes an explicit upgradeability exception.",
    ],
  });

  return {
    ...packet,
    packetHash: hashValue(packet),
  };
}

export function formatAgentHandoffArtifact(packet: AgentHandoffPacket) {
  return `agent-handoff:${JSON.stringify(packet)}`;
}

export function findAgentHandoffArtifact(artifacts: string[]) {
  const rawPacket = artifacts.find((artifact) => artifact.startsWith("agent-handoff:"))?.slice("agent-handoff:".length);

  if (!rawPacket) {
    return null;
  }

  try {
    return JSON.parse(rawPacket) as AgentHandoffPacket;
  } catch {
    return null;
  }
}
