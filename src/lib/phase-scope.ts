export type PhaseScopeInventory = {
  useNow: string[];
  parkLater: string[];
};

export const firstPhaseScopeInventory: PhaseScopeInventory = {
  useNow: [
    "One 6529 hook room and one GitHub hook repo.",
    "6529 hook project snapshot with room, code, PR, and review state.",
    "PR-sized hook changes with clear limits and tests.",
    "Manual 6529 decision receipts before PR work runs.",
    "Codex work packets for prepared branches and draft PRs.",
    "Reviewer checks for manifests, risky files, caps, and hook guardrails.",
    "Contribution and fee evidence for separate human decisions.",
  ],
  parkLater: [
    "Live REP, TDH, holder, allowlist, or QnA authority.",
    "Automatic payouts, merges, deploys, or governance changes.",
    "Broad swarm marketplace flows or external agent endpoints.",
    "Upgradeable hook contracts by default.",
    "Parameter changes without explicit caps and bound-focused tests.",
    "AI report scores as permissions, payouts, REP, TDH, or merge rights.",
  ],
} as const;
