import { commandKindLabel } from "./command-kind-copy";
import {
  validateWaveDecisionReference,
  type CommandProposal,
  type CommandWave,
  type PollState,
  type RiskLevel,
} from "./command-waves";

export type CommandOrchestrationSummary = {
  workType: string;
  risk: RiskLevel | "waiting";
  decisionRoute: string;
  ruleReason: string;
  reviewerRoute: string;
};

function routeForRule(wave: CommandWave, proposal: CommandProposal) {
  const rule = wave.rules.rulesByKind[proposal.kind];

  if (!rule) {
    return "needs rule review";
  }

  if (rule.mode === "blocked") {
    return "blocked by current rules";
  }

  if (rule.mode === "auto") {
    return "allowed by current rules";
  }

  return `vote required, quorum ${rule.quorum}, yes threshold ${rule.yesPercent}%`;
}

function routeForPoll(wave: CommandWave, proposal: CommandProposal, poll: PollState) {
  const route = `vote required, quorum ${poll.quorumRequired}, yes threshold ${poll.yesPercentRequired}%`;

  if (poll.decision) {
    const referenceCheck = validateWaveDecisionReference({
      reference: poll.decision.url ?? poll.decision.dropId ?? "",
      waveUrl: wave.waveUrl,
      requireUrl: proposal.kind === "open_pr",
    });

    if (!referenceCheck.ok) {
      return `${route}, receipt needs fix: ${referenceCheck.message}`;
    }

    return `${route}, decision receipt recorded`;
  }

  if (poll.status === "passed") {
    return `${route}, record the 6529 decision URL`;
  }

  if (poll.status === "failed") {
    return `${route}, vote failed`;
  }

  if (poll.status === "open") {
    return `${route}, vote open`;
  }

  return `${route}, ${poll.status.replaceAll("_", " ")}`;
}

export function createCommandOrchestrationSummary({
  wave,
  proposal,
  poll,
}: {
  wave: CommandWave;
  proposal: CommandProposal | null;
  poll: PollState | null;
}): CommandOrchestrationSummary {
  if (!proposal) {
    return {
      workType: "No work selected",
      risk: "waiting",
      decisionRoute: "waiting for one scoped hook change",
      ruleReason: "No rule applies until work is proposed.",
      reviewerRoute: "PR work needs reviewer CI before human merge.",
    };
  }

  const rule = wave.rules.rulesByKind[proposal.kind];

  return {
    workType: commandKindLabel(proposal.kind),
    risk: proposal.risk,
    decisionRoute: poll ? routeForPoll(wave, proposal, poll) : routeForRule(wave, proposal),
    ruleReason: rule?.reason ?? "No rule reason recorded.",
    reviewerRoute:
      proposal.kind === "open_pr"
        ? "Reviewer CI checks the PR manifest, rules, risk, hook guardrails, and records before human merge."
        : "Support items stay outside the PR build step.",
  };
}
