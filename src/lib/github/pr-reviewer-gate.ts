import {
  evaluateGate,
  evaluatePoll,
  type CommandKind,
  type CommandProposal,
  type CommandWave,
  type PollState,
  type RiskLevel,
} from "../command-waves";
import { createCommandRunManifest, hashValue } from "../run-manifest";
import { toolPolicyForProposal, type ToolPermission } from "../safety/tool-policy";

export const REVIEWER_GATE_VERSION = "command-wave-reviewer-gate-v0.1" as const;

export type CommandPrManifest = {
  version: "command-wave-pr-v0.1";
  waveId: string;
  waveUrl: string;
  proposalId: string;
  pollDropId: string | null;
  commandKind: CommandKind;
  risk: RiskLevel;
  rulesVersion: string;
  rulesHash: string;
  promptHash: string;
  specHash: string;
  allowedPermissions: ToolPermission[];
  runManifestHash: string;
  approval: {
    status: "not_required" | "passed";
    yesVotes: number;
    noVotes: number;
    quorumRequired: number;
    yesPercentRequired: number;
  };
};

export type PrDiffSignal = {
  label: string;
  risk: Exclude<RiskLevel, "low">;
  path: string;
  reason: string;
};

export type ReviewerGateCheck = {
  id: string;
  status: "pass" | "fail";
  message: string;
};

export type ReviewerGateResult = {
  status: "pass" | "fail";
  checks: ReviewerGateCheck[];
  diffSignals: PrDiffSignal[];
};

export type GuardianAttestation = {
  version: "guardian-attestation-v0.1";
  generatedAt: string;
  verifier: {
    name: "Command Waves Guardian";
    version: typeof REVIEWER_GATE_VERSION;
    mode: "deterministic";
  };
  inputs: {
    waveId: string;
    proposalId: string | null;
    manifestHash: string | null;
    changedPathsHash: string;
    rulesHash: string;
  };
  result: ReviewerGateResult;
  resultHash: string;
  attestationHash: string;
};

const proposalStatusesAllowedToLand: CommandProposal["status"][] = ["approved", "reviewing", "complete"];

const diffSignalRules: Array<{
  label: string;
  risk: Exclude<RiskLevel, "low">;
  pattern: RegExp;
  reason: string;
}> = [
  {
    label: "workflow",
    risk: "high",
    pattern: /^\.github\/workflows\//,
    reason: "GitHub workflow changes can alter review/deploy enforcement.",
  },
  {
    label: "deployment",
    risk: "high",
    pattern: /(^|\/)(vercel\.json|Dockerfile|docker-compose\.ya?ml|deploy|deployment)/i,
    reason: "Deployment configuration changes can affect production.",
  },
  {
    label: "secrets",
    risk: "high",
    pattern: /(^|\/)(\.env|.*secret.*|.*token.*|.*key.*)/i,
    reason: "Secret or token handling needs explicit review.",
  },
  {
    label: "auth",
    risk: "high",
    pattern: /(^|\/)(auth|wallet|payment|billing|checkout|permissions?|security)(\/|\.|-|_)/i,
    reason: "Auth, wallet, payment, and permission surfaces are high risk.",
  },
  {
    label: "rules",
    risk: "critical",
    pattern: /(^|\/)(rules|governance|policy|guardrail|reviewer-gate)(\/|\.|-|_)/i,
    reason: "Governance and review gate changes can change what the agent is allowed to do.",
  },
];

function check(id: string, status: ReviewerGateCheck["status"], message: string): ReviewerGateCheck {
  return { id, status, message };
}

function overall(checks: ReviewerGateCheck[]) {
  return checks.some((item) => item.status === "fail") ? "fail" : "pass";
}

