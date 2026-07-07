import type { CommandProposal, CommandWave, ExecutionRecord } from "./command-waves";
import { humanizeLegacyCommandCopy } from "./legacy-copy";
import { projectRepoLine } from "./project-repo-copy";

function prUrl(execution: ExecutionRecord | null) {
  return (
    execution?.artifacts.find((artifact) =>
      /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+(?:[?#][^\s]*)?$/.test(artifact),
    ) ?? null
  );
}

function buildRecordLines(execution: ExecutionRecord | null) {
  if (!execution) {
    return ["- PR record is not attached yet."];
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
    "Project review request",
    "",
    `Project chat: ${wave.waveUrl}`,
    projectRepoLine("GitHub repo", wave.repoUrl),
    `Work: ${proposal.id} - ${proposal.title}`,
    `PR: ${prUrl(execution) ?? "not recorded yet"}`,
    "",
    "Approved work:",
    humanizeLegacyCommandCopy(proposal.prompt),
    "",
    "Limits and success criteria:",
    humanizeLegacyCommandCopy(proposal.spec),
    "",
    "Build record:",
    ...buildRecordLines(execution),
    "",
    "Review checklist:",
    "- PR matches the approved work and limits.",
    "- Command Waves manifest and project decision receipt are present.",
    "- Tests cover capped hook parameters and guardrails.",
    "- No proxy, delegatecall, deploy, payment, or governance change is introduced.",
    "- Findings should be posted in the PR and summarized back to chat.",
    "",
    "Guardrails: this request does not merge, deploy, approve payouts, or change governance.",
  ].join("\n");
}
