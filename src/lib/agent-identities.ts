export const orchestratorAgentIdentity = {
  handle: "daemon",
  accountType: "6529 account",
  status: "active",
  role: "Orchestrator",
  description: "daemon keeps the project summary, changelog, risk labels, and work routing current.",
} as const;

export const reviewAgentIdentity = {
  handle: "review-agent",
  accountType: "placeholder",
  status: "placeholder",
  role: "Review agent",
  description: "Review agent is a placeholder until the production reviewer service is wired.",
} as const;

export const githubRepoPlaceholder = {
  status: "placeholder",
  description: "GitHub repo is a placeholder until the first hook repo is configured.",
} as const;
