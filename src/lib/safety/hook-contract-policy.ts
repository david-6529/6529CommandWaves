import type { RiskLevel } from "../command-waves";

export type HookContractSignalLabel =
  | "contract_code"
  | "deployment"
  | "parameter_change"
  | "governance_change"
  | "upgradeability";

export type HookContractSignal = {
  label: HookContractSignalLabel;
  risk: Exclude<RiskLevel, "low">;
  source: "path" | "proposal";
  value: string;
  reason: string;
  defaultBlocked: boolean;
};

const pathRules: Array<{
  label: HookContractSignalLabel;
  risk: Exclude<RiskLevel, "low">;
  pattern: RegExp;
  reason: string;
  defaultBlocked?: boolean;
}> = [
  {
    label: "contract_code",
    risk: "medium",
    pattern: /(^|\/)contracts\/.*\.sol$/i,
    reason: "Smart contract source changes require contract-aware review.",
  },
  {
    label: "deployment",
    risk: "high",
    pattern: /(^|\/)(script|scripts|deploy|deployments|broadcast)(\/|\.|$)|(^|\/)(hardhat|foundry)\.config\./i,
    reason: "Deployment scripts and chain config can publish contracts or change deployment behavior.",
  },
  {
    label: "parameter_change",
    risk: "high",
    pattern: /(^|\/)(.*parameter.*|.*config.*|.*constant.*|.*fee.*|.*limit.*)\.sol$/i,
    reason: "Hook parameters must stay bounded and visible to the wave.",
  },
  {
    label: "governance_change",
    risk: "critical",
    pattern: /(^|\/)(.*govern.*|.*owner.*|.*access.*|.*role.*|.*timelock.*|.*safe.*)\.sol$/i,
    reason: "Governance and authority changes can alter who controls the hook.",
  },
  {
    label: "upgradeability",
    risk: "critical",
    pattern: /(^|\/)(.*proxy.*|.*upgrade.*|.*uups.*|.*diamond.*)\.sol$/i,
    reason: "The first hook phase defaults to immutable contracts, not upgradeable proxies.",
    defaultBlocked: true,
  },
];

const proposalRules: Array<{
  label: HookContractSignalLabel;
  risk: Exclude<RiskLevel, "low">;
  pattern: RegExp;
  value: string;
  reason: string;
  defaultBlocked?: boolean;
}> = [
  {
    label: "contract_code",
    risk: "medium",
    pattern: /\b(solidity|smart contract|hook contract|hook scaffold|contract work)\b/i,
    value: "contract work",
    reason: "The command says it touches smart contract work.",
  },
  {
    label: "deployment",
    risk: "high",
    pattern: /\b(deploy|deployment|broadcast|verify contract|chain config)\b/i,
    value: "deployment action",
    reason: "The command mentions deployment or chain publishing behavior.",
  },
  {
    label: "parameter_change",
    risk: "high",
    pattern: /\b(fee|fees|bps|basis points?|parameter|parameters|bounds?|limit|limits|tweakable)\b/i,
    value: "parameter change",
    reason: "The command mentions hook parameters that need explicit bounds.",
  },
  {
    label: "governance_change",
    risk: "critical",
    pattern: /\b(governance|governor|owner|access control|role|roles|safe|timelock|threshold|quorum|tdh)\b/i,
    value: "governance change",
    reason: "The command mentions authority or governance control.",
  },
  {
    label: "upgradeability",
    risk: "critical",
    pattern: /\b(upgradeable|upgradeability|proxy|uups|transparentupgradeableproxy|delegatecall|initializer|implementation slot|diamond)\b/i,
    value: "upgradeability pattern",
    reason: "The first hook phase defaults to immutable contracts unless an exception is explicitly approved.",
    defaultBlocked: true,
  },
];

function removeNegatedHookClauses(value: string) {
  return value
    .replace(/\bnon[-\s]upgradeable\b/gi, " ")
    .replace(
      /\b(?:do not|don't|no)\s+[^.!?\n]*(?:upgradeable|upgradeability|proxy|uups|delegatecall|initializer|deploy|deployment|governance|owner|access control|role|safe|timelock|threshold|quorum|tdh)[^.!?\n]*/gi,
      " ",
    );
}

function dedupeSignals(signals: HookContractSignal[]) {
  const seen = new Set<string>();

  return signals.filter((signal) => {
    const key = `${signal.label}:${signal.source}:${signal.value}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function findHookContractSignals({
  changedPaths = [],
  proposalText = "",
}: {
  changedPaths?: string[];
  proposalText?: string;
}) {
  const signals: HookContractSignal[] = [];
  const checkedProposalText = removeNegatedHookClauses(proposalText);

  for (const path of changedPaths) {
    for (const rule of pathRules) {
      if (rule.pattern.test(path)) {
        signals.push({
          label: rule.label,
          risk: rule.risk,
          source: "path",
          value: path,
          reason: rule.reason,
          defaultBlocked: rule.defaultBlocked ?? false,
        });
      }
    }
  }

  for (const rule of proposalRules) {
    if (rule.pattern.test(checkedProposalText)) {
      signals.push({
        label: rule.label,
        risk: rule.risk,
        source: "proposal",
        value: rule.value,
        reason: rule.reason,
        defaultBlocked: rule.defaultBlocked ?? false,
      });
    }
  }

  return dedupeSignals(signals);
}

export function proposalAllowsUpgradeabilityException(proposalText: string) {
  return /\bexplicit upgradeability exception approved\b/i.test(proposalText);
}

export function riskAllowsHookContractSignal({
  risk,
  signal,
  upgradeabilityExceptionApproved = false,
}: {
  risk: RiskLevel;
  signal: HookContractSignal;
  upgradeabilityExceptionApproved?: boolean;
}) {
  if (signal.defaultBlocked) {
    return risk === "critical" && upgradeabilityExceptionApproved;
  }

  if (signal.risk === "medium") {
    return risk === "medium" || risk === "high" || risk === "critical";
  }

  if (signal.risk === "high") {
    return risk === "high" || risk === "critical";
  }

  return risk === "critical";
}
