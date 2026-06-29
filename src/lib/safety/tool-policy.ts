import type { CommandKind, CommandProposal } from "../command-waves";

export type ToolPermission =
  | "wave.read"
  | "wave.draft"
  | "wave.post"
  | "repo.read"
  | "repo.open_pr"
  | "script.run"
  | "deploy.run"
  | "funds.spend"
  | "rules.change";

export type ToolPolicy = {
  commandKind: CommandKind;
  permissions: ToolPermission[];
  requiresGuardian: boolean;
  reason: string;
};

const policies: Record<CommandKind, ToolPolicy> = {
  read_context: {
    commandKind: "read_context",
    permissions: ["wave.read", "repo.read"],
    requiresGuardian: false,
    reason: "Read-only context is low risk.",
  },
  draft_response: {
    commandKind: "draft_response",
    permissions: ["wave.read", "wave.draft"],
    requiresGuardian: false,
    reason: "Drafting creates no public side effect.",
  },
  post_to_wave: {
    commandKind: "post_to_wave",
    permissions: ["wave.read", "wave.draft"],
    requiresGuardian: false,
    reason: "Wave updates are drafted for human posting.",
  },
  open_pr: {
    commandKind: "open_pr",
    permissions: ["wave.read", "repo.read", "repo.open_pr"],
    requiresGuardian: true,
    reason: "PR creation changes repo state and must be reviewed.",
  },
  run_script: {
    commandKind: "run_script",
    permissions: ["wave.read", "repo.read", "script.run"],
    requiresGuardian: true,
    reason: "Scripts can mutate local or remote state.",
  },
  deploy: {
    commandKind: "deploy",
    permissions: ["wave.read", "repo.read", "deploy.run"],
    requiresGuardian: true,
    reason: "Deploys affect production users.",
  },
  spend_money: {
    commandKind: "spend_money",
    permissions: ["wave.read", "funds.spend"],
    requiresGuardian: true,
    reason: "Spending needs explicit budget and approval.",
  },
  change_rules: {
    commandKind: "change_rules",
    permissions: ["wave.read", "rules.change"],
    requiresGuardian: true,
    reason: "Rule changes alter governance.",
  },
};

const dangerousPromptChecks: Array<{ label: string; pattern: RegExp }> = [
  { label: "auth", pattern: /\bauth(?:entication)?\b/i },
  { label: "wallet", pattern: /\bwallet|private key|seed phrase\b/i },
  { label: "payment", pattern: /\bpayment|pay\b|\bspend|treasury|funds?\b/i },
  { label: "deploy", pattern: /\bdeploy|production|prod\b/i },
  { label: "rules", pattern: /\brule|quorum|threshold|governance\b/i },
  { label: "secrets", pattern: /\bsecret|api key|token\b/i },
];

function removeNegatedSafetyClauses(value: string) {
  return value.replace(
    /\b(?:do not|don't|no)\s+[^.!?\n]*(?:auth|wallet|private key|seed phrase|payment|pay|spend|treasury|funds?|deploy|production|prod|rules?|quorum|threshold|governance|secret|api key|token)[^.!?\n]*/gi,
    " ",
  );
}

export function toolPolicyForKind(kind: CommandKind) {
  return policies[kind];
}

export function toolPolicyForProposal(proposal: CommandProposal) {
  return toolPolicyForKind(proposal.kind);
}

export function findDangerousPromptFlags(prompt: string) {
  const checkedPrompt = removeNegatedSafetyClauses(prompt);

  return dangerousPromptChecks
    .filter((check) => check.pattern.test(checkedPrompt))
    .map((check) => check.label);
}

export function proposalTouchesDangerousSurface(proposal: CommandProposal) {
  return findDangerousPromptFlags(`${proposal.prompt}\n${proposal.spec}`).length > 0;
}
