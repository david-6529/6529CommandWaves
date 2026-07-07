import type { HookContractSignal } from "./hook-contract-policy";
import type { HookChangedFile, HookPatchSignal } from "./hook-diff-policy";

export type HookParameterPolicyCheck = {
  id: string;
  status: "pass" | "fail";
  message: string;
};

export const hookParameterPolicySummary = [
  "Hook contracts are immutable by default.",
  "Any fee, limit, or config parameter change must name an explicit cap.",
  "Parameter work must include bound-focused tests or equivalent reviewer evidence.",
  "REP, TDH, and holder thresholds are notes only until live weighting is wired.",
] as const;

const parameterPathPattern = /(^|\/)(.*parameter.*|.*config.*|.*constant.*|.*fee.*|.*limit.*)\.sol$/i;
const parameterTextPattern = /\b(fee|fees|bps|basis points?|parameter|parameters|bounds?|bounded|limit|limits|config|constant|tweakable)\b/i;
const parameterTestPattern =
  /\b(test|tests|tested|testing|invariant|property|fuzz|forge test|unit test)\b|function\s+test[A-Za-z0-9_]*/i;
const parameterBoundTestPattern =
  /\b(bound|bounds|bounded|cap|capped|max|maximum|limit|fee|fees|parameter|parameters|bps|basis points?)\b|(?:fee|cap|max|bps)[A-Za-z0-9_]*(?:fee|cap|max|bps)/i;
const liveHolderAuthorityPattern = /\b(rep|tdh|holder|holders|weighted vote|weighted voting)\b/i;
const nonEnforcedAuthorityPattern =
  /\b(planned|not enforced|not live|manual|future|advisory|note only|notes only|informational)\b/i;
const testPathPattern = /(^|\/)(test|tests|spec)(\/|\.|$)|\.t\.sol$|[\w.-]+(?:test|spec)\.(?:sol|ts|tsx|js|jsx)$/i;

const numericBoundPatterns = [
  /\b(?:max(?:imum)?|cap(?:ped)?(?: at| to)?|upper bound|not exceed|no more than|at most|limit(?:ed)? to|bounded (?:at|by|to|under))\s+\d+(?:\.\d+)?\s*(?:%|bps|basis points?|wei|gwei|eth|usd|tokens?|days?|hours?|blocks?)?\b/i,
  /\b\d+(?:\.\d+)?\s*(?:%|bps|basis points?|wei|gwei|eth|usd|tokens?|days?|hours?|blocks?)?\s+(?:max(?:imum)?|cap|upper bound|limit)\b/i,
];

function removeNegatedParameterClauses(value: string) {
  return value.replace(
    /\b(?:do not|don't|no)\s+[^.!?\n]*(?:fee|fees|bps|basis points?|parameter|parameters|bounds?|bounded|limit|limits|config|constant|tweakable)[^.!?\n]*/gi,
    " ",
  );
}

export function hasExplicitHookParameterBound(value: string) {
  return numericBoundPatterns.some((pattern) => pattern.test(value));
}

function hasParameterBoundEvidence(value: string) {
  return hasExplicitHookParameterBound(value);
}

function hasParameterTestEvidence(value: string) {
  return parameterTestPattern.test(value) && parameterBoundTestPattern.test(value);
}

function addedPatchText(patch: string) {
  return patch
    .split(/\r?\n/)
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1).trim())
    .join("\n");
}

function hasPrBoundTestEvidence({
  changedPaths,
  changedFiles,
}: {
  changedPaths: string[];
  changedFiles: HookChangedFile[];
}) {
  const changedTestPath = changedPaths.some((path) => testPathPattern.test(path));
  const changedTestFiles = changedFiles.filter((file) => testPathPattern.test(file.path));

  if (!changedTestPath && !changedTestFiles.length) {
    return false;
  }

  if (!changedTestFiles.length || changedTestFiles.some((file) => !file.patch)) {
    return true;
  }

  return changedTestFiles.some((file) => hasParameterTestEvidence(addedPatchText(file.patch ?? "")));
}

function claimsLiveHolderAuthority(value: string) {
  return liveHolderAuthorityPattern.test(value) && !nonEnforcedAuthorityPattern.test(value);
}

export function evaluateHookParameterPolicy({
  proposalText = "",
  changedPaths = [],
  hookSignals = [],
  hookPatchSignals = [],
  changedFiles = [],
}: {
  proposalText?: string;
  changedPaths?: string[];
  hookSignals?: HookContractSignal[];
  hookPatchSignals?: HookPatchSignal[];
  changedFiles?: HookChangedFile[];
}): HookParameterPolicyCheck[] {
  const normalizedChangedPaths = changedPaths.map((path) => path.trim()).filter(Boolean);
  const normalizedChangedFiles = changedFiles.map((file) => ({
    path: file.path.trim(),
    patch: typeof file.patch === "string" ? file.patch : null,
  })).filter((file) => file.path);
  const checkedProposalText = removeNegatedParameterClauses(proposalText);
  const hasParameterWritePatch = hookPatchSignals.some((signal) => signal.label === "parameter_write");
  const touchesParameterChange =
    hookSignals.some((signal) => signal.label === "parameter_change") ||
    normalizedChangedPaths.some((path) => parameterPathPattern.test(path)) ||
    hasParameterWritePatch ||
    parameterTextPattern.test(checkedProposalText);
  const checks: HookParameterPolicyCheck[] = [
    {
      id: "hook_parameter_immutable_default",
      status: "pass",
      message: "Hook contracts stay immutable by default; only named parameter surfaces can change.",
    },
  ];

  if (touchesParameterChange) {
    checks.push({
      id: "hook_parameter_explicit_bound",
      status: hasParameterBoundEvidence(proposalText) ? "pass" : "fail",
      message: hasParameterBoundEvidence(proposalText)
        ? "Hook parameter work names an explicit numeric cap or upper bound."
        : "Hook parameter work must name an explicit numeric cap or upper bound in the approved command.",
    });
    checks.push({
      id: "hook_parameter_bound_tests",
      status: hasParameterTestEvidence(proposalText) ? "pass" : "fail",
      message: hasParameterTestEvidence(proposalText)
        ? "Hook parameter work includes bound-focused test or review evidence language."
        : "Hook parameter work must include tests or equivalent reviewer evidence for the named bounds.",
    });

    if (hasParameterWritePatch) {
      const hasPrTests = hasPrBoundTestEvidence({
        changedPaths: normalizedChangedPaths,
        changedFiles: normalizedChangedFiles,
      });

      checks.push({
        id: "hook_parameter_pr_bound_tests",
        status: hasPrTests ? "pass" : "fail",
        message: hasPrTests
          ? "PR changes include test evidence for the bounded parameter write."
          : "PR changes that write hook parameters must include a changed bound-focused test file.",
      });
    }
  } else {
    checks.push({
      id: "hook_parameter_not_requested",
      status: "pass",
      message: "No hook parameter change was detected in the approved command or changed paths.",
    });
  }

  checks.push({
    id: "hook_parameter_live_holder_authority",
    status: claimsLiveHolderAuthority(proposalText) ? "fail" : "pass",
    message: claimsLiveHolderAuthority(proposalText)
      ? "REP, TDH, or holder threshold language is not enforceable here yet; state it as planned or wire live weighting first."
      : "REP, TDH, and holder threshold language is not treated as live authority unless explicitly wired.",
  });

  return checks;
}
