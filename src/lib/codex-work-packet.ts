import { pollApprovalPassedForWave, type CommandProposal, type CommandWave, type PollState } from "./command-waves";
import { createAgentHandoffPacket } from "./agent-handoff";
import {
  createCommandPrManifest,
  formatCommandPrManifestForPullRequest,
} from "./github/pr-reviewer-gate";
import { configuredGitHubRepo } from "./github/pr-evidence";
import { createCommandRunManifest, hashValue, type CommandRunManifest } from "./run-manifest";

export type CodexWorkPacket = {
  version: "command-wave-codex-work-v0.1";
  mode: "manual_codex";
  proposalId: string;
  targetBranch: string;
  runManifestHash: string;
  handoffPacketHash: string;
  prManifestHash: string | null;
  textHash: string;
  packetHash: string;
  text: string;
};

function numbered(items: string[]) {
  return items.map((item, index) => `${index + 1}. ${item}`);
}

function bulleted(items: string[]) {
  return items.map((item) => `- ${item}`);
}

export function createCodexWorkPacket({
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
}): CodexWorkPacket {
  if (proposal.kind !== "open_pr") {
    throw Object.assign(new Error("Codex work packets are only available for PR commands."), { status: 409 });
  }

  if (!configuredGitHubRepo(wave.repoUrl)) {
    throw Object.assign(new Error("Use a configured GitHub repo before creating a Codex work packet."), { status: 409 });
  }

  if (proposal.kind === "open_pr" && !pollApprovalPassedForWave(poll, wave.waveUrl, { requireUrl: true })) {
    throw Object.assign(new Error("Record the project decision link before creating a Codex work packet."), {
      status: 409,
    });
  }

  const handoff = createAgentHandoffPacket({
    wave,
    proposal,
    poll,
    runManifest,
    baseBranch,
  });
  const prManifest = proposal.kind === "open_pr" ? createCommandPrManifest({ wave, proposal, poll }) : null;
  const prManifestHash = prManifest ? hashValue(prManifest) : null;
  const body = [
    "Command Waves Codex work packet",
    "",
    "Mode: manual Codex handoff",
    `Project chat: ${wave.waveUrl}`,
    `Repo: ${wave.repoUrl}`,
    `Proposal: ${proposal.id} - ${proposal.title}`,
    `Base branch: ${baseBranch}`,
    `Target branch: ${runManifest.targetBranch}`,
    `Run manifest hash: ${runManifest.manifestHash}`,
    `Handoff packet hash: ${handoff.packetHash}`,
    `PR manifest hash: ${prManifestHash ?? "none"}`,
    "",
    "Approved work:",
    proposal.prompt,
    "",
    "Limits and success criteria:",
    proposal.spec,
    "",
    "Operating instructions:",
    ...numbered([
      "Work in an isolated clone or worktree for the repo above.",
      `Create or use branch ${runManifest.targetBranch} from ${baseBranch}.`,
      "Implement only the approved work and success criteria.",
      "Run the relevant tests. For contracts, prefer forge test or the project equivalent.",
      "Open a draft PR only after the branch is prepared.",
      "Put the Command Waves manifest below in the PR body.",
      "Return the required evidence so the reviewer can verify the work.",
    ]),
    "",
    "Adapter sequence:",
    ...numbered(
      handoff.repoOperations.map(
        (operation) => `${operation.label}. Method: ${operation.adapterMethod}. Evidence: ${operation.evidence}`,
      ),
    ),
    "",
    "Constraints:",
    ...bulleted(handoff.constraints),
    "",
    "Required evidence:",
    ...bulleted(handoff.requiredEvidence),
    "",
    "Forbidden actions:",
    ...bulleted(handoff.forbiddenActions),
    "",
    "Command Waves PR manifest:",
    prManifest ? formatCommandPrManifestForPullRequest(prManifest) : "No PR manifest required for this command type.",
  ].join("\n");
  const packetWithoutHash = {
    version: "command-wave-codex-work-v0.1" as const,
    mode: "manual_codex" as const,
    proposalId: proposal.id,
    targetBranch: runManifest.targetBranch,
    runManifestHash: runManifest.manifestHash,
    handoffPacketHash: handoff.packetHash,
    prManifestHash,
    textHash: hashValue(body),
  };

  return {
    ...packetWithoutHash,
    packetHash: hashValue(packetWithoutHash),
    text: body,
  };
}
