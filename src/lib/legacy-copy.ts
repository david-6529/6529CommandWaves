const copyReplacements: Array<[RegExp, string]> = [
  [/\bSubmitted cmd-001 to draft the non-upgradeable hook scaffold\./g, "Proposed the non-upgradeable hook scaffold."],
  [
    /\bClassified cmd-001 as high risk\. Poll required: quorum 3, yes 60%\./g,
    "Marked the hook scaffold high risk. Builder decision required: quorum 3, yes 60%.",
  ],
  [
    /\bcmd-001 passed with 5 yes, 1 no, and a (?:project|6529) decision receipt\./g,
    "Builders approved the hook scaffold with 5 yes and 1 no.",
  ],
  [
    /\bProject decision approved cmd-001 with 5 yes and 1 no\./g,
    "Builders approved the hook scaffold with 5 yes and 1 no.",
  ],
  [
    /\bProject decision passed for cmd-001 with quorum met\./g,
    "Builders approved the hook scaffold proposal.",
  ],
  [
    /\bRoom approved cmd-001 with 5 yes and 1 no\./g,
    "Builders approved the hook scaffold with 5 yes and 1 no.",
  ],
  [
    /\bReview passed cmd-001\. The hook scaffold matched the vote and rules\./g,
    "Review passed the hook scaffold. It matched the builder decision and rules.",
  ],
  [/\b6529 Hook Builder\b/g, "Hook Build"],
  [/\b6529 Hook Project\b/g, "Hook Build"],
  [/\bWave Poll\b/g, "Decision"],
  [/\bRoom approved\b/g, "Project decision approved"],
  [/\broom approved\b/g, "project decision approved"],
  [/\broom decision receipt\b/gi, "project decision link"],
  [/\bbuilder wave decision receipt\b/gi, "project decision link"],
  [/\bbuilder 6529 decision receipt\b/gi, "project decision link"],
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
