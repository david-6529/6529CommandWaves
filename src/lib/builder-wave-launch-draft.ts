import type { CommandWave } from "./command-waves";

function participationLine(gates: string[]) {
  if (!gates.length) {
    return "Participation notes: none recorded yet.";
  }

  return `Participation notes (advisory): ${gates.join(", ")}`;
}

export function createBuilderWaveLaunchDraft(wave: CommandWave) {
  return [
    "6529 Hook Builder launch brief",
    "",
    `Builder wave: ${wave.waveUrl}`,
    `GitHub repo: ${wave.repoUrl}`,
    "",
    "Goal: build one non-upgradeable 6529 hook in public through this builder wave and one smart contract repo.",
    "",
    "How to help:",
    "1. Share ideas or questions in chat.",
    "2. Bring one PR-sized hook change to the builder wave.",
    "3. Include clear limits, tests, and any parameter cap.",
    "4. Wait for a builder wave decision before PR work starts.",
    "5. Use GitHub PRs for code and reviews.",
    "",
    "Guardrails:",
    "- The hook is immutable by default.",
    "- No proxy, delegatecall, deployment, spending, payouts, or governance changes in phase 1.",
    "- Capped parameters need explicit bounds and tests.",
    "- Contribution scores are transparent reports, not REP, TDH, payments, permissions, or merge rights.",
    `- ${participationLine(wave.gates)}`,
    "",
    "Next step: propose one scoped command, then record the builder wave decision URL before using a Codex packet.",
  ].join("\n");
}
