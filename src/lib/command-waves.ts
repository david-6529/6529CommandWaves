export type RiskLevel = "low" | "medium" | "high" | "critical";

export type CommandKind =
  | "read_context"
  | "draft_response"
  | "post_to_wave"
  | "open_pr"
  | "run_script"
  | "deploy"
  | "spend_money"
  | "change_rules";

export type GateMode = "auto" | "poll" | "blocked";

export type GateRule = {
  mode: GateMode;
  quorum: number;
  yesPercent: number;
  expiresHours: number;
  reason: string;
};

export type CommandWaveRules = {
  version: string;
  eligibleVoters: number;
  defaultQuorum: number;
  defaultYesPercent: number;
  rulesByKind: Record<CommandKind, GateRule>;
};

export type CommandProposal = {
  id: string;
  title: string;
  proposer: string;
  kind: CommandKind;
  risk: RiskLevel;
  prompt: string;
  spec: string;
  budgetUsd: number;
  status: "draft" | "ready_for_vote" | "approved" | "rejected" | "executing" | "reviewing" | "complete";
};

export type CommandVote = {
  voterIdentity: string;
  vote: "yes" | "no";
  weight: number;
  source: "local" | "6529" | "manual";
  at: string;
};

export type WaveDecisionReceipt = {
  source: "local" | "6529" | "manual";
  dropId: string | null;
  url: string | null;
  recordedBy: string;
  recordedAt: string;
  summary: string;
};

export type PollState = {
  proposalId: string;
  yesVotes: number;
  noVotes: number;
  quorumRequired: number;
  yesPercentRequired: number;
  status: "not_required" | "open" | "passed" | "failed";
  votes: CommandVote[];
  decision?: WaveDecisionReceipt | null;
};

export type ExecutionRecord = {
  proposalId: string;
  harness: "codex" | "claude-code" | "script-runner" | "manual";
  status: "waiting" | "running" | "blocked" | "complete";
  summary: string;
  artifacts: string[];
};

export type GuardianReviewProof = {
  version: "guardian-attestation-v0.1";
  verifier: "Command Waves Guardian";
  verifierVersion: string;
  mode: "deterministic";
  inputs: {
    waveId: string;
    proposalId: string | null;
    waveStateHash: string;
    proposalHash: string | null;
    pollHash: string | null;
    manifestHash: string | null;
    changedPathsHash: string;
    changedFilesHash?: string;
    rulesHash: string;
  };
  resultHash: string;
  attestationHash: string;
};

export type GuardianReview = {
  proposalId: string;
  status: "waiting" | "pass" | "changes_requested" | "rule_violation";
  checks: string[];
  summary: string;
  proof?: GuardianReviewProof;
};

export type LedgerEvent = {
  id: string;
  at: string;
  actor: string;
  type:
    | "wave_created"
    | "rules_defined"
    | "proposal_submitted"
    | "rule_check"
    | "poll_opened"
    | "poll_passed"
    | "execution_started"
    | "execution_logged"
    | "guardian_reviewed";
  message: string;
};

export type CommandWave = {
  id: string;
  name: string;
  waveUrl: string;
  repoUrl: string;
  gates: string[];
  rules: CommandWaveRules;
  proposals: CommandProposal[];
  polls: PollState[];
  executions: ExecutionRecord[];
  reviews: GuardianReview[];
  ledger: LedgerEvent[];
};

export const defaultRules: CommandWaveRules = {
  version: "rules-v0.1",
  eligibleVoters: 12,
  defaultQuorum: 3,
  defaultYesPercent: 60,
  rulesByKind: {
    read_context: {
      mode: "auto",
      quorum: 0,
      yesPercent: 0,
      expiresHours: 0,
      reason: "Reading wave context is low risk.",
    },
    draft_response: {
      mode: "auto",
      quorum: 0,
      yesPercent: 0,
      expiresHours: 0,
      reason: "Drafting text does not publish or change external systems.",
    },
    post_to_wave: {
      mode: "poll",
      quorum: 3,
      yesPercent: 60,
      expiresHours: 24,
      reason: "Posting changes public wave state.",
    },
    open_pr: {
      mode: "poll",
      quorum: 3,
      yesPercent: 60,
      expiresHours: 24,
      reason: "Code changes need visible approval before execution.",
    },
    run_script: {
      mode: "poll",
      quorum: 4,
      yesPercent: 67,
      expiresHours: 24,
      reason: "Scripts can mutate local or remote state.",
    },
    deploy: {
      mode: "poll",
      quorum: 5,
      yesPercent: 75,
      expiresHours: 12,
      reason: "Deploys affect production users.",
    },
    spend_money: {
      mode: "poll",
      quorum: 5,
      yesPercent: 80,
      expiresHours: 24,
      reason: "Spending needs explicit budget consent.",
    },
    change_rules: {
      mode: "poll",
      quorum: 7,
      yesPercent: 80,
      expiresHours: 48,
      reason: "Changing rules changes the governance system itself.",
    },
  },
};

