# Agent Harness Plan

Command Waves should not let a wave directly run arbitrary tools. The agent should run approved commands through a constrained harness.

## First Harness: Codex

MVP execution path:

1. Proposal has a recorded builder wave decision receipt.
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

- Generates a deterministic run manifest artifact before local adapter execution.
- Includes proposal ID, command kind, risk, rules version/hash, permissions, budget, prompt/spec hashes, target branch, max runtime, and max cost.
- Generates a deterministic Codex handoff packet for PR commands.
- Generates a copyable manual Codex work packet for PR commands with a recorded wave decision receipt.
- The handoff packet records the target branch, permission set, budget, required evidence, forbidden actions, run manifest hash, and PR manifest hash.
- The work packet gives a human operator the approved prompt, target branch, required evidence, forbidden actions, and PR manifest text to use in a prepared branch.
- Includes the Command Waves PR manifest in the PR body for `open_pr` commands.
- Can opt into a real GitHub draft PR adapter with `COMMAND_WAVE_REPO_ADAPTER=github` once a controlled harness has prepared the branch.
- Reviewer adapter requests changes if the run manifest is missing, the handoff packet is missing for a PR command, or either artifact does not match the approved command.

Current GitHub PR adapter status:

- Opens draft PRs through the GitHub API from an existing prepared same-repo branch.
- Rejects fork refs, raw SHAs, tags, and ambiguous refs before calling GitHub.
- Requires `COMMAND_WAVE_GITHUB_TOKEN` or `GITHUB_TOKEN`.
- Uses `COMMAND_WAVE_GITHUB_BASE_BRANCH` when set, otherwise `main`.
- Does not create branches, commit changes, merge PRs, deploy contracts, or spend funds.

## Safety Defaults

- No deploys from the first harness.
- No repo secrets in prompts.
- No wallet keys in prompts.
- No arbitrary shell unless the command kind and policy allow `script.run`.
- No automatic merge.
- No automatic production posting in phase 1. Wave updates are drafts for human posting.
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
