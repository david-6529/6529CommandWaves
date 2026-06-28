import type { HookContractSignal } from "./hook-contract-policy";

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
const parameterTestPattern = /\b(test|tests|tested|testing|invariant|property|fuzz|forge test|unit test)\b/i;
const parameterBoundTestPattern = /\b(bound|bounds|bounded|cap|capped|max|maximum|limit|fee|fees|parameter|parameters|bps|basis points?)\b/i;
const liveHolderAuthorityPattern = /\b(rep|tdh|holder|holders|weighted vote|weighted voting)\b/i;
const nonEnforcedAuthorityPattern =
  /\b(planned|not enforced|not live|manual|future|advisory|note only|notes only|informational)\b/i;

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

function claimsLiveHolderAuthority(value: string) {
  return liveHolderAuthorityPattern.test(value) && !nonEnforcedAuthorityPattern.test(value);
}

export function evaluateHookParameterPolicy({
  proposalText = "",
  changedPaths = [],
  hookSignals = [],
}: {
  proposalText?: string;
  changedPaths?: string[];
  hookSignals?: HookContractSignal[];
}): HookParameterPolicyCheck[] {
  const checkedProposalText = removeNegatedParameterClauses(proposalText);
  const touchesParameterChange =
    hookSignals.some((signal) => signal.label === "parameter_change") ||
    changedPaths.some((path) => parameterPathPattern.test(path)) ||
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
