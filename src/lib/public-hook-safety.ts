import { hookParameterPolicySummary } from "./safety/hook-parameter-policy";

export const publicHookSafety = {
  immutableDefault: true,
  summary: "Hook contracts are immutable by default. Parameter changes need explicit caps and bound-focused tests.",
  parameterPolicy: [...hookParameterPolicySummary],
  blockedInPhaseOne: [
    "Upgradeable proxy, UUPS, diamond, initializer, clone, and delegatecall patterns are outside this phase.",
    "Deploy scripts, chain publishing, payments, owner changes, role changes, and governance changes stay outside this app.",
    "REP, TDH, or holder authority is not live unless wired and verified.",
  ],
  reviewEvidence: [
    "Approved proposal and project decision link.",
    "Bound-focused tests or reviewer evidence for capped parameters.",
    "Reviewer proof tied to rules hash and wave state hash.",
  ],
} as const;

export type PublicHookSafety = typeof publicHookSafety;
