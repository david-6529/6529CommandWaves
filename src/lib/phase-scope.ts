export type PhaseScopeInventory = {
  useNow: string[];
  parkLater: string[];
};

export const firstPhaseScopeInventory: PhaseScopeInventory = {
  useNow: [
    "One public project chat and one GitHub repo.",
    "Project snapshot with chat, code, PR, and review state.",
    "PR-sized hook changes with clear limits and tests.",
    "Manual project decision receipts before PR work runs.",
    "Codex work packets for prepared branches and draft PRs.",
    "Reviewer checks for manifests, risky files, caps, and hook guardrails.",
    "Contribution and fee records for separate human decisions.",
  ],
  parkLater: [
    "Live reputation, token, holder, allowlist, or QnA authority.",
    "Automatic payouts, merges, deploys, or governance changes.",
    "Broad swarm marketplace flows or external agent endpoints.",
    "Upgradeable hook contracts by default.",
    "Parameter changes without explicit caps and bound-focused tests.",
    "AI report scores as permissions, payouts, reputation, token weight, or merge rights.",
  ],
} as const;
