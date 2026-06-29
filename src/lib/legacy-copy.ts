const copyReplacements: Array<[RegExp, string]> = [
  [/\b6529 Hook Builder\b/g, "6529 Hook Project"],
  [/\bGenesis Agent\b/g, "Setup"],
  [/\bOrchestrator Agent\b/g, "Agent"],
  [/\borchestrator execution\b/gi, "agent run"],
  [/\borchestrator\b/gi, "agent"],
  [/\bGuardian Agent\b/g, "Reviewer"],
  [/\bGuardian review\b/g, "Review"],
  [/\bguardian review\b/g, "review"],
  [/\bGuardian\b/g, "Reviewer"],
  [/\bguardian\b/g, "reviewer"],
  [/\bLocal agent mock\b/g, "Agent adapter"],
  [/\blocal agent mock\b/g, "agent adapter"],
  [/\bReviewer mock\b/g, "Reviewer adapter"],
  [/\breviewer mock\b/g, "reviewer adapter"],
];

export function humanizeLegacyCommandCopy(value: string) {
  return copyReplacements.reduce((next, [pattern, replacement]) => next.replace(pattern, replacement), value);
}
