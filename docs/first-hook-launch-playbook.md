# First Hook Launch Playbook

## Goal

Make the first public phase a clear community win:

1. Use one 6529 builder wave.
2. Build one non-upgradeable 6529 hook in one GitHub repo.
3. Let people propose scoped PR work.
4. Let the wave decide what should run.
5. Let agents help only inside approved commands.
6. Review every result before humans merge or pay anyone.

This should prove a reusable way for anyone to build a hook in public, while keeping the first launch centered on the 6529 hook.

## Use Now

- Builder wave and GitHub repo setup.
- Active hook list with the builder wave and repo for each hook in development.
- One PR-sized command at a time.
- Local or imported wave decisions for approvals.
- Manual decision receipts that link approved work to a 6529 drop URL in the builder wave.
- Copyable Codex work packets for PR commands with a recorded wave decision receipt.
- Draft PRs with Command Waves manifests.
- Repo contributor rules in [../CONTRIBUTING.md](../CONTRIBUTING.md).
- Copyable builder wave launch brief for the first public post.
- Reviewer gate checks for vote status, rules hashes, risky files, hook signals, Solidity patch signals, and explicit parameter caps.
- Public launch audit during setup and again before inviting broad participation.
- Contribution report as activity evidence.
- Manual developer fee plan as payout evidence.
- Human-reviewed wave update draft.
- Human-reviewed launch packet for the PR audit trail.

## Park For Later

- Live REP or TDH voting authority.
- Automatic payouts.
- Automatic merges or deploys.
- Broad multi-agent marketplace behavior.
- Upgradeable hook contracts.
- Complex role systems beyond proposer, voter, agent, reviewer, and human maintainer.

## Community Flow

Use two social spaces if the community wants them:

1. General chat wave: collect ideas, questions, and onboarding help.
2. Builder wave: approve scoped commands that can become PRs.

The app should treat the builder wave as the source of truth for work approval. General chat can feed ideas, but it should not authorize code changes.

## Optional QnA Gate

A QnA gate can be useful for onboarding, but it should stay manual in this phase:

- Ask people to answer a short hook-design question before proposing PR work.
- Record the result as a note or allowlist entry.
- Do not treat it as live REP, TDH, or payment authority.
- Do not block review or merge solely because an automated QnA score exists.

## Launch Sequence

1. Pick the builder wave and GitHub repo.
2. Run the public launch audit once to expose setup blockers.
3. Confirm the hook repo has `CONTRIBUTING.md` and `.github/PULL_REQUEST_TEMPLATE.md`.
4. Copy the builder wave launch brief from setup.
5. Post the brief with the builder wave, repo link, participation notes, and hook scope.
6. Invite ideas in the general chat wave or thread.
7. Turn one strong idea into a PR-sized command.
8. Vote or approve through the builder wave.
9. Record the decision drop URL as the manual approval receipt.
10. Copy the Codex work packet and use it in a prepared branch.
11. Run the agent only inside that approved packet.
12. Open a draft PR using the repo template and Command Waves manifest.
13. Review the PR manifest, tests, parameter-cap evidence, and changed files.
14. Humans merge only after review passes.
15. Use the contribution report and fee plan as evidence for any separate payout vote.
16. Post the wave update draft back to the builder wave.
17. Keep the launch packet with the PR so later contributors can audit the loop.
18. Run the public launch audit again and fix blockers before broad launch.

## Success Criteria

- New contributors understand where to propose work.
- Every code change traces back to a visible wave decision.
- The hook stays non-upgradeable by default.
- Parameter changes name explicit caps and tests.
- Fees and contribution scores are evidence, not automatic authority.
- Public launch blockers are fixed before broad participation.
- The first merged PR feels simple, auditable, and worth repeating.
