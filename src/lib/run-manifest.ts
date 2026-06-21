import { createHash } from "node:crypto";
import type { CommandProposal, CommandWave } from "./command-waves";
import { commandBranchName } from "./github/repo";
import { toolPolicyForProposal, type ToolPermission } from "./safety/tool-policy";

export type CommandRunManifest = {
  proposalId: string;
  commandKind: CommandProposal["kind"];
  risk: CommandProposal["risk"];
  rulesVersion: string;
  rulesHash: string;
  allowedPermissions: ToolPermission[];
  requiresReview: boolean;
  budgetUsd: number;
  promptHash: string;
  specHash: string;
  targetBranch: string;
  maxRuntimeSeconds: number;
  maxCostUsd: number;
  manifestHash: string;
};

function hashValue(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function withoutManifestHash(manifest: Omit<CommandRunManifest, "manifestHash">) {
  return manifest;
}

export function createCommandRunManifest({
  wave,
  proposal,
  maxRuntimeSeconds = 900,
}: {
  wave: CommandWave;
  proposal: CommandProposal;
  maxRuntimeSeconds?: number;
}): CommandRunManifest {
  const policy = toolPolicyForProposal(proposal);
  const manifest = withoutManifestHash({
    proposalId: proposal.id,
    commandKind: proposal.kind,
    risk: proposal.risk,
    rulesVersion: wave.rules.version,
    rulesHash: hashValue(wave.rules),
    allowedPermissions: policy.permissions,
    requiresReview: policy.requiresGuardian,
    budgetUsd: proposal.budgetUsd,
    promptHash: hashValue(proposal.prompt),
    specHash: hashValue(proposal.spec),
    targetBranch: proposal.kind === "open_pr" ? commandBranchName(proposal.id, proposal.title) : "none",
    maxRuntimeSeconds,
    maxCostUsd: proposal.budgetUsd,
  });

  return {
    ...manifest,
    manifestHash: hashValue(manifest),
  };
}

export function formatRunManifestArtifact(manifest: CommandRunManifest) {
  return `run-manifest:${JSON.stringify(manifest)}`;
}

export function findRunManifestArtifact(artifacts: string[]) {
  const rawManifest = artifacts.find((artifact) => artifact.startsWith("run-manifest:"))?.slice("run-manifest:".length);

  if (!rawManifest) {
    return null;
  }

  try {
    return JSON.parse(rawManifest) as CommandRunManifest;
  } catch {
    return null;
  }
}
