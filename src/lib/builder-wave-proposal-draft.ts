import type { CommandKind, CommandWave } from "./command-waves";
import { commandKindLabel } from "./command-kind-copy";
import { projectRepoLine } from "./project-repo-copy";

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

function proposalHeading(kind: CommandKind) {
  if (kind === "draft_response") {
    return "Hook question";
  }

  if (kind === "post_to_wave") {
    return "Project update";
  }

  if (kind === "read_context") {
    return "Hook context request";
  }

  return "Hook change proposal";
}

function requestHeading(kind: CommandKind) {
  if (kind === "draft_response") {
    return "Question:";
  }

  if (kind === "post_to_wave") {
    return "Update needed:";
  }

  if (kind === "read_context") {
    return "Context needed:";
  }

  return "What I want to change:";
}

function limitsHeading(kind: CommandKind) {
  if (kind === "draft_response") {
    return "Answer limits:";
  }

  if (kind === "post_to_wave") {
    return "Posting limits:";
  }

  if (kind === "read_context") {
    return "Read limits:";
  }

  return "Limits and tests:";
}

function decisionLine(kind: CommandKind) {
  if (kind === "open_pr") {
    return "Please approve, reject, or ask for edits before any PR work starts.";
  }

  if (kind === "post_to_wave") {
    return "Please approve, reject, or ask for edits before this is shared.";
  }

  return "Please answer, approve, or ask for edits in chat.";
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
    proposalHeading(kind),
    "",
    `Change: ${cleanLine(title, "Untitled hook work")}`,
    `Proposer: ${cleanLine(proposer, "unknown")}`,
    `Project chat: ${wave.waveUrl}`,
    projectRepoLine("Repo", wave.repoUrl),
    "",
    requestHeading(kind),
    cleanLine(request, "No request written yet."),
    "",
    limitsHeading(kind),
    cleanLine(limits, "No limits written yet."),
    "",
    "Decision:",
    decisionLine(kind),
    "",
    "Safety:",
    `- ${commandKindLabel(kind)}, ${cleanLine(risk, "unknown")} risk, ${cleanLine(decisionRoute, "needs review")}.`,
    `- ${cleanLine(ruleReason, "No rule reason recorded.")}`,
    "- No deploy, payout, proxy, delegatecall, governance change, or uncapped parameter change in phase 1.",
    `Budget cap: ${budget} USD`,
  ].join("\n");
}
