import type { CommandProposal, CommandWave, ExecutionRecord, GuardianReview, PollState } from "./command-waves";
import { createWaveDecisionReceipt, defaultRules } from "./command-waves";
import { createAgentHandoffPacket, formatAgentHandoffArtifact } from "./agent-handoff";
import { createCommandPrManifest, createGuardianAttestation } from "./github/pr-reviewer-gate";
import { defaultParticipationGates } from "./participation-gates";
import { pullRequestUrl } from "./github/repo";
import { createCommandRunManifest, formatRunManifestArtifact } from "./run-manifest";

const proposal: CommandProposal = {
  id: "cmd-001",
  title: "Draft the non-upgradeable hook scaffold",
  proposer: "david",
  kind: "open_pr",
  risk: "high",
  prompt: "Use Codex to draft a non-upgradeable 6529 hook scaffold with fee parameters capped at 100 bps and tests.",
  spec:
    "Smart contract work only. No proxy, no delegatecall, no deploy script, no payments, and no governance changes. Include tests for the 100 bps fee cap.",
  budgetUsd: 10,
  status: "complete",
};

const reviewingProposal: CommandProposal = {
  ...proposal,
  status: "reviewing",
};

const poll: PollState = {
  proposalId: "cmd-001",
  yesVotes: 5,
  noVotes: 1,
  quorumRequired: 3,
  yesPercentRequired: 60,
  status: "passed",
  decision: createWaveDecisionReceipt({
    proposalId: "cmd-001",
    reference: "https://6529.io/waves/6529-hook-builder/drops/drop-cmd-001-approval",
    waveUrl: "https://6529.io/waves/6529-hook-builder",
    recordedBy: "david",
    recordedAt: "2026-06-20T12:40:30.000Z",
    summary: "Builder wave approved cmd-001 with 5 yes and 1 no.",
  }),
  votes: [
    { voterIdentity: "david", vote: "yes", weight: 1, source: "local", at: "2026-06-20T12:10:00.000Z" },
    { voterIdentity: "gpebbles", vote: "yes", weight: 1, source: "local", at: "2026-06-20T12:11:00.000Z" },
    { voterIdentity: "zoku", vote: "yes", weight: 1, source: "local", at: "2026-06-20T12:12:00.000Z" },
    { voterIdentity: "cuttle", vote: "yes", weight: 1, source: "local", at: "2026-06-20T12:13:00.000Z" },
    { voterIdentity: "simo", vote: "yes", weight: 1, source: "local", at: "2026-06-20T12:14:00.000Z" },
    { voterIdentity: "blocknoob", vote: "no", weight: 1, source: "local", at: "2026-06-20T12:15:00.000Z" },
  ],
};

const preExecutionWave: CommandWave = {
  id: "cw-6529-hook-builder",
  name: "6529 Hook Builder",
  waveUrl: "https://6529.io/waves/6529-hook-builder",
  repoUrl: "https://github.com/6529-Collections/6529-hook",
  gates: [...defaultParticipationGates],
  rules: defaultRules,
  proposals: [reviewingProposal],
  polls: [poll],
  executions: [],
  reviews: [],
  ledger: [
    {
      id: "evt-001",
      at: "2026-06-20T12:00:00.000Z",
      actor: "Setup",
      type: "wave_created",
      message: "Created 6529 Hook Builder and attached the builder wave plus GitHub repo.",
    },
    {
      id: "evt-002",
      at: "2026-06-20T12:05:00.000Z",
      actor: "david",
      type: "proposal_submitted",
      message: "Submitted cmd-001 to draft the non-upgradeable hook scaffold.",
    },
    {
      id: "evt-003",
      at: "2026-06-20T12:05:03.000Z",
      actor: "Rule Engine",
      type: "rule_check",
      message: "Classified cmd-001 as high risk. Poll required: quorum 3, yes 60%.",
    },
    {
      id: "evt-004",
      at: "2026-06-20T12:40:00.000Z",
      actor: "Wave Poll",
      type: "poll_passed",
      message: "cmd-001 passed with 5 yes, 1 no, and a builder wave decision receipt.",
    },
  ],
};

function createDemoExecution(wave: CommandWave): ExecutionRecord {
  const runManifest = createCommandRunManifest({ wave, proposal: reviewingProposal });
  const handoff = createAgentHandoffPacket({
    wave,
    proposal: reviewingProposal,
    poll,
    runManifest,
  });

  return {
    proposalId: reviewingProposal.id,
    harness: "codex",
    status: "complete",
    summary: "Agent adapter opened a deterministic PR record for the approved hook scaffold command.",
    artifacts: [
      formatRunManifestArtifact(runManifest),
      formatAgentHandoffArtifact(handoff),
      "Codex handoff packet recorded",
      "approved prompt snapshot",
      `rules ${runManifest.rulesVersion}/${runManifest.rulesHash}`,
      `permissions ${runManifest.allowedPermissions.join(", ")}`,
      `budget cap $${runManifest.maxCostUsd}`,
      "PR body includes Command Waves manifest",
      "PR #12",
      pullRequestUrl(wave.repoUrl, 12) ?? "https://github.com/6529-Collections/6529-hook/pull/12",
      "head local-demo-c0dex",
      "forge test passed",
    ],
  };
}

const execution = createDemoExecution(preExecutionWave);

const preReviewWave: CommandWave = {
  ...preExecutionWave,
  executions: [execution],
  ledger: [
    ...preExecutionWave.ledger,
    {
      id: "evt-005",
      at: "2026-06-20T12:42:00.000Z",
      actor: "Agent",
      type: "execution_logged",
      message: "Built cmd-001 through Codex and opened PR #12.",
    },
  ],
};

function createDemoReview(): GuardianReview {
  const attestation = createGuardianAttestation({
    wave: preReviewWave,
    proposal: reviewingProposal,
    poll,
    manifest: createCommandPrManifest({ wave: preReviewWave, proposal: reviewingProposal, poll }),
    changedPaths: [],
    generatedAt: "2026-06-20T12:50:00.000Z",
  });

  return {
    proposalId: reviewingProposal.id,
    status: "pass",
    checks: [
      "Execution is linked to an approved proposal.",
      "Run manifest matches approved command, rules hash, permissions, and budget.",
      "Codex handoff packet matches the run manifest, target branch, permissions, and budget.",
      "Hook contract signals checked: contract code, parameter change.",
      "Hook contract signals fit the approved risk level.",
      "Hook contracts stay immutable by default; only named parameter surfaces can change.",
      "Hook parameter work names an explicit numeric cap or upper bound.",
      "Hook parameter work includes bound-focused test or review evidence language.",
      "REP, TDH, and holder threshold language is not treated as live authority unless explicitly wired.",
      `Guardian attestation hash: ${attestation.attestationHash}.`,
    ],
    summary: "Reviewer adapter passed the execution against the approved hook proposal and current rules.",
    proof: {
      version: attestation.version,
      verifier: attestation.verifier.name,
      verifierVersion: attestation.verifier.version,
      mode: attestation.verifier.mode,
      inputs: attestation.inputs,
      resultHash: attestation.resultHash,
      attestationHash: attestation.attestationHash,
    },
  };
}

export const demoWave: CommandWave = {
  ...preReviewWave,
  proposals: [proposal],
  reviews: [createDemoReview()],
  ledger: [
    ...preReviewWave.ledger,
    {
      id: "evt-006",
      at: "2026-06-20T12:50:00.000Z",
      actor: "Reviewer",
      type: "guardian_reviewed",
      message: "Review passed cmd-001. The hook scaffold matched the vote and rules.",
    },
  ],
};
