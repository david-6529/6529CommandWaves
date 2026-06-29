# Command Waves MVP Plan

## Product Definition

A Command Wave is a 6529 project wave that governs scoped work in a GitHub repo.

For the first public phase, the product helps the community build a 6529 hook together. People and agents propose commands in plain English. Rules decide whether a command can run now or needs a visible decision. Approved commands can run through a controlled agent adapter. The result is reviewed and logged so the wave can see what happened.

The underlying workflow should be reusable for future public hook projects. The first shipped UI should feel like one standalone 6529 Hook project site so anyone can see the hook, its builder wave, its GitHub repo, and the current code review state.

6529 remains the live conversation and decision layer. The app should act as a snapshot and project dashboard: recent wave context, approved commands, PR evidence, review evidence, launch evidence, and contribution reporting are easier to inspect here.

The simplest product view is:

```text
Wave snapshot -> Code state -> PR -> Review
```

## Roles

- **Wave participants:** propose commands, vote when the rules require it, and inspect results.
- **Agent worker:** helps with approved PR work through a constrained Codex packet and GitHub draft PR flow.
- **Reviewer:** checks the agent output against the approved command, vote, rules, architecture, security, and expected artifacts.

Implementation names can evolve later. The user-facing MVP should lead with wave, command, vote, run, and review.

## Core Objects

- **CommandWave:** project workspace tied to a 6529 wave and optionally a GitHub repo.
- **Rules:** versioned policy for command types, quorum, thresholds, expiry, allowed tools, and blocked actions.
- **Proposal:** a requested command with prompt, spec, risk, proposer, budget, and status.
- **Poll:** yes/no vote with quorum and yes threshold.
- **Vote:** voter identity, yes/no choice, weight, source, and timestamp. A voter can only vote once per poll.
- **Execution:** agent run record with harness, artifacts, cost, logs, and status.
- **Review:** reviewer decision and checks.
- **LedgerEvent:** append-only audit event for every state transition.

## MVP State Machine

```text
Proposal
  -> Rule Check
  -> Blocked by Rules? -> Rejected + Ledger
  -> Poll Required?
    -> Poll Open
    -> Passed / Failed / Expired / Overridden
  -> Execute
  -> Review
  -> Complete / Changes Requested / Rule Violation
  -> Ledger
```

## Rule Defaults

- Read context: no poll.
- Draft response: no poll.
- Post to wave: poll.
- Open PR: poll.
- Run script: blocked in phase 1.
- Deploy: blocked in phase 1.
- Spend money: blocked in phase 1.
- Change rules: blocked in phase 1.

Polls require a voter identity for every yes/no vote. Duplicate votes from the same identity are rejected server-side.
Later phases can add stricter approval paths for parked command kinds after the community has a proven hook-building loop.

## First Real Demo

1. A builder wave is linked to the 6529 hook smart contract repo.
2. A member proposes: "Draft the non-upgradeable hook scaffold with fee parameters capped at 100 bps and tests."
3. The rule engine classifies it as `open_pr`, high risk, vote required.
4. The wave decision approves the scoped work.
5. The operator records the decision drop URL as a manual approval receipt.
6. The agent opens a PR with a Command Waves manifest.
7. The GitHub reviewer gate checks the PR manifest, vote or receipt status, rules hash, approved prompt/spec hashes, risky file changes, and hook contract signals.
8. A reviewer verifies tests, contract guardrails, and changed files before humans merge.
9. The result, contribution activity, manual developer fee evidence, and launch packet are prepared for human review.

## Non-Goals For First Demo

- No autonomous deploys.
- No spending.
- No automatic merges.
- No automatic payouts.
- No token-weighted voting until manual gating works.
- No broad multi-agent swarm marketplace.
- No upgradeable hook contracts by default.
- No parameter work without an explicit cap and bound-focused tests.
- No AI contribution score as an authority source.

## Safety Boundaries

The first version assumes prompt injection will happen and that reputation alone is not enough.

- Permissions are the security boundary.
- Agents never receive wallet private keys, provider secrets, database credentials, or broad filesystem access through prompts.
- Dangerous actions go through backend adapters with explicit rule checks.
- Phase-one command kinds map to explicit tool permission classes such as `wave.read`, `wave.post`, and `repo.open_pr`.
- Deploy, funds, script, and rule-change permissions are reserved for later phases and stay blocked in the app.
- The agent can only run an approved proposal.
- The reviewer must check artifacts before a command is marked complete.
- Hook contract work must flag deployment files, governance changes, explicit parameter caps, and upgradeability patterns.
- Upgradeability requires an explicit exception and critical approval.
- Every proposal, vote, execution, review, and setup change is logged.
- External agent endpoints are out of scope until signed manifests, payload limits, timeouts, domain allowlists, and tool permissions exist.

## Production Architecture Direction

The external app should be the control panel for setup, rules, queue status, and audits. The 6529 waves should remain where proposals, votes, decisions, and results are visible to participants.

Initial adapters:

1. 6529 API adapter for wave search, posting, and reading.
2. GitHub adapter for repo metadata and draft PR creation from prepared branches.
3. Agent adapter for Codex runs.
4. Reviewer adapter for PR diff review, rule compliance, and smart contract safety checks.
5. Contribution report adapter that summarizes activity without granting permissions.
6. Ledger persistence with rule/version hashes.

The GitHub PR adapter is intentionally narrow. It opens a draft PR only after a controlled harness has prepared the branch,
and it includes the Command Waves manifest in the PR body. It does not create merges, deploys, payments, or governance
changes.

The first public launch sequence is in [first-hook-launch-playbook.md](first-hook-launch-playbook.md).

The production table plan is in [data-model.md](data-model.md).
The GitHub merge gate plan is in [github-reviewer-gate.md](github-reviewer-gate.md).
