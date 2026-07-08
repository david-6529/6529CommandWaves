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
  description: "Review agent is a placeholder for this phase.",
} as const;

export const githubRepoPlaceholder = {
  status: "placeholder",
  label: "GitHub repo placeholder",
  url: "https://github.com/your-org/your-hook-repo",
  description: "The GitHub repo is intentionally a placeholder until PR work starts.",
  nextStep: "Select the pilot repo before building or reviewing PRs.",
} as const;

export const publicGithubRepoPlaceholder = {
  status: githubRepoPlaceholder.status,
  label: githubRepoPlaceholder.label,
  configuredUrl: null,
  description: githubRepoPlaceholder.description,
  nextStep: githubRepoPlaceholder.nextStep,
} as const;
