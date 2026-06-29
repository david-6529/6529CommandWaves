import type { CommandKind, CommandWave } from "./command-waves";
import { commandKindLabel } from "./command-kind-copy";

export type BuilderWaveProposalDraftInput = {
  wave: CommandWave;
  title: string;
  proposer: string;
  kind: CommandKind;
  request: string;
  limits: string;
  budgetUsd: string;
  risk: string;
  decisionRoute: string;
  ruleReason: string;
};

function cleanLine(value: string, fallback: string) {
  return value.trim().replace(/\s+/g, " ") || fallback;
}

export function createBuilderWaveProposalDraft({
  wave,
  title,
  proposer,
  kind,
  request,
  limits,
  budgetUsd,
  risk,
  decisionRoute,
  ruleReason,
}: BuilderWaveProposalDraftInput) {
  const budget = cleanLine(budgetUsd, "0");

  return [
    "Hook change proposal",
    "",
    `Change: ${cleanLine(title, "Untitled hook work")}`,
    `Proposer: ${cleanLine(proposer, "unknown")}`,
    `Discussion: ${wave.waveUrl}`,
    `Repo: ${wave.repoUrl}`,
    "",
    "What I want to change:",
    cleanLine(request, "No request written yet."),
    "",
    "Limits and tests:",
    cleanLine(limits, "No limits written yet."),
    "",
    "Decision:",
    "Please approve, reject, or ask for edits before any PR work starts.",
    "",
    "Safety:",
    `- ${commandKindLabel(kind)}, ${cleanLine(risk, "unknown")} risk, ${cleanLine(decisionRoute, "needs review")}.`,
    `- ${cleanLine(ruleReason, "No rule reason recorded.")}`,
    "- No deploy, payout, proxy, delegatecall, governance change, or uncapped parameter change in phase 1.",
    `Budget cap: ${budget} USD`,
  ].join("\n");
}
