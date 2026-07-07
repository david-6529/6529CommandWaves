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
import { createCodexWorkPacket } from "./codex-work-packet";
import {
  createExecutionFileManifest,
  executionFileManifestHashMatches,
  findExecutionFileManifestArtifact,
  formatExecutionFileManifestArtifact,
} from "./execution-files";
import {
  createCommandPrManifest,
  createGuardianAttestation,
  formatCommandPrManifestForPullRequest,
} from "./github/pr-reviewer-gate";
import { configuredGitHubRepo } from "./github/pr-evidence";
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
  async prepareBranch(input) {
    const baseBranch = input.baseBranch ?? "main";
    const stable = stableNumber(`${input.repoUrl}:${baseBranch}:${input.branchName}`);

    return {
      branchName: input.branchName,
      baseBranch,
      baseSha: `local-${stable.toString(16)}`,
      ref: `refs/heads/${input.branchName}`,
      url: `${input.repoUrl.replace(/\/$/, "")}/tree/${input.branchName}`,
    };
  },
  async commitFiles(input) {
    const stable = stableNumber(
      `${input.repoUrl}:${input.branchName}:${input.message}:${input.files.map((file) => `${file.path}:${file.content}`).join("|")}`,
    );

    return {
      branchName: input.branchName,
      commitSha: `local-${stable.toString(16)}`,
      url: `${input.repoUrl.replace(/\/$/, "")}/commit/local-${stable.toString(16)}`,
      changedPaths: input.files.map((file) => file.path),
    };
  },
  async openPullRequest(input) {
    const stable = stableNumber(`${input.repoUrl}:${input.branchName}:${input.title}`);
    const prNumber = stable % 1000;

    return {
      prNumber,
      url: pullRequestUrl(input.repoUrl, prNumber) ?? `${input.repoUrl.replace(/\/$/, "")}/pull/${prNumber}`,
      headSha: `local-${stable.toString(16)}`,
    };
  },
  async commentOnPullRequest(input) {
    const stable = stableNumber(`${input.repoUrl}:${input.prNumber}:${input.body}`);

    return {
      id: `local-comment-${stable}`,
      url: `${input.repoUrl.replace(/\/$/, "")}/pull/${input.prNumber}#issuecomment-${stable}`,
    };
  },
  async createCheckRun(input) {
    const stable = stableNumber(`${input.repoUrl}:${input.name}:${input.headSha}:${input.summary}`);

    return {
      id: `local-check-${stable}`,
      url: `${input.repoUrl.replace(/\/$/, "")}/checks/${stable}`,
      status: input.status ?? (input.conclusion ? "completed" : "in_progress"),
      conclusion: input.conclusion ?? null,
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

function assertRepoMethod<T>(method: T | undefined, label: string): T {
  if (!method) {
    throw Object.assign(new Error(`Repo adapter must support ${label} for PR work.`), { status: 503 });
  }

  return method;
}

function codexPacketPath(proposalId: string) {
  return `.command-waves/commands/${proposalId}.md`;
}

function changedPathsFromExecutionArtifacts(artifacts: string[]) {
  const paths = artifacts
    .filter((artifact) => artifact.startsWith("changed "))
    .flatMap((artifact) => artifact.slice("changed ".length).split(","))
    .map((path) => path.trim())
    .filter(Boolean);

  return [...new Set(paths)].sort((left, right) => left.localeCompare(right));
}

function approvedFilePathsFromArtifacts(artifacts: string[]) {
  return artifacts
    .filter((artifact) => artifact.startsWith("approved file "))
    .map((artifact) => artifact.slice("approved file ".length).trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function approvedFileCountLabel(count: number) {
  return `${count} approved file${count === 1 ? "" : "s"}`;
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
      const codexPacket =
        input.proposal.kind === "open_pr"
          ? createCodexWorkPacket({
              wave: input.wave,
              proposal: input.proposal,
              poll: input.poll,
              runManifest: manifest,
              baseBranch,
            })
          : null;
      const approvedFiles = input.files ?? [];
      const approvedFileManifest = approvedFiles.length
        ? createExecutionFileManifest(input.proposal.id, approvedFiles)
        : null;
      const wavePost = [
        formatProposalForWave(input.proposal, input.poll),
        ...(prManifest ? ["", formatCommandPrManifestForPullRequest(prManifest)] : []),
      ].join("\n");
      const branch =
        input.proposal.kind === "open_pr"
          ? await assertRepoMethod(repoAdapter.prepareBranch, "prepareBranch")({
              repoUrl: input.wave.repoUrl,
              branchName: manifest.targetBranch,
              baseBranch,
            })
          : null;
      const packetFilePath = input.proposal.kind === "open_pr" ? codexPacketPath(input.proposal.id) : null;
      const commitFiles =
        input.proposal.kind === "open_pr" && codexPacket && packetFilePath
          ? [
              {
                path: packetFilePath,
                content: `${codexPacket.text}\n`,
              },
              ...approvedFiles,
            ]
          : [];
      const commit =
        input.proposal.kind === "open_pr" && codexPacket && packetFilePath
          ? await assertRepoMethod(repoAdapter.commitFiles, "commitFiles")({
              repoUrl: input.wave.repoUrl,
              branchName: manifest.targetBranch,
              message: `Add Command Waves work packet for ${input.proposal.id}`,
              files: commitFiles,
            })
          : null;
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
            ? "Agent adapter prepared a branch with the Codex work packet and opened a draft PR record."
            : "Agent adapter recorded the approved command without external side effects.",
        artifacts: [
          formatRunManifestArtifact(manifest),
          ...(handoff ? [formatAgentHandoffArtifact(handoff), "Codex handoff packet recorded"] : []),
          ...(branch
            ? [
                `prepared branch ${branch.branchName}`,
                `base ${branch.baseBranch}`,
                `base sha ${branch.baseSha}`,
                ...(branch.url ? [branch.url] : []),
              ]
            : []),
          ...(commit
            ? [
                `packet path ${packetFilePath}`,
                ...approvedFiles.map((file) => `approved file ${file.path}`),
                ...(approvedFileManifest ? [formatExecutionFileManifestArtifact(approvedFileManifest)] : []),
                `packet commit ${commit.commitSha}`,
                `packet hash ${codexPacket?.packetHash}`,
                commit.url,
                `changed ${commit.changedPaths.join(", ")}`,
              ]
            : []),
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
    const repository = configuredGitHubRepo(input.wave.repoUrl);
    const actualHandoff = findAgentHandoffArtifact(input.execution.artifacts);
    const changedPaths = changedPathsFromExecutionArtifacts(input.execution.artifacts);
    const approvedFilePaths = approvedFilePathsFromArtifacts(input.execution.artifacts);
    const approvedFileManifest = findExecutionFileManifestArtifact(input.execution.artifacts);
    const approvedFileManifestPaths = approvedFileManifest?.files.map((file) => file.path).sort((left, right) => left.localeCompare(right)) ?? [];
    const approvedFileManifestMatches =
      approvedFilePaths.length === 0 ||
      Boolean(
        approvedFileManifest &&
          approvedFileManifest.proposalId === input.proposal.id &&
          approvedFileManifest.fileCount === approvedFilePaths.length &&
          JSON.stringify(approvedFileManifestPaths) === JSON.stringify(approvedFilePaths) &&
          executionFileManifestHashMatches(approvedFileManifest),
      );
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
    const hookSignals = findHookContractSignals({ changedPaths, proposalText });
    const hookParameterChecks = evaluateHookParameterPolicy({
      proposalText,
      changedPaths,
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
            changedPaths,
            ...(repository ? { repository } : {}),
          })
        : null;
    const failedGateChecks = attestation?.result.checks.filter((item) => item.status === "fail") ?? [];
    const guardianGatePassed = !attestation || attestation.result.status === "pass";
    const needsChanges =
      touchesDangerousSurface ||
      !manifestMatches ||
      !handoffMatches ||
      !approvedFileManifestMatches ||
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
        approvedFilePaths.length
          ? approvedFileManifestMatches
            ? `Approved file manifest hashes ${approvedFileCountLabel(approvedFilePaths.length)}.`
            : "Approved file manifest is missing or does not match approved file paths."
          : "No approved file manifest required.",
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
        ? "Reviewer adapter requested changes because the run evidence did not fully match the approved command."
        : "Reviewer adapter passed the execution against the approved proposal and current rules.",
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