function waveIdFromUrl(value: string) {
  return value.match(/\/waves\/([^/?#\s]+)/)?.[1] ?? value;
}

function sortedPaths(paths: string[]) {
  return [...paths].sort((a, b) => a.localeCompare(b));
}

function riskAllowsSignal(risk: RiskLevel, signal: PrDiffSignal) {
  if (signal.risk === "medium") {
    return risk === "medium" || risk === "high" || risk === "critical";
  }

  if (signal.risk === "high") {
    return risk === "high" || risk === "critical";
  }

  return risk === "critical";
}

export function findPrDiffSignals(paths: string[] = []): PrDiffSignal[] {
  return paths.flatMap((path) =>
    diffSignalRules
      .filter((rule) => rule.pattern.test(path))
      .map((rule) => ({
        label: rule.label,
        risk: rule.risk,
        path,
        reason: rule.reason,
      })),
  );
}

export function createCommandPrManifest({
  wave,
  proposal,
  poll,
  pollDropId = null,
}: {
  wave: CommandWave;
  proposal: CommandProposal;
  poll: PollState | null;
  pollDropId?: string | null;
}): CommandPrManifest {
  const runManifest = createCommandRunManifest({ wave, proposal });
  const pollResult = poll ? evaluatePoll(poll) : null;

  return {
    version: "command-wave-pr-v0.1",
    waveId: waveIdFromUrl(wave.waveUrl),
    waveUrl: wave.waveUrl,
    proposalId: proposal.id,
    pollDropId,
    commandKind: proposal.kind,
    risk: proposal.risk,
    rulesVersion: wave.rules.version,
    rulesHash: hashValue(wave.rules),
    promptHash: hashValue(proposal.prompt),
    specHash: hashValue(proposal.spec),
    allowedPermissions: toolPolicyForProposal(proposal).permissions,
    runManifestHash: runManifest.manifestHash,
    approval: poll
      ? {
          status: pollResult?.passed ? "passed" : "not_required",
          yesVotes: poll.yesVotes,
          noVotes: poll.noVotes,
          quorumRequired: poll.quorumRequired,
          yesPercentRequired: poll.yesPercentRequired,
        }
      : {
          status: "not_required",
          yesVotes: 0,
          noVotes: 0,
          quorumRequired: 0,
          yesPercentRequired: 0,
        },
  };
}

export function validateCommandPrManifest({
  wave,
  proposal,
  poll,
  manifest,
  changedPaths = [],
}: {
  wave: CommandWave;
  proposal: CommandProposal | null;
  poll: PollState | null;
  manifest: CommandPrManifest | null;
  changedPaths?: string[];
}): ReviewerGateResult {
  const checks: ReviewerGateCheck[] = [];
  const diffSignals = findPrDiffSignals(changedPaths);

  if (!proposal) {
    checks.push(check("proposal_exists", "fail", "No matching command proposal was found."));
    return { status: "fail", checks, diffSignals };
  }

  if (!manifest) {
    checks.push(check("manifest_exists", "fail", "PR is missing a Command Waves manifest."));
    return { status: "fail", checks, diffSignals };
  }

  const expected = createCommandPrManifest({ wave, proposal, poll });
  const gate = evaluateGate(proposal, wave.rules);
  const pollResult = poll ? evaluatePoll(poll) : null;

  checks.push(
    check(
      "proposal_status",
      proposalStatusesAllowedToLand.includes(proposal.status) ? "pass" : "fail",
      `Proposal status is ${proposal.status}.`,
    ),
  );
  checks.push(
    check(
      "command_kind",
      manifest.commandKind === proposal.kind && proposal.kind === "open_pr" ? "pass" : "fail",
      proposal.kind === "open_pr"
        ? "PR is linked to an open_pr command."
        : `PRs require an open_pr command, not ${proposal.kind}.`,
    ),
  );
  checks.push(
    check(
      "rules_hash",
      manifest.rulesVersion === expected.rulesVersion && manifest.rulesHash === expected.rulesHash ? "pass" : "fail",
      "Rules version and hash match the approved command.",
    ),
  );
  checks.push(
    check(
      "prompt_spec_hashes",
      manifest.promptHash === expected.promptHash && manifest.specHash === expected.specHash ? "pass" : "fail",
      "Prompt and success-criteria hashes match the approved command.",
    ),
  );
  checks.push(
    check(
      "permissions",
      JSON.stringify(manifest.allowedPermissions) === JSON.stringify(expected.allowedPermissions) ? "pass" : "fail",
      "Manifest permissions match the command type.",
    ),
  );
  checks.push(
    check(
      "vote",
      gate.needsPoll ? (pollResult?.passed && manifest.approval.status === "passed" ? "pass" : "fail") : "pass",
      gate.needsPoll
        ? `Vote ${pollResult?.passed ? "passed" : "has not passed"} under quorum ${gate.rule.quorum} / yes ${gate.rule.yesPercent}%.`
        : "No vote is required by the current rules.",
    ),
  );

  for (const signal of diffSignals) {
    checks.push(
      check(
        `diff_${signal.label}_${signal.path}`,
        riskAllowsSignal(manifest.risk, signal) ? "pass" : "fail",
        `${signal.path}: ${signal.reason}`,
      ),
    );
  }

  return {
    status: overall(checks),
    checks,
    diffSignals,
  };
}

export function createGuardianAttestation({
  wave,
  proposal,
  poll,
  manifest,
  changedPaths = [],
  generatedAt,
}: {
  wave: CommandWave;
  proposal: CommandProposal | null;
  poll: PollState | null;
  manifest: CommandPrManifest | null;
  changedPaths?: string[];
  generatedAt?: string;
}): GuardianAttestation {
  const sortedChangedPaths = sortedPaths(changedPaths);
  const result = validateCommandPrManifest({
    wave,
    proposal,
    poll,
    manifest,
    changedPaths: sortedChangedPaths,
  });
  const resultHash = hashValue(result);
  const attestationBase = {
    version: "guardian-attestation-v0.1" as const,
    generatedAt: generatedAt ?? new Date().toISOString(),
    verifier: {
      name: "Command Waves Guardian" as const,
      version: REVIEWER_GATE_VERSION,
      mode: "deterministic" as const,
    },
    inputs: {
      waveId: waveIdFromUrl(wave.waveUrl),
      proposalId: proposal?.id ?? null,
      manifestHash: manifest ? hashValue(manifest) : null,
      changedPathsHash: hashValue(sortedChangedPaths),
      rulesHash: hashValue(wave.rules),
    },
    result,
    resultHash,
  };

  return {
    ...attestationBase,
    attestationHash: hashValue(attestationBase),
  };
}

export function verifyGuardianAttestation({
  wave,
  proposal,
  poll,
  manifest,
  changedPaths = [],
  attestation,
}: {
  wave: CommandWave;
  proposal: CommandProposal | null;
  poll: PollState | null;
  manifest: CommandPrManifest | null;
  changedPaths?: string[];
  attestation: GuardianAttestation;
}) {
  const expected = createGuardianAttestation({
    wave,
    proposal,
    poll,
    manifest,
    changedPaths,
    generatedAt: attestation.generatedAt,
  });

  return expected.attestationHash === attestation.attestationHash && expected.resultHash === attestation.resultHash;
}
