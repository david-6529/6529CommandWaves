import { findHookContractSignals, type HookContractSignal } from "./safety/hook-contract-policy";
import { evaluateHookParameterPolicy, type HookParameterPolicyCheck } from "./safety/hook-parameter-policy";

export type HookProposalPreflightCheck = {
  id: string;
  label: string;
  status: "pass" | "fail";
  message: string;
};

export type HookProposalPreflight = {
  status: "pass" | "fail";
  statusLabel: string;
  summary: string;
  checks: HookProposalPreflightCheck[];
  signals: HookContractSignal[];
  parameterChecks: HookParameterPolicyCheck[];
};

const blockedSignalLabels = new Set<HookContractSignal["label"]>(["deployment", "governance_change", "upgradeability"]);

function labelForCheck(id: string) {
  const labels: Record<string, string> = {
    hook_parameter_immutable_default: "Immutable default",
    hook_parameter_explicit_bound: "Explicit cap",
    hook_parameter_bound_tests: "Bound tests",
    hook_parameter_not_requested: "Parameter scope",
    hook_parameter_live_holder_authority: "Holder authority",
  };

  return labels[id] ?? id.replaceAll("_", " ");
}

function signalLabel(label: HookContractSignal["label"]) {
  return label.replaceAll("_", " ");
}

function signalMessage(signal: HookContractSignal) {
  if (signal.label === "deployment") {
    return "Deployment work is parked for phase 1. Keep this command to PR work and tests.";
  }

  if (signal.label === "governance_change") {
    return "Governance changes are parked for phase 1. Keep authority changes out of this command.";
  }

  if (signal.label === "upgradeability") {
    return "Upgradeable hook patterns are blocked for phase 1.";
  }

  return signal.reason;
}

function signalToCheck(signal: HookContractSignal): HookProposalPreflightCheck {
  return {
    id: `hook_signal_${signal.label}_${signal.source}_${signal.value}`,
    label: signalLabel(signal.label),
    status: blockedSignalLabels.has(signal.label) ? "fail" : "pass",
    message: signalMessage(signal),
  };
}

function noBlockedLanguageCheck(signals: HookContractSignal[]): HookProposalPreflightCheck {
  const blocked = signals.filter((signal) => blockedSignalLabels.has(signal.label));

  return {
    id: "hook_proposal_blocked_language",
    label: "Blocked language",
    status: blocked.length ? "fail" : "pass",
    message: blocked.length
      ? "Remove deployment, governance, or upgradeability work from the phase 1 command."
      : "No deployment, governance, or upgradeability request is active in the command text.",
  };
}

function summaryFor(status: HookProposalPreflight["status"]) {
  if (status === "pass") {
    return "Hook proposal preflight is clear for phase 1.";
  }

  return "Fix blocked hook language before asking the wave to approve this command.";
}

export function createHookProposalPreflight({
  command,
  criteria,
}: {
  command: string;
  criteria: string;
}): HookProposalPreflight {
  const proposalText = `${command}\n${criteria}`;
  const signals = findHookContractSignals({ proposalText });
  const signalChecks = [noBlockedLanguageCheck(signals), ...signals.map(signalToCheck)];
  const parameterChecks = evaluateHookParameterPolicy({
    proposalText,
    hookSignals: signals,
  });
  const checks = [
    ...signalChecks,
    ...parameterChecks.map((check) => ({
      id: check.id,
      label: labelForCheck(check.id),
      status: check.status,
      message: check.message,
    })),
  ];
  const status = checks.some((check) => check.status === "fail") ? "fail" : "pass";

  return {
    status,
    statusLabel: status === "pass" ? "clear" : "needs fixes",
    summary: summaryFor(status),
    checks,
    signals,
    parameterChecks,
  };
}
