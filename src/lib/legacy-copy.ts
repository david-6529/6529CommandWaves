const copyReplacements: Array<[RegExp, string]> = [
  [/\b6529 Hook Builder\b/g, "Hook Build"],
  [/\b6529 Hook Project\b/g, "Hook Build"],
  [/\bWave Poll\b/g, "Decision"],
  [/\broom decision receipt\b/gi, "project decision receipt"],
  [/\bbuilder wave decision receipt\b/gi, "project decision receipt"],
  [/\bbuilder 6529 decision receipt\b/gi, "project decision receipt"],
  [/\bbuilder wave plus GitHub repo\b/gi, "project chat and GitHub repo"],
  [/\b6529 discussion and GitHub repo\b/gi, "project chat and GitHub repo"],
  [/\bBuilder wave\b/g, "Project chat"],
  [/\bbuilder wave\b/g, "project chat"],
  [/\bapproved PR command\b/gi, "approved PR work"],
  [/\bapproved command\b/gi, "approved work"],
  [/\bGenesis Agent\b/g, "Setup"],
  [/\bOrchestrator Agent\b/g, "Orchestrator"],
  [/\borchestrator execution\b/gi, "orchestrator run"],
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
