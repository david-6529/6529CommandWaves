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
}: BuilderWaveProposalDraftInput) {
  const budget = cleanLine(budgetUsd, "0");

  return [
    "6529 hook proposal",
    "",
    `Builder wave: ${wave.waveUrl}`,
    `GitHub repo: ${wave.repoUrl}`,
    `Proposer: ${cleanLine(proposer, "unknown")}`,
    `Work type: ${commandKindLabel(kind)}`,
    `Title: ${cleanLine(title, "Untitled hook work")}`,
    "",
    "Request:",
    cleanLine(request, "No request written yet."),
    "",
    "Limits and success criteria:",
    cleanLine(limits, "No limits written yet."),
    "",
    `Budget cap: ${budget} USD`,
    "",
    "Decision needed: approve, reject, or ask for edits in this builder wave before PR work starts.",
    "Guardrails: no deploy, payout, proxy, delegatecall, governance change, or uncapped parameter change in phase 1.",
  ].join("\n");
}
