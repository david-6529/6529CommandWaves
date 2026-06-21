# Command Waves MVP Plan

## Product Definition

A Command Wave is a 6529 project wave that can control an AI worker.

People and agents propose commands in plain English. Rules decide whether a command can run now or needs a yes/no vote. Approved commands run through a controlled agent adapter. The result is reviewed and logged so the wave can see what happened.

The simple product flow is:

```text
Propose -> Vote if risky -> Run -> Review
```

## Roles

- **Wave participants:** propose commands, vote when the rules require it, and inspect results.
- **AI worker:** runs approved commands through an allowed harness such as Codex, Claude Code, scripts, GitHub, or APIs.
- **Reviewer:** checks the AI worker output against the approved command, vote, rules, architecture, security, and expected artifacts.

Implementation names can evolve later. The user-facing MVP should lead with wave, command, vote, run, and review.

## Core Objects

- **CommandWave:** project workspace tied to a 6529 wave and optionally a GitHub repo.
- **Rules:** versioned policy for command types, quorum, thresholds, expiry, allowed tools, and blocked actions.
- **Proposal:** a requested command with prompt, spec, risk, proposer, budget, and status.
- **Poll:** yes/no vote with quorum and yes threshold.
- **Vote:** voter identity, yes/no choice, weight, source, and timestamp. A voter can only vote once per poll.
- **Execution:** AI worker run record with harness, artifacts, cost, logs, and status.
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
- Run script: poll.
- Deploy: stricter poll.
- Spend money: stricter poll.
- Change rules: strictest poll.

Polls require a voter identity for every yes/no vote. Duplicate votes from the same identity are rejected server-side.

## First Real Demo

1. A project wave is linked to a GitHub repo.
2. A member proposes: "Add a landing page section explaining this project."
3. The rule engine classifies it as `open_pr`, medium risk, vote required.
4. The wave votes yes.
5. The AI worker opens a PR.
6. The reviewer checks the PR against the approved spec.
7. The result is posted back to the wave.

## Non-Goals For First Demo

- No autonomous deploys.
- No spending.
- No automatic merges.
- No token-weighted voting until manual gating works.
- No broad multi-agent swarm marketplace.

## Safety Boundaries

The first version assumes prompt injection will happen and that reputation alone is not enough.

- Permissions are the security boundary.
- Agents never receive wallet private keys, provider secrets, database credentials, or broad filesystem access through prompts.
- Dangerous actions go through backend adapters with explicit rule checks.
- Each command kind maps to explicit tool permission classes such as `wave.read`, `repo.open_pr`, `deploy.run`, or `funds.spend`.
- The AI worker can only run an approved proposal.
- The reviewer must check artifacts before a command is marked complete.
- Every proposal, vote, execution, review, and setup change is logged.
- External agent endpoints are out of scope until signed manifests, payload limits, timeouts, domain allowlists, and tool permissions exist.

## Production Architecture Direction

The external app should be the control panel for setup, rules, queue status, and audits. The 6529 waves should remain where proposals, votes, decisions, and results are visible to participants.

Initial adapters:

1. 6529 API adapter for wave search, posting, and reading.
2. GitHub adapter for repo metadata, PR creation, PR comments, and commit/CI state.
3. AI worker adapter for Codex runs.
4. Reviewer adapter for PR diff review and rule compliance.
5. Ledger persistence with rule/version hashes.

The production table plan is in [data-model.md](data-model.md).
