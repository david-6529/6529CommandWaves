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

export type PollState = {
  proposalId: string;
  yesVotes: number;
  noVotes: number;
  quorumRequired: number;
  yesPercentRequired: number;
  status: "not_required" | "open" | "passed" | "failed";
  votes: CommandVote[];
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
    manifestHash: string | null;
    changedPathsHash: string;
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
    return lowerPrompt.includes("auth") || lowerPrompt.includes("wallet") || lowerPrompt.includes("payment")
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

export const demoWave: CommandWave = {
  id: "cw-6529-shipyard",
  name: "Command Waves Demo",
  waveUrl: "https://6529.io/waves/demo-command-wave",
  repoUrl: "https://github.com/6529-Collections/example-command-wave",
  gates: ["manual allowlist for MVP", "REP/NIC/TDH gates later", "agents require sponsor wallets later"],
  rules: defaultRules,
  proposals: [
    {
      id: "cmd-001",
      title: "Add a landing page section explaining Command Waves",
      proposer: "david",
      kind: "open_pr",
      risk: "medium",
      prompt:
        "Use Codex to add a concise landing page section explaining commands, votes, runs, and reviews.",
      spec:
        "Add copy only. Do not change auth, payments, production deploys, or repo settings. Include tests if existing page tests cover copy.",
      budgetUsd: 2,
      status: "approved",
    },
  ],
  polls: [
    {
      proposalId: "cmd-001",
      yesVotes: 5,
      noVotes: 1,
      quorumRequired: 3,
      yesPercentRequired: 60,
      status: "passed",
      votes: [
        { voterIdentity: "david", vote: "yes", weight: 1, source: "local", at: "2026-06-20T12:10:00.000Z" },
        { voterIdentity: "gpebbles", vote: "yes", weight: 1, source: "local", at: "2026-06-20T12:11:00.000Z" },
        { voterIdentity: "zoku", vote: "yes", weight: 1, source: "local", at: "2026-06-20T12:12:00.000Z" },
        { voterIdentity: "cuttle", vote: "yes", weight: 1, source: "local", at: "2026-06-20T12:13:00.000Z" },
        { voterIdentity: "simo", vote: "yes", weight: 1, source: "local", at: "2026-06-20T12:14:00.000Z" },
        { voterIdentity: "blocknoob", vote: "no", weight: 1, source: "local", at: "2026-06-20T12:15:00.000Z" },
      ],
    },
  ],
  executions: [
    {
      proposalId: "cmd-001",
      harness: "codex",
      status: "complete",
      summary: "Mock execution opened a PR with copy-only changes bound to the approved spec.",
      artifacts: ["PR #12", "commit abc123", "npm run lint passed"],
    },
  ],
  reviews: [
    {
      proposalId: "cmd-001",
      status: "pass",
      checks: ["Matched approved scope", "No unexpected files", "No production deploy", "Tests/lint recorded"],
      summary: "Review passed. The work matched the vote and stayed inside the approved command.",
    },
  ],
  ledger: [
    {
      id: "evt-001",
      at: "2026-06-20T12:00:00.000Z",
      actor: "Setup",
      type: "wave_created",
      message: "Created Command Waves Demo and attached 6529 wave + GitHub repo.",
    },
    {
      id: "evt-002",
      at: "2026-06-20T12:05:00.000Z",
      actor: "david",
      type: "proposal_submitted",
      message: "Submitted cmd-001 as an open_pr proposal.",
    },
    {
      id: "evt-003",
      at: "2026-06-20T12:05:03.000Z",
      actor: "Rule Engine",
      type: "rule_check",
      message: "Classified cmd-001 as medium risk. Poll required: quorum 3, yes 60%.",
    },
    {
      id: "evt-004",
      at: "2026-06-20T12:40:00.000Z",
      actor: "Wave Poll",
      type: "poll_passed",
      message: "cmd-001 passed with 5 yes, 1 no.",
    },
    {
      id: "evt-005",
      at: "2026-06-20T12:42:00.000Z",
      actor: "AI Worker",
      type: "execution_logged",
      message: "Executed cmd-001 through Codex and opened PR #12.",
    },
    {
      id: "evt-006",
      at: "2026-06-20T12:50:00.000Z",
      actor: "Reviewer",
      type: "guardian_reviewed",
      message: "Review passed. Execution matched vote and rules.",
    },
  ],
};
