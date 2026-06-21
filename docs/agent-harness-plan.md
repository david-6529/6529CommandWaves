# AI Worker Harness Plan

Command Waves should not let a wave directly run arbitrary tools. The AI worker should run approved commands through a constrained harness.

## First Harness: Codex

MVP execution path:

1. Proposal passes the rule/poll gate.
2. Backend creates a `command_job` with the approved prompt, spec, rules version, repo URL, and budget cap.
3. Worker creates an isolated worktree or clone for the target repo.
4. Worker writes a run manifest with:
   - proposal ID
   - rules version/hash
   - allowed tool permissions
   - prompt/spec
   - target branch
   - max runtime
   - max cost
5. Codex runs against that isolated worktree.
6. Worker captures diff, tests, logs, cost/usage if available, and errors.
7. Worker opens or updates a PR only if the command policy allows `repo.open_pr`.
8. Reviewer checks the exact artifacts and writes a review event.

Current local adapter status:

- Generates a deterministic run manifest artifact before mock execution.
- Includes proposal ID, command kind, risk, rules version/hash, permissions, budget, prompt/spec hashes, target branch, max runtime, and max cost.
- Reviewer mock requests changes if the run manifest is missing or does not match the approved command.

## Safety Defaults

- No deploys from the first harness.
- No repo secrets in prompts.
- No wallet keys in prompts.
- No arbitrary shell unless the command kind and policy allow `script.run`.
- No automatic merge.
- No automatic production posting except through `wave.post` policy.
- Stop if the repo URL does not parse as a GitHub repo.
- Stop if the proposal status is not approved at execution time.
- Stop if the rules version changed after approval.

## Reviewer Checks

The reviewer should check:

- The execution belongs to an approved proposal.
- The rules version/hash matches the approval.
- Changed files match the spec.
- Tests/lint/build evidence is present for code changes.
- Dangerous surfaces are called out: auth, wallets, payments, deploys, secrets, rule changes.
- The PR body links back to the proposal, poll, and ledger event.
- The output can be explained in plain English back to the wave.

## Later Harnesses

- Claude Code for repos where it performs better.
- Script runner for explicitly approved maintenance commands.
- Manual harness for commands that need a human to execute outside the app.

External hosted agents stay out of the MVP until there are signed manifests, payload limits, tool permission declarations, timeouts, domain allowlists, and kill switches.
