import type { CommandWave } from "./command-waves";
import { normalizeParticipationGates } from "./participation-gates";
import { contributorRulesReferenceLine, projectRepoLine } from "./project-repo-copy";

function hasManualQnaPrompt(gates: string[]) {
  return gates.some((gate) => /\b(qna|quiz|question|answer)\b/i.test(gate));
}

export function createParticipationGuideDraft(wave: CommandWave) {
  const gates = normalizeParticipationGates(wave.gates);
  const rulesLine = contributorRulesReferenceLine(wave.repoUrl);
  const qnaPrompt = hasManualQnaPrompt(gates)
    ? [
        "",
        "Manual QnA prompt:",
        "Answer in chat: what is one hook parameter that must be capped, and what test proves the cap?",
      ]
    : [];

  return [
    "Project participation guide",
    "",
    `Project chat: ${wave.waveUrl}`,
    projectRepoLine("Code repo", wave.repoUrl),
    ...(rulesLine ? [rulesLine] : []),
    "",
    "Participation notes:",
    ...gates.map((gate) => `- ${gate}`),
    ...qnaPrompt,
    "",
    "Builder loop:",
    "1. Builders share ideas or code in chat.",
    "2. Orchestration rules classify risk and shape one scoped PR proposal.",
    "3. Important changes need a visible project decision before PR work starts.",
    "4. Reviewer CI checks the PR before humans merge.",
    "",
    "How to join:",
    "1. Read the latest project snapshot and chat context.",
    "2. Ask questions or answer any manual QnA prompt in the discussion.",
    "3. Propose one PR-sized hook change with limits and tests.",
    "4. Wait for a project decision URL before PR work starts.",
    "5. Open draft PRs with the repo template and Command Waves manifest.",
    "",
    "Guardrails:",
    "- Reputation, token, holder, allowlist, and QnA notes are advisory until live enforcement is wired.",
    "- Contribution report scores are informational, not permissions or payments.",
    "- Humans keep merge, deploy, payment, and governance authority.",
  ].join("\n");
}
