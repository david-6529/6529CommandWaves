# Contributing To The First Hook Phase

This repo uses one 6529 project chat to coordinate one smart contract repo.

## Simple Flow

1. Discuss ideas in the community space.
2. Turn one idea into a PR-sized proposal.
3. Get the project decision.
4. Build on a prepared branch.
5. Open a draft PR with the Command Waves manifest.
6. Wait for review before humans merge, deploy, pay, or change governance.

## Before Opening A PR

- Link the work to an approved project proposal.
- Keep the PR scoped to that proposal.
- Include the Command Waves manifest in the PR body.
- Include tests or reviewer records for the approved scope.
- Submit only context reads, drafts, chat updates, or PR work in phase 1.
- Keep deploys, payments, merges, and governance changes out of phase 1 PRs.
- Use the agent build step only for approved PR work.

## Local Verification

Run the same app quality check used by CI:

```bash
npm run verify
```

This runs typecheck, lint, tests, and build. It does not merge, deploy, spend funds, or post to project chat.
The app rejects PR work that fails hook preflight.

## Hook Guardrails

- Hook contracts are immutable by default.
- Do not add proxy, UUPS, initializer, diamond, or delegatecall patterns.
- Any fee, limit, or config parameter change must name an explicit numeric cap.
- Parameter work must include bound-focused tests or equivalent reviewer records.
- REP, TDH, and holder thresholds are notes only until live weighting is wired.

## Review Standard

A PR should be ready to review when a human can answer:

- Which project decision approved this work?
- Which proposal does this PR implement?
- Did the manifest match the proposal, rules, and vote?
- Did the tests cover the approved hook bounds?
- Did the change avoid deploys, payments, and governance control?

The app and guardian checks provide records. Humans still make merge, deploy, payment, and governance decisions.
