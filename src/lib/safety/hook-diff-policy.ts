import type { RiskLevel } from "../command-waves";

export type HookChangedFile = {
  path: string;
  patch?: string | null;
};

export type HookPatchSignalLabel =
  | "upgradeability_pattern"
  | "delegatecall"
  | "destructive_opcode"
  | "deployment_action"
  | "governance_authority"
  | "parameter_write";

export type HookPatchSignal = {
  label: HookPatchSignalLabel;
  risk: Exclude<RiskLevel, "low" | "medium">;
  path: string;
  line: string;
  reason: string;
  defaultBlocked: boolean;
};

const patchRules: Array<{
  label: HookPatchSignalLabel;
  risk: Exclude<RiskLevel, "low" | "medium">;
  pattern: RegExp;
  reason: string;
  defaultBlocked?: boolean;
}> = [
  {
    label: "upgradeability_pattern",
    risk: "critical",
    pattern:
      /\b(UUPSUpgradeable|TransparentUpgradeableProxy|ERC1967|Initializable|initializer|reinitializer|upgradeTo(?:AndCall)?|_authorizeUpgrade|proxiableUUID)\b/i,
    reason: "Added Solidity code contains an upgradeability pattern.",
    defaultBlocked: true,
  },
  {
    label: "delegatecall",
    risk: "critical",
    pattern: /\bdelegatecall\s*\(/i,
    reason: "Added Solidity code contains delegatecall.",
    defaultBlocked: true,
  },
  {
    label: "destructive_opcode",
    risk: "critical",
    pattern: /\b(selfdestruct|suicide)\s*\(/i,
    reason: "Added Solidity code contains a destructive opcode.",
    defaultBlocked: true,
  },
  {
    label: "deployment_action",
    risk: "high",
    pattern: /\b(vm\.broadcast|vm\.startBroadcast|create2|new\s+[A-Z][A-Za-z0-9_]*\s*\(|deploy(?:er|ment)?)\b/i,
    reason: "Added Solidity code appears to deploy or publish contracts.",
  },
  {
    label: "governance_authority",
    risk: "critical",
    pattern:
      /\b(Ownable|onlyOwner|AccessControl|DEFAULT_ADMIN_ROLE|grantRole|revokeRole|transferOwnership|acceptOwnership|TimelockController|GnosisSafe|threshold)\b/i,
    reason: "Added Solidity code changes owner, role, timelock, Safe, or threshold authority.",
  },
  {
    label: "parameter_write",
    risk: "high",
    pattern:
      /\b(function\s+set[A-Za-z0-9_]*(?:Fee|Limit|Cap|Parameter|Config)|set(?:Fee|Limit|Cap|Parameter|Config)[A-Za-z0-9_]*\s*\(|(?:fee|limit|cap|bps)[A-Za-z0-9_]*\s*=)/i,
    reason: "Added Solidity code writes hook fee, cap, limit, parameter, or config state.",
  },
];

function isSolidityPath(path: string) {
  return /\.sol$/i.test(path);
}

function addedPatchLines(patch: string) {
  return patch
    .split(/\r?\n/)
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1).trim())
    .filter((line) => line && !line.startsWith("//") && !line.startsWith("*") && !line.startsWith("/*"));
}

function dedupeSignals(signals: HookPatchSignal[]) {
  const seen = new Set<string>();

  return signals.filter((signal) => {
    const key = `${signal.label}:${signal.path}:${signal.line}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function normalizeChangedFiles(files: HookChangedFile[] = []) {
  return [...files]
    .filter((file) => file.path.trim())
    .map((file) => ({
      path: file.path.trim(),
      patch: typeof file.patch === "string" ? file.patch : null,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function findHookPatchSignals(files: HookChangedFile[] = []) {
  const signals: HookPatchSignal[] = [];

  for (const file of normalizeChangedFiles(files)) {
    if (!isSolidityPath(file.path) || !file.patch) {
      continue;
    }

    for (const line of addedPatchLines(file.patch)) {
      for (const rule of patchRules) {
        if (rule.pattern.test(line)) {
          signals.push({
            label: rule.label,
            risk: rule.risk,
            path: file.path,
            line,
            reason: rule.reason,
            defaultBlocked: rule.defaultBlocked ?? false,
          });
        }
      }
    }
  }

  return dedupeSignals(signals);
}

export function riskAllowsHookPatchSignal({
  risk,
  signal,
  upgradeabilityExceptionApproved = false,
}: {
  risk: RiskLevel;
  signal: HookPatchSignal;
  upgradeabilityExceptionApproved?: boolean;
}) {
  if (signal.defaultBlocked) {
    return signal.label === "upgradeability_pattern" && risk === "critical" && upgradeabilityExceptionApproved;
  }

  if (signal.risk === "high") {
    return risk === "high" || risk === "critical";
  }

  return risk === "critical";
}