export function classifyRisk(kind: CommandKind, prompt: string): RiskLevel {
  const lowerPrompt = prompt.toLowerCase();

  if (kind === "deploy" || kind === "spend_money" || kind === "change_rules") {
    return "critical";
  }

  if (kind === "open_pr" || kind === "run_script") {
    return lowerPrompt.includes("auth") ||
      lowerPrompt.includes("wallet") ||
      lowerPrompt.includes("payment") ||
      lowerPrompt.includes("contract") ||
      lowerPrompt.includes("solidity") ||
      lowerPrompt.includes("hook") ||
      lowerPrompt.includes("fee") ||
      lowerPrompt.includes("deploy") ||
      lowerPrompt.includes("proxy") ||
      lowerPrompt.includes("upgrade") ||
      lowerPrompt.includes("delegatecall") ||
      lowerPrompt.includes("governance")
      ? "high"
      : "medium";
  }

  if (kind === "post_to_wave") {
    return "medium";
  }

  return "low";
}

export function evaluateGate(
  proposal: CommandProposal,
  rules: CommandWaveRules,
): {
  rule: GateRule;
  needsPoll: boolean;
  canExecuteNow: boolean;
  blocked: boolean;
} {
  const rule = rules.rulesByKind[proposal.kind];

  return {
    rule,
    needsPoll: rule.mode === "poll",
    canExecuteNow: rule.mode === "auto",
    blocked: rule.mode === "blocked",
  };
}

export function evaluatePoll(poll: PollState) {
  const totalVotes = poll.yesVotes + poll.noVotes;
  const yesPercent = totalVotes ? Math.round((poll.yesVotes / totalVotes) * 100) : 0;

  return {
    totalVotes,
    yesPercent,
    quorumMet: totalVotes >= poll.quorumRequired,
    thresholdMet: yesPercent >= poll.yesPercentRequired,
    passed: totalVotes >= poll.quorumRequired && yesPercent >= poll.yesPercentRequired,
  };
}

export function pollApprovalPassed(poll: PollState | null) {
  if (!poll) {
    return false;
  }

  return evaluatePoll(poll).passed || (poll.status === "passed" && Boolean(poll.decision));
}

function dropIdFromUrl(value: string) {
  return (
    value.match(/\/drops\/([^/?#\s]+)/i)?.[1] ??
    value.match(/[?&](?:dropId|drop_id|drop)=([^&#\s]+)/i)?.[1] ??
    null
  );
}

export function createWaveDecisionReceipt({
  proposalId,
  reference,
  waveUrl,
  recordedBy,
  summary,
  recordedAt = new Date().toISOString(),
}: {
  proposalId: string;
  reference: string;
  waveUrl: string;
  recordedBy: string;
  summary?: string;
  recordedAt?: string;
}): WaveDecisionReceipt {
  const trimmedReference = reference.trim();
  const isUrl = /^https?:\/\//i.test(trimmedReference);
  let url: URL | null = null;

  if (isUrl) {
    try {
      url = new URL(trimmedReference);
    } catch {
      url = null;
    }
  }

  return {
    source: url?.hostname.endsWith("6529.io") ? "6529" : "manual",
    dropId: isUrl ? dropIdFromUrl(trimmedReference) : trimmedReference,
    url: isUrl ? trimmedReference : null,
    recordedBy: recordedBy.trim() || "manual reviewer",
    recordedAt,
    summary: summary?.trim() || `Manual wave decision receipt for ${proposalId} in ${waveUrl}.`,
  };
}
