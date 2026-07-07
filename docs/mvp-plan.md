# Command Waves MVP Plan

## Product Definition

A Command Wave is a project workspace where public chat governs scoped work in a GitHub repo.

For the first public phase, the product helps the community build a 6529 hook together. Access notes explain who can join. People and agents propose work in plain English. The daemon account summarizes chat, classifies risk, keeps scope small, and routes important work to a visible decision. Approved work can move into a controlled PR flow. Reviewer checks are placeholders for this phase, and humans stay in charge of merge, deploy, payment, and governance decisions.

The underlying workflow should be reusable for future public open source projects. The first shipped UI should feel like a focused project workspace so anyone can see the access notes, chat activity, repo setup status, current code review state, and next action.

6529 remains the live conversation and decision layer for this pilot. The app should act as a snapshot and project dashboard: recent chat context, approved work, risk classifications, PR evidence, review evidence, launch evidence, and contribution reporting are easier to inspect here.
Maintainer setup, guardrails, and readiness checks should stay available without leading the public project experience.
The proposal path should ask for the change, limits, and success criteria first. Work type, proposer identity, and budget settings can stay available as advanced controls.

The simplest product view is:

```text
Access -> Chat -> Decision -> PR -> Review
```

## Roles

- **Builders:** request access, propose ideas or code, vote when rules require it, and inspect results.
- **Orchestration agent:** the 6529 account `daemon`, acts as the hook expert, summarizes chat input, classifies risk, applies rules, and prepares scoped PR work.
- **Agent worker:** helps with approved PR work through a constrained Codex packet and GitHub draft PR flow.
- **Reviewer agent:** placeholder for now. The production reviewer should check the PR against the approved work, decision, rules, architecture, security, and expected artifacts before humans merge.

Implementation names can evolve later. The user-facing MVP should lead with access, chat, proposal, decision, PR, and review.

## Core Objects

- **CommandWave:** project workspace tied to a 6529 wave and optionally a GitHub repo.
- **Access notes:** participation notes for REP, TDH, allowlists, QnA, or manual admission. They are advisory until live enforcement is wired.
- **Rules:** versioned policy for command types, risk, quorum, thresholds, expiry, allowed tools, and blocked actions.
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

1. A public project chat is linked to the 6529 hook smart contract repo.
2. A member proposes: "Draft the non-upgradeable hook scaffold with fee parameters capped at 100 bps and tests."
3. The orchestration rules classify it as `open_pr`, high risk, vote required.
4. The project decision approves the scoped work.
5. The operator records the decision URL as a manual approval receipt.
6. The agent opens a PR with a Command Waves manifest.
7. The GitHub reviewer gate checks the PR manifest, vote or receipt status, rules hash, approved prompt/spec hashes, risky file changes, and hook contract signals.
8. Reviewer CI verifies tests, contract guardrails, and changed files before humans merge.
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
- No AI contribution report score as an authority source.

## Safety Boundaries

The first version assumes prompt injection will happen and that reputation alone is not enough.

- Permissions are the security boundary.
- Agents never receive wallet private keys, provider secrets, database credentials, or broad filesystem access through prompts.
- Dangerous actions go through backend adapters with explicit rule checks.
- Phase-one command kinds map to explicit tool permission classes such as `wave.read`, `wave.draft`, and `repo.open_pr`.
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

1. 6529 API adapter for wave search, reading, and human-reviewed update drafts.
2. GitHub adapter for repo metadata, branch preparation, bounded text commits, and draft PR creation.
3. Agent adapter for Codex runs.
4. Reviewer adapter for PR diff review, rule compliance, and smart contract safety checks.
5. Contribution report adapter that summarizes activity without granting permissions.
6. Ledger persistence with rule/version hashes.

The GitHub PR adapter is intentionally narrow. It prepares same-repo branches, commits bounded text files, opens draft PRs,
and includes the Command Waves manifest in the PR body. It does not create merges, deploys, payments, repo setting changes,
or governance changes.

The first public loop sequence is in [first-hook-launch-playbook.md](first-hook-launch-playbook.md).

The production table plan is in [data-model.md](data-model.md).
The GitHub merge gate plan is in [github-reviewer-gate.md](github-reviewer-gate.md).
