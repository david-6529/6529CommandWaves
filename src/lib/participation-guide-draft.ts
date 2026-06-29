import type { CommandWave } from "./command-waves";
import { parseGitHubRepoUrl } from "./github/repo";
import { normalizeParticipationGates } from "./participation-gates";

function contributorRulesLine(repoUrl: string) {
  const repo = parseGitHubRepoUrl(repoUrl);

  return repo ? `Contributor rules: ${repo.htmlUrl}/blob/main/CONTRIBUTING.md` : null;
}

function hasManualQnaPrompt(gates: string[]) {
  return gates.some((gate) => /\b(qna|quiz|question|answer)\b/i.test(gate));
}

export function createParticipationGuideDraft(wave: CommandWave) {
  const gates = normalizeParticipationGates(wave.gates);
  const rulesLine = contributorRulesLine(wave.repoUrl);
  const qnaPrompt = hasManualQnaPrompt(gates)
    ? [
        "",
        "Manual QnA prompt:",
        "Answer in the builder wave: what is one hook parameter that must be capped, and what test proves the cap?",
      ]
    : [];

  return [
    "6529 hook participation guide",
    "",
    `Builder wave: ${wave.waveUrl}`,
    `GitHub repo: ${wave.repoUrl}`,
    ...(rulesLine ? [rulesLine] : []),
    "",
    "Participation notes:",
    ...gates.map((gate) => `- ${gate}`),
    ...qnaPrompt,
    "",
    "How to join:",
    "1. Read the latest project snapshot and builder wave context.",
    "2. Ask questions or answer any manual QnA prompt in the wave.",
    "3. Propose one PR-sized hook change with limits and tests.",
    "4. Wait for a builder wave decision URL before PR work starts.",
    "5. Open draft PRs with the repo template and Command Waves manifest.",
    "",
    "Guardrails:",
    "- REP, TDH, holder, allowlist, and QnA notes are advisory until live enforcement is wired.",
    "- Contribution report scores are informational, not permissions or payments.",
    "- Humans keep merge, deploy, payment, and governance authority.",
  ].join("\n");
}
