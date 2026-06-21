import {
  formatExecutionForWave,
  formatGuardianReviewForWave,
  formatProposalForWave,
  type GuardianAdapter,
  type OrchestratorAdapter,
  type RepoAdapter,
  type WaveAdapter,
} from "./adapters";
import type { ExecutionRecord, GuardianReview, LedgerEvent } from "./command-waves";
import { createCommandPrManifest, createGuardianAttestation } from "./github/pr-reviewer-gate";
import { pullRequestUrl } from "./github/repo";
import { createCommandRunManifest, findRunManifestArtifact, formatRunManifestArtifact } from "./run-manifest";
import { findDangerousPromptFlags, toolPolicyForProposal } from "./safety/tool-policy";

function stableNumber(value: string) {
  return [...value].reduce((total, char) => total + char.charCodeAt(0), 0);
}

export const localWaveAdapter: WaveAdapter = {
  async post(input) {
    return {
      dropId: `local-drop-${stableNumber(input.body)}`,
      url: `${input.waveUrl.replace(/\/$/, "")}?localDrop=${stableNumber(input.body)}`,
    };
  },
};

export const localRepoAdapter: RepoAdapter = {
  async openPullRequest(input) {
    const stable = stableNumber(`${input.repoUrl}:${input.branchName}:${input.title}`);
    const prNumber = stable % 1000;

    return {
      prNumber,
      url: pullRequestUrl(input.repoUrl, prNumber) ?? `${input.repoUrl.replace(/\/$/, "")}/pull/${prNumber}`,
      headSha: `local-${stable.toString(16)}`,
    };
  },
};

export const localOrchestratorAdapter: OrchestratorAdapter = {
  async execute(input): Promise<ExecutionRecord> {
    const manifest = createCommandRunManifest(input);
    const wavePost = formatProposalForWave(input.proposal, input.poll);
    const pr =
      input.proposal.kind === "open_pr"
        ? await localRepoAdapter.openPullRequest({
            repoUrl: input.wave.repoUrl,
            title: input.proposal.title,
            body: wavePost,
            branchName: manifest.targetBranch,
          })
        : null;

    return {
      proposalId: input.proposal.id,
      harness: input.proposal.kind === "open_pr" ? "codex" : "manual",
      status: "complete",
      summary:
        input.proposal.kind === "open_pr"
          ? "Local AI worker mock opened a deterministic PR artifact for the approved command."
          : "Local AI worker mock recorded the approved command without external side effects.",
      artifacts: [
        formatRunManifestArtifact(manifest),
        "approved prompt snapshot",
        `rules ${manifest.rulesVersion}/${manifest.rulesHash}`,
        `permissions ${manifest.allowedPermissions.join(", ")}`,
        `budget cap $${manifest.maxCostUsd}`,
        ...(pr ? [`PR #${pr.prNumber}`, pr.url, `head ${pr.headSha}`] : ["no external PR for this command type"]),
      ],
    };
  },
};

export const localGuardianAdapter: GuardianAdapter = {
  async review(input): Promise<GuardianReview> {
    const policy = toolPolicyForProposal(input.proposal);
    const expectedManifest = createCommandRunManifest(input);
    const actualManifest = findRunManifestArtifact(input.execution.artifacts);
    const manifestMatches = actualManifest?.manifestHash === expectedManifest.manifestHash;
    const dangerousFlags = findDangerousPromptFlags(`${input.proposal.prompt}\n${input.proposal.spec}`);
    const touchesDangerousSurface = dangerousFlags.length > 0;
    const needsChanges = touchesDangerousSurface || !manifestMatches;
    const poll = input.wave.polls.find((item) => item.proposalId === input.proposal.id) ?? null;
    const attestation =
      input.proposal.kind === "open_pr"
        ? createGuardianAttestation({
            wave: input.wave,
            proposal: input.proposal,
            poll,
            manifest: createCommandPrManifest({ wave: input.wave, proposal: input.proposal, poll }),
            changedPaths: [],
          })
        : null;

    return {
      proposalId: input.proposal.id,
      status: needsChanges ? "changes_requested" : "pass",
      checks: [
        "Execution is linked to an approved proposal.",
        "Execution artifacts are present.",
        manifestMatches
          ? "Run manifest matches approved command, rules hash, permissions, and budget."
          : "Run manifest is missing or does not match the approved command.",
        `Allowed permissions: ${policy.permissions.join(", ")}.`,
        touchesDangerousSurface
          ? `Dangerous surface mentioned (${dangerousFlags.join(", ")}); human review required before completion.`
          : "No deploy, spending, private-key, or rule-change language detected.",
        ...(attestation ? [`Guardian attestation hash: ${attestation.attestationHash}.`] : []),
      ],
      summary: needsChanges
        ? "Reviewer mock requested changes because the run evidence did not fully match the approved command."
        : "Reviewer mock passed the execution against the approved proposal and current rules.",
      proof: attestation
        ? {
            version: attestation.version,
            verifier: attestation.verifier.name,
            verifierVersion: attestation.verifier.version,
            mode: attestation.verifier.mode,
            inputs: attestation.inputs,
            resultHash: attestation.resultHash,
            attestationHash: attestation.attestationHash,
          }
        : undefined,
    };
  },
};

export function localLedgerEvent(count: number, event: Omit<LedgerEvent, "id" | "at">): LedgerEvent {
  return {
    ...event,
    id: `evt-${String(count + 1).padStart(3, "0")}`,
    at: new Date().toISOString(),
  };
}

export { formatExecutionForWave, formatGuardianReviewForWave, formatProposalForWave };
