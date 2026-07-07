import type { CommandWave } from "./command-waves";
import { contributorRulesReferenceLine, projectRepoLine } from "./project-repo-copy";

function participationLine(gates: string[]) {
  if (!gates.length) {
    return "Participation notes: none recorded yet.";
  }

  return `Participation notes (advisory): ${gates.join(", ")}`;
}

export function createBuilderWaveLaunchDraft(wave: CommandWave) {
  const rulesLine = contributorRulesReferenceLine(wave.repoUrl);

  return [
    "Project launch brief",
    "",
    `Project chat: ${wave.waveUrl}`,
    projectRepoLine("GitHub repo", wave.repoUrl),
    ...(rulesLine ? [rulesLine] : []),
    "",
    "Goal: coordinate the first public build for a non-upgradeable hook through project chat and one smart contract repo.",
    "",
    "How to help:",
    "1. Share ideas or questions in chat.",
    "2. Bring one PR-sized hook change to chat.",
    "3. Include clear limits, tests, and any parameter cap.",
    "4. Wait for a project decision before PR work starts.",
    "5. Open draft PRs with the repo template and Command Waves manifest.",
    "6. Let reviewer CI check the PR before humans merge.",
    "",
    "Guardrails:",
    "- Access explains who can join, but reputation, token, holder, allowlist, and QnA notes stay advisory until live enforcement is wired.",
    "- Orchestration rules classify risk and require votes for important hook changes.",
    "- The hook is immutable by default.",
    "- No proxy, delegatecall, deployment, spending, payouts, or governance changes in phase 1.",
    "- Capped parameters need explicit bounds and tests.",
    "- Contribution report scores are not reputation, token weight, payments, permissions, or merge rights.",
    `- ${participationLine(wave.gates)}`,
    "",
    "Next step: propose one scoped hook change, then record the project decision URL before using a Codex packet.",
  ].join("\n");
}
