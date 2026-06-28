const copyReplacements: Array<[RegExp, string]> = [
  [/\bGenesis Agent\b/g, "Setup"],
  [/\bOrchestrator Agent\b/g, "Agent"],
  [/\borchestrator execution\b/gi, "agent run"],
  [/\borchestrator\b/gi, "agent"],
  [/\bGuardian Agent\b/g, "Reviewer"],
  [/\bGuardian review\b/g, "Review"],
  [/\bguardian review\b/g, "review"],
  [/\bGuardian\b/g, "Reviewer"],
  [/\bguardian\b/g, "reviewer"],
];

export function humanizeLegacyCommandCopy(value: string) {
  return copyReplacements.reduce((next, [pattern, replacement]) => next.replace(pattern, replacement), value);
}
