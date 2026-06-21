const copyReplacements: Array<[RegExp, string]> = [
  [/\bGenesis Agent\b/g, "Setup"],
  [/\bOrchestrator Agent\b/g, "AI Worker"],
  [/\borchestrator execution\b/gi, "AI worker run"],
  [/\borchestrator\b/gi, "AI worker"],
  [/\bGuardian Agent\b/g, "Reviewer"],
  [/\bGuardian review\b/g, "Review"],
  [/\bguardian review\b/g, "review"],
  [/\bGuardian\b/g, "Reviewer"],
  [/\bguardian\b/g, "reviewer"],
];

export function humanizeLegacyCommandCopy(value: string) {
  return copyReplacements.reduce((next, [pattern, replacement]) => next.replace(pattern, replacement), value);
}
