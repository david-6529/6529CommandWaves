# First Hook Launch Playbook

## Goal

Make the first public phase a clear community win:

1. Use one public 6529 project chat as the live decision source.
2. Define who can join, while keeping REP, TDH, allowlist, and QnA notes advisory until live enforcement is wired.
3. Build one non-upgradeable 6529 hook in one GitHub repo.
4. Let people propose scoped PR work.
5. Let orchestration rules classify risk and decide when a vote is needed.
6. Let agents help only inside approved commands.
7. Let reviewer CI check every PR before humans merge or pay anyone.

This should first feel like a focused hook project for the 6529 hook. If the loop works, the same structure can support more open source projects later.
Use the 6529-backed project chat for live discussion and decisions. Use this app for the project snapshot, GitHub repo state, PR evidence, review evidence, and launch evidence.

## Use Now

- Project chat and GitHub repo setup.
- Participation notes for who can join.
- 6529 hook project snapshot with chat context, repo state, PR state, and review evidence.
- One PR-sized command at a time.
- Orchestration rules that classify risk and require votes for important changes.
- Local or imported project decisions for approvals.
- Manual decision links that connect approved work to a decision URL in project chat.
- Copyable Codex work packets for PR commands with a recorded project decision link.
- Draft PRs with Command Waves manifests.
- Repo contributor rules in [../CONTRIBUTING.md](../CONTRIBUTING.md).
- Copyable chat launch brief for the first public post.
- Reviewer checks for vote status, rules hashes, risky files, hook signals, Solidity patch signals, and explicit parameter caps.
- Launch check during setup and again before inviting broad participation.
- Guardian workflow check for the selected hook repo.
- Public command-wave state URL for guardian PR checks.
- Contribution report as activity evidence.
- Manual developer fee plan as informational payout evidence.
- Human-reviewed chat update draft.
- Human-reviewed launch packet for the PR audit trail.

## Park For Later

- Live REP or TDH voting authority.
- Automatic access enforcement.
- Automatic payouts.
- Automatic merges or deploys.
- Broad multi-agent marketplace behavior.
- Upgradeable hook contracts.
- Complex role systems beyond proposer, voter, agent, reviewer, and human maintainer.

## Community Flow

Use two social spaces if the community wants them:

1. General chat: collect ideas, questions, and onboarding help.
2. Builder chat: approve scoped commands that can become PRs.

The app should treat builder chat as the source of truth for work approval. General chat can feed ideas, but it should not authorize code changes.

## Optional QnA Check

A QnA check can be useful for onboarding, but it should stay manual in this phase:

- Ask people to answer a short hook-design question before proposing PR work.
- Record the result as a note or allowlist entry.
- Do not treat it as live REP, TDH, or payment authority.
- Do not block review or merge solely because an automated QnA score exists.

## Launch Sequence

Public launch env:

```bash
NEXT_PUBLIC_APP_URL=https://your-app.example
COMMAND_WAVE_STORE=postgres
DATABASE_URL=postgresql://user:password@host:5432/command_waves
ADMIN_API_KEY=<strong random key>
COMMAND_WAVE_INITIAL_NAME="6529 AMM hook"
COMMAND_WAVE_INITIAL_WAVE_URL=https://6529.io/waves/your-hook-project
# Placeholder until the pilot repo is selected. PR work stays blocked while this is unchanged.
COMMAND_WAVE_INITIAL_REPO_URL=https://github.com/your-org/your-hook-repo
6529_MOCK_MODE=false
6529_BOT_BEARER_TOKEN=<6529 bot token>
6529_BOT_WALLET_ADDRESS=<6529 bot wallet address>
COMMAND_WAVE_STATE_URL=https://your-app.example/api/command-wave/state
COMMAND_WAVE_GUARDIAN_REQUIRED_CHECK="Command Waves Guardian"
COMMAND_WAVE_REPO_ADAPTER=github
COMMAND_WAVE_GITHUB_TOKEN=<github token>
```

1. Pick the builder chat. Keep the GitHub repo placeholder until the pilot repo is selected.
2. Open Maintainer tools, run Launch readiness, and use the launch check to expose setup blockers.
3. Select the hook repo before PR work, then confirm it has `CONTRIBUTING.md`, a PR template with Command Waves manifest markers, the guardian workflow, and the required guardian check.
4. Copy the chat launch brief from setup.
5. Post the brief with the chat, repo status, participation notes, and hook scope.
6. Copy the participation guide and share it where new contributors will see it.
7. Invite ideas in the general chat or thread.
8. Let orchestration rules turn one strong idea into a risk-classified PR-sized command.
9. Vote or approve through builder chat.
10. Record the decision URL as the manual decision link.
11. Use the build step to prepare the branch, commit the Codex work packet, and open a draft PR record.
12. Run any code-writing agent only inside that approved packet and branch.
13. Set `COMMAND_WAVE_STATE_URL` to `/api/command-wave/state` for guardian PR checks.
14. Make `COMMAND_WAVE_GUARDIAN_REQUIRED_CHECK` required in GitHub branch protection or rulesets.
15. Continue the draft PR using the repo template, review request, launch evidence, and Command Waves manifest.
16. Review the PR manifest, tests, parameter-cap evidence, and changed files.
17. Humans merge only after review passes.
18. Use the contribution report and fee plan as evidence for any separate payout vote.
19. Review the chat update draft and share it manually in builder chat.
20. Keep the launch packet with the PR so later contributors can audit the loop.
21. Run the launch audit with `?remote=1`, or rerun Launch readiness in the app, and fix blockers before broad participation.

The launch check focuses on the first public loop. The chat-first launch requires the deployed app URL, first hook chat,
admin key, durable storage, live 6529 mode, and daemon chat posting credentials. The GitHub repo can stay as a placeholder
until PR work starts. A ready PR loop also requires the selected reviewer process, GitHub PR adapter, guardian workflow,
guardian wave-state URL, and required guardian check. Failed checks block broad participation.

Use `npm run chat:launch` against the remote chat launch audit before inviting builders into discussion. Use
`npm run launch:audit` before claiming the full reviewed PR loop is ready.

The launch audit includes a human-readable status draft with the next action, operator checklist, verification links, and
guardrails. Use it as the short update for reviewers or builders.

The launch audit publishes the wave state hash and rules hash it checked. Compare the wave state hash with the
`/api/command-wave/state` payload when reviewing audit evidence.

The launch audit also publishes contribution and developer fee records as informational evidence. It does not approve
payments, choose recipients, grant access, or create merge authority. Fee planning waits for the selected reviewer process
and reviewed PR loop.

## Success Criteria

- New contributors understand where to propose work.
- Participation notes make it clear who can join without claiming live REP or TDH enforcement.
- Every code change traces back to a visible project decision.
- Risky changes require a visible vote before PR work starts.
- The hook stays non-upgradeable by default.
- Parameter changes name explicit caps and tests.
- Reviewer CI signs off before humans merge.
- Fees and contribution report scores are evidence, not automatic authority.
- Launch blockers are fixed before broad participation.
- The first merged PR feels simple, auditable, and worth repeating.
