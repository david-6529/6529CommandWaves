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
    "Hook proposal",
    "",
    "I want to propose one small change for the 6529 hook build.",
    "",
    `Proposer: ${cleanLine(proposer, "unknown")}`,
    `Small change: ${cleanLine(title, "Untitled hook work")}`,
    `6529 discussion: ${wave.waveUrl}`,
    `Repo: ${wave.repoUrl}`,
    `Work type: ${commandKindLabel(kind)}`,
    "",
    "What should happen:",
    cleanLine(request, "No request written yet."),
    "",
    "Limits and success criteria:",
    cleanLine(limits, "No limits written yet."),
    "",
    "Review path:",
    `Risk: ${cleanLine(risk, "unknown")}`,
    `Decision route: ${cleanLine(decisionRoute, "needs review")}`,
    `Rule: ${cleanLine(ruleReason, "No rule reason recorded.")}`,
    "",
    `Budget cap: ${budget} USD`,
    "",
    "Decision needed: approve, reject, or ask for edits in the 6529 discussion before PR work starts.",
    "Guardrails: no deploy, payout, proxy, delegatecall, governance change, or uncapped parameter change in phase 1.",
  ].join("\n");
}
