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
import { createAgentHandoffPacket, findAgentHandoffArtifact, formatAgentHandoffArtifact } from "./agent-handoff";
import {
  createCommandPrManifest,
  createGuardianAttestation,
  formatCommandPrManifestForPullRequest,
} from "./github/pr-reviewer-gate";
import { pullRequestUrl } from "./github/repo";
import { createCommandRunManifest, findRunManifestArtifact, formatRunManifestArtifact, hashValue } from "./run-manifest";
import {
  findHookContractSignals,
  proposalAllowsUpgradeabilityException,
  riskAllowsHookContractSignal,
} from "./safety/hook-contract-policy";
import { evaluateHookParameterPolicy } from "./safety/hook-parameter-policy";
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

export type LocalOrchestratorOptions = {
  repoAdapter?: RepoAdapter;
  baseBranch?: string;
};

function isRepoAdapter(value: RepoAdapter | LocalOrchestratorOptions): value is RepoAdapter {
  return typeof (value as RepoAdapter).openPullRequest === "function";
}

function agentHandoffHashMatches(packet: ReturnType<typeof findAgentHandoffArtifact>) {
  if (!packet) {
    return false;
  }

  const { packetHash, ...packetWithoutHash } = packet;

  return hashValue(packetWithoutHash) === packetHash;
}

export function createLocalOrchestratorAdapter(
  repoAdapterOrOptions: RepoAdapter | LocalOrchestratorOptions = localRepoAdapter,
): OrchestratorAdapter {
  const repoAdapter = isRepoAdapter(repoAdapterOrOptions)
    ? repoAdapterOrOptions
    : (repoAdapterOrOptions.repoAdapter ?? localRepoAdapter);
  const baseBranch = isRepoAdapter(repoAdapterOrOptions) ? "main" : (repoAdapterOrOptions.baseBranch ?? "main");

  return {
    async execute(input): Promise<ExecutionRecord> {
      const manifest = createCommandRunManifest(input);
      const prManifest =
        input.proposal.kind === "open_pr"
          ? createCommandPrManifest({ wave: input.wave, proposal: input.proposal, poll: input.poll })
          : null;
      const handoff =
        input.proposal.kind === "open_pr"
          ? createAgentHandoffPacket({
              wave: input.wave,
              proposal: input.proposal,
              poll: input.poll,
              runManifest: manifest,
              baseBranch,
            })
          : null;
      const wavePost = [
        formatProposalForWave(input.proposal, input.poll),
        ...(prManifest ? ["", formatCommandPrManifestForPullRequest(prManifest)] : []),
      ].join("\n");
      const pr =
        input.proposal.kind === "open_pr"
          ? await repoAdapter.openPullRequest({
              repoUrl: input.wave.repoUrl,
              title: input.proposal.title,
              body: wavePost,
              branchName: manifest.targetBranch,
              baseBranch,
              draft: true,
            })
          : null;

      return {
        proposalId: input.proposal.id,
        harness: input.proposal.kind === "open_pr" ? "codex" : "manual",
        status: "complete",
        summary:
          input.proposal.kind === "open_pr"
            ? "Local agent mock opened a deterministic PR artifact for the approved command."
            : "Local agent mock recorded the approved command without external side effects.",
        artifacts: [
          formatRunManifestArtifact(manifest),
          ...(handoff ? [formatAgentHandoffArtifact(handoff), "Codex handoff packet recorded"] : []),
          "approved prompt snapshot",
          `rules ${manifest.rulesVersion}/${manifest.rulesHash}`,
          `permissions ${manifest.allowedPermissions.join(", ")}`,
          `budget cap $${manifest.maxCostUsd}`,
          ...(prManifest ? ["PR body includes Command Waves manifest"] : []),
          ...(pr ? [`PR #${pr.prNumber}`, pr.url, `head ${pr.headSha}`] : ["no external PR for this command type"]),
        ],
      };
    },
  };
}

export const localOrchestratorAdapter: OrchestratorAdapter = createLocalOrchestratorAdapter();

