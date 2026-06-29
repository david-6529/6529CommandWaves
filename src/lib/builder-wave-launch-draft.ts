import type { CommandWave } from "./command-waves";
import { parseGitHubRepoUrl } from "./github/repo";

function participationLine(gates: string[]) {
  if (!gates.length) {
    return "Participation notes: none recorded yet.";
  }

  return `Participation notes (advisory): ${gates.join(", ")}`;
}

function contributorRulesLine(repoUrl: string) {
  const repo = parseGitHubRepoUrl(repoUrl);

  return repo ? `Contributor rules: ${repo.htmlUrl}/blob/main/CONTRIBUTING.md` : null;
}

export function createBuilderWaveLaunchDraft(wave: CommandWave) {
  const rulesLine = contributorRulesLine(wave.repoUrl);

  return [
    "6529 hook launch brief",
    "",
    `6529 discussion: ${wave.waveUrl}`,
    `GitHub repo: ${wave.repoUrl}`,
    ...(rulesLine ? [rulesLine] : []),
    "",
    "Goal: coordinate the first public build for a non-upgradeable 6529 hook through this discussion and one smart contract repo.",
    "",
    "How to help:",
    "1. Share ideas or questions in chat.",
    "2. Bring one PR-sized hook change to the 6529 discussion.",
    "3. Include clear limits, tests, and any parameter cap.",
    "4. Wait for a 6529 decision before PR work starts.",
    "5. Open draft PRs with the repo template and Command Waves manifest.",
    "6. Let reviewer CI check the PR before humans merge.",
    "",
    "Guardrails:",
    "- Gates decide who can play, but REP, TDH, holder, allowlist, and QnA notes stay advisory until live enforcement is wired.",
    "- Orchestration rules classify risk and require votes for important hook changes.",
    "- The hook is immutable by default.",
    "- No proxy, delegatecall, deployment, spending, payouts, or governance changes in phase 1.",
    "- Capped parameters need explicit bounds and tests.",
    "- Contribution report scores are not REP, TDH, payments, permissions, or merge rights.",
    `- ${participationLine(wave.gates)}`,
    "",
    "Next step: propose one scoped command, then record the 6529 decision URL before using a Codex packet.",
  ].join("\n");
}
