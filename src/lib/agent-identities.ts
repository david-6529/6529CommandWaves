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
  label: "Placeholder repo",
  url: "https://github.com/your-org/your-hook-repo",
  description: "GitHub repo is a placeholder until the first hook repo is configured.",
  nextStep: "Connect the real hook repo before PR work can run.",
} as const;
