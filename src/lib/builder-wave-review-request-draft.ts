import type { CommandProposal, CommandWave, ExecutionRecord } from "./command-waves";
import { humanizeLegacyCommandCopy } from "./legacy-copy";

function prUrl(execution: ExecutionRecord | null) {
  return (
    execution?.artifacts.find((artifact) =>
      /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+(?:[?#][^\s]*)?$/.test(artifact),
    ) ?? null
  );
}

function buildEvidenceLines(execution: ExecutionRecord | null) {
  if (!execution) {
    return ["- PR evidence is not recorded yet."];
  }

  return [
    `- Build status: ${execution.status}.`,
    `- Harness: ${execution.harness}.`,
    `- Summary: ${humanizeLegacyCommandCopy(execution.summary)}`,
    ...execution.artifacts.slice(0, 6).map((artifact) => `- ${humanizeLegacyCommandCopy(artifact)}`),
  ];
}

export function createBuilderWaveReviewRequestDraft({
  wave,
  proposal,
  execution,
}: {
  wave: CommandWave;
  proposal: CommandProposal;
  execution: ExecutionRecord | null;
}) {
  return [
    "6529 hook review request",
    "",
    `Builder wave: ${wave.waveUrl}`,
    `GitHub repo: ${wave.repoUrl}`,
    `Command: ${proposal.id} - ${proposal.title}`,
    `PR: ${prUrl(execution) ?? "not recorded yet"}`,
    "",
    "Approved work:",
    humanizeLegacyCommandCopy(proposal.prompt),
    "",
    "Limits and success criteria:",
    humanizeLegacyCommandCopy(proposal.spec),
    "",
    "Build evidence:",
    ...buildEvidenceLines(execution),
    "",
    "Review checklist:",
    "- PR matches the approved builder wave command and limits.",
    "- Command Waves manifest and wave decision receipt are present.",
    "- Tests cover capped hook parameters and guardrails.",
    "- No proxy, delegatecall, deploy, payment, or governance change is introduced.",
    "- Findings should be posted in the PR and summarized back to the builder wave.",
    "",
    "Guardrails: this request does not merge, deploy, approve payouts, or change governance.",
  ].join("\n");
}