export const localGuardianAdapter: GuardianAdapter = {
  async review(input): Promise<GuardianReview> {
    const policy = toolPolicyForProposal(input.proposal);
    const expectedManifest = createCommandRunManifest(input);
    const actualManifest = findRunManifestArtifact(input.execution.artifacts);
    const manifestMatches = actualManifest?.manifestHash === expectedManifest.manifestHash;
    const poll = input.wave.polls.find((item) => item.proposalId === input.proposal.id) ?? null;
    const actualHandoff = findAgentHandoffArtifact(input.execution.artifacts);
    const expectedHandoff =
      input.proposal.kind === "open_pr"
        ? createAgentHandoffPacket({
            wave: input.wave,
            proposal: input.proposal,
            poll,
            runManifest: expectedManifest,
            baseBranch: actualHandoff?.baseBranch ?? "main",
          })
        : null;
    const actualHandoffHashMatches = agentHandoffHashMatches(actualHandoff);
    const handoffMatches =
      !expectedHandoff ||
      Boolean(
        actualHandoff &&
          actualHandoffHashMatches &&
          actualHandoff.packetHash === expectedHandoff.packetHash &&
          actualHandoff.runManifestHash === expectedManifest.manifestHash &&
          actualHandoff.targetBranch === expectedManifest.targetBranch &&
          JSON.stringify(actualHandoff.allowedPermissions) === JSON.stringify(policy.permissions),
      );
    const proposalText = `${input.proposal.prompt}\n${input.proposal.spec}`;
    const dangerousFlags = findDangerousPromptFlags(proposalText);
    const touchesDangerousSurface = dangerousFlags.length > 0;
    const hookSignals = findHookContractSignals({ proposalText });
    const hookParameterChecks = evaluateHookParameterPolicy({
      proposalText,
      hookSignals,
    });
    const upgradeabilityExceptionApproved = proposalAllowsUpgradeabilityException(proposalText);
    const blockedHookSignals = hookSignals.filter(
      (signal) =>
        !riskAllowsHookContractSignal({
          risk: input.proposal.risk,
          signal,
          upgradeabilityExceptionApproved,
        }),
    );
    const blockedParameterChecks = hookParameterChecks.filter((item) => item.status === "fail");
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
    const failedGateChecks = attestation?.result.checks.filter((item) => item.status === "fail") ?? [];
    const guardianGatePassed = !attestation || attestation.result.status === "pass";
    const needsChanges =
      touchesDangerousSurface ||
      !manifestMatches ||
      !handoffMatches ||
      !guardianGatePassed ||
      blockedHookSignals.length > 0 ||
      blockedParameterChecks.length > 0;

    return {
      proposalId: input.proposal.id,
      status: needsChanges ? "changes_requested" : "pass",
      checks: [
        "Execution is linked to an approved proposal.",
        "Execution artifacts are present.",
        manifestMatches
          ? "Run manifest matches approved command, rules hash, permissions, and budget."
          : "Run manifest is missing or does not match the approved command.",
        expectedHandoff
          ? handoffMatches
            ? "Codex handoff packet matches the run manifest, target branch, permissions, and budget."
            : actualHandoff
              ? "Codex handoff packet does not match the approved run manifest."
              : "Codex handoff packet is missing for this PR command."
          : "No Codex handoff required for this command type.",
        `Allowed permissions: ${policy.permissions.join(", ")}.`,
        touchesDangerousSurface
          ? `Dangerous surface mentioned (${dangerousFlags.join(", ")}); human review required before completion.`
          : "No deploy, spending, private-key, or rule-change language detected.",
        hookSignals.length
          ? `Hook contract signals checked: ${hookSignals.map((signal) => signal.label.replaceAll("_", " ")).join(", ")}.`
          : "No hook contract risk signals found in the command text.",
        blockedHookSignals.length
          ? `Blocked hook signals: ${blockedHookSignals.map((signal) => signal.label.replaceAll("_", " ")).join(", ")}.`
          : "Hook contract signals fit the approved risk level.",
        ...hookParameterChecks.map((item) => item.message),
        ...(attestation
          ? [
              guardianGatePassed
                ? "Guardian PR gate passed."
                : `Guardian PR gate failed: ${failedGateChecks.map((item) => item.id).join(", ") || "unknown check"}.`,
            ]
          : []),
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
