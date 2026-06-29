# 6529 Command Waves

## Short Version

Command Waves is a shared workspace for building open source hooks in public. The first proof project is the 6529 Hook.

For the first public phase, the product is simple: builders use one 6529 discussion and one GitHub repo to propose,
approve, build, and review small hook changes. Low-risk work can move quickly. Important or risky changes need a visible
6529 decision before they enter the repo. A reviewer gate checks PRs in CI against the approved command, rules, risk, and
hook guardrails before humans merge.

The same loop can become a reusable public open source protocol later. The first launch stays focused on one hook, one
6529 discussion, and one GitHub smart contract repo. The app shows the current task, recent discussion context, GitHub PR
state, code review evidence, activity log, and contribution report.

The app keeps the loop visible:

1. Review who can participate.
2. Share ideas in the 6529 discussion.
3. Propose one PR-sized change.
4. Decide whether it should enter the repo.
5. Build the PR.
6. Review the result before humans merge.
7. Log what happened.

The simple project view is:

`Access -> Discussion -> PR -> Review`

## Why This Exists

Agents are useful, but broad tool access gets dangerous when a group is moving at prompt speed. In phase 1, agents only
help with reads, drafts, wave updates, and PR commands.

Command Waves make the answers visible:

- Who decided this work should happen?
- Did the command need a vote?
- Did quorum pass?
- What tool or agent ran the command?
- What changed?
- Was the result reviewed?
- Can humans audit the chain later?

## MVP

The first public phase:

1. Choose one 6529 discussion.
2. Connect one GitHub smart contract repo for the 6529 hook.
3. Record participation gates such as REP, TDH, allowlists, or QnA as advisory until live enforcement is wired.
4. Propose hook work in plain English with clear limits.
5. Let orchestration rules classify risk and require votes for important changes.
6. Let an agent help produce a PR when allowed.
7. Review the PR in CI against the approved command, rules, and hook guardrails.
8. Show recent activity and a transparent contribution report.
9. Keep the full audit log available.

No auto-merges, autonomous deploys, spending, or live REP/TDH authority in the first phase.

Launch operating notes are in [docs/first-hook-launch-playbook.md](docs/first-hook-launch-playbook.md).
Contributor rules for the first hook phase are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Trust Boundary

The first public phase is a governed hook-building workflow controlled by one 6529 discussion.

Current trust controls:

- The MVP guardian is a repo-local GitHub Action named `Command Waves Guardian`.
- PRs must carry a Command Waves manifest that ties code changes back to an approved wave command.
- The guardian writes replayable proof artifacts: `guardian-attestation.json`, `guardian-wave-state.json`, and
  `guardian-pr-evidence.json`.
- `npm run guardian:verify-proof` replays the guardian decision from those artifacts.
- Setup proofs now disclose the current guardian mode as `repo_local_github_action` and mark it as `mvp` strength.
- Guardian/reviewer/setup-proof code changes are treated as critical-risk diffs.

The most important production hardening step is moving from the repo-local GitHub Action to an external GitHub App. The app
should own the required check, read the 6529 wave state, replay the same deterministic verifier, and publish the same proof
artifacts. Until then, the MVP is useful and auditable, but not the strongest possible trust boundary.

First launch tasks:

1. Pick the first real 6529 discussion and hook repo, then publish the launch playbook.
2. Wire live 6529 proposal and vote state into `COMMAND_WAVE_STATE_URL`.

Hardening tasks after the first public loop:

1. Move the guardian into an external GitHub App, keeping the verifier as the shared core.
2. Replace local PR adapter execution with a controlled Codex harness that prepares branches.
3. Expand contribution reports from app activity into wave posts, PRs, reviews, commits, and ledger events.

## Lessons Reused From `6529arena`

See [docs/6529arena-lessons.md](docs/6529arena-lessons.md) for the full transfer.

Short version:

- Keep 6529 waves as the social/source-of-truth surface.
- Use the app as the control panel for setup, rules, jobs, and audit views.
- Reputation can route work, but permissions are the real security boundary.
- Agents request actions; the platform decides what is allowed.
- Design for local mock mode first, then production adapters.
- Log every meaningful state transition.

## Current App

The current app is a local prototype of the first hook-building loop. The default screen is the product surface. Secondary
setup and audit tools stay collapsed until a maintainer needs them.

Default workspace:

- Current hook task, next proposal, and project activity.
- Links to the 6529 discussion, GitHub repo, current PR, and reviewed work.
- Builder message composer with latest-post preview and copyable discussion draft.
- Simple proposal form for one PR-sized hook change with limits and success criteria.
- Builder list with 6529 profile links and informational activity points.

Safety and review:

- Rules and access drawer with advisory gate notes.
- Hook proposal preflight for caps, tests, upgradeability, deployment, governance, and live holder-authority claims.
- Risk classification for hook, fee, Solidity, proxy, deployment, and governance work.
- Reviewer gate foundation for manifests, vote status, rules hashes, risky paths, and hook contract signals.
- PR patch checks for upgradeability, delegatecall, deployment, governance, and parameter writes when patch evidence exists.

Audit and launch:

- Recent activity log with export.
- Activity report drawer for app evidence and manual planning context.
- Launch checklist with setup, readiness, checklist, and next-action evidence.
- Public setup proof, command-wave state, and launch audit endpoints.
- Copyable wave update, launch packet, Codex work packet, decision request, and review request drafts.

Maintainer setup:

- Collapsed project setup and guardrail controls at the bottom of the page.
- 6529 wave search by name or pasted wave URL/ID.
- GitHub repo link and setup validation for contributor rules and PR template markers.
- Local file persistence and Postgres storage via [db/001_command_waves.sql](db/001_command_waves.sql).

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Next.

6529 mock mode is the safe default. Set `6529_MOCK_MODE=false` only when you are ready to use the live 6529 API.

With the example env, command-wave demo state is stored in `.data/command-wave.json`.

Before opening a PR, run the local app gate:

```bash
npm run verify
```

## Durable Storage

For a small first loop, local file storage can prove the wave-to-PR workflow while 6529 holds the public discussion and
decision receipts. Before broad participation, use Postgres so setup, proposals, votes, decisions, PR evidence, reviews,
and ledger events survive server restarts.

1. Create a Postgres database.
2. Apply the schema:

```bash
psql "$DATABASE_URL" -f db/001_command_waves.sql
```

3. Configure the app:

```bash
COMMAND_WAVE_STORE=postgres
DATABASE_URL=postgresql://...
```

4. Verify storage appears as production durable:

```bash
SETUP_REQUIRE_PRODUCTION_STORAGE=true \
SETUP_PROOF_URL=https://your-app.example/api/command-wave/setup/proof \
npm run setup:verify
```

## Guardian Check

The repo includes a first GitHub Actions gate named `Command Waves Guardian`.

Run the same deterministic verifier checks locally:

```bash
npm run guardian:check
```

Run the PR evidence adapter against a GitHub pull request event:

```bash
GITHUB_EVENT_PATH=event.json COMMAND_WAVE_STATE_PATH=wave.json npm run guardian:pr-check
```

Replay a published guardian proof artifact:

```bash
GUARDIAN_ATTESTATION_PATH=guardian-attestation.json \
GUARDIAN_WAVE_STATE_SNAPSHOT_PATH=guardian-wave-state.json \
GUARDIAN_PR_EVIDENCE_PATH=guardian-pr-evidence.json \
npm run guardian:verify-proof
```

For local demos only, set `COMMAND_WAVE_ALLOW_DEMO_STATE=true` to use the built-in demo wave state.

When the PR adapter runs in GitHub Actions, it writes `guardian-attestation.json`, writes the exact
`guardian-wave-state.json` snapshot it checked, writes `guardian-pr-evidence.json`, appends a Markdown proof summary to the
job summary, replays the proof, and uploads the files as a `guardian-proof` workflow artifact.

The attestation includes hashes of the wave state, proposal, poll, rules, PR manifest, and changed paths. The replay
script recomputes the guardian result from the uploaded artifacts. That is the simple fairness proof: anyone with the same
inputs can rerun the deterministic guardian and get the same result.

This is the simple first step. The PR adapter feeds changed paths, PR manifests, and wave state into the same verifier so
GitHub can block merges that do not match the wave rules. Pull requests without a Command Waves manifest fail the guardian
check instead of bypassing it.

The current guardian enforcement mode is `repo_local_github_action`. That is good enough for the MVP because guardian code
and workflow changes are treated as critical-risk PRs, but the stronger production version should move the check into an
external GitHub App so the governed repo cannot edit its own reviewer.

The setup proof can advertise the production guardian by setting:

- `COMMAND_WAVE_GUARDIAN_MODE=external_github_app`
- `COMMAND_WAVE_GUARDIAN_REQUIRED_CHECK=<external app check name>`
- `COMMAND_WAVE_GUARDIAN_PROOF_ARTIFACT=<artifact name>`

Before making `Command Waves Guardian` a required GitHub check, configure one real wave-state source for the workflow:

- `COMMAND_WAVE_STATE_URL`, usually `https://your-app.example/api/command-wave/state`
- `COMMAND_WAVE_STATE_PATH`

To open real GitHub PRs from prepared agent branches, configure:

- `COMMAND_WAVE_REPO_ADAPTER=github`
- `COMMAND_WAVE_GITHUB_TOKEN` or `GITHUB_TOKEN`
- `COMMAND_WAVE_GITHUB_BASE_BRANCH`, optional, defaults to `main`

The GitHub adapter only opens draft PRs from an existing branch. It does not create branches, merge PRs, deploy contracts,
or spend funds.

Verify a published setup proof against GitHub required-check payloads:

```bash
SETUP_PROOF_URL=https://your-app.example/api/command-wave/setup/proof npm run setup:verify
```

When the setup proof includes `commandWaveStateUrl`, the same command also checks that the state URL returns the governed wave
and a matching state hash.

For a stricter production audit that fails until the guardian is external to the repo:

```bash
SETUP_REQUIRE_EXTERNAL_GUARDIAN=true \
SETUP_PROOF_URL=https://your-app.example/api/command-wave/setup/proof \
npm run setup:verify
```

For a stricter durable-storage audit before broad participation:

```bash
SETUP_REQUIRE_PRODUCTION_STORAGE=true \
SETUP_PROOF_URL=https://your-app.example/api/command-wave/setup/proof \
npm run setup:verify
```

For offline verification, set `SETUP_PROOF_PATH` and `SETUP_GITHUB_PAYLOADS_PATH`.

Verify the first-loop launch audit:

```bash
LAUNCH_AUDIT_URL=https://your-app.example/api/command-wave/launch/audit npm run launch:audit
```

The command exits nonzero until the launch audit is ready. For offline verification, set `LAUNCH_AUDIT_PATH`.

Expose the current command-wave state to the guardian with:

```bash
COMMAND_WAVE_STATE_URL=https://your-app.example/api/command-wave/state
```

## Local API

- `GET /api/6529/waves/search?q=term`: search 6529 waves by name.
- `POST /api/6529/context/preview`: preview fetched wave context with cap/source metadata.
- `GET /api/readiness`: show local/production readiness checks.
- `GET /api/command-wave/setup/proof`: public setup proof with hashes and third-party verification targets.
- `GET /api/command-wave/state`: public current wave state snapshot for guardian PR checks.
- `GET /api/command-wave/launch/audit`: public first-loop launch audit. Add `?remote=1` to run remote wave and repo setup checks.
- `GET /api/command-wave`: return the current local command wave.
- `PUT /api/command-wave`: disabled in phase 1. Use scoped setup, proposal, vote, decision, run, and review routes.
- `PATCH /api/command-wave`: update the demo wave/repo setup and log it.
- `DELETE /api/command-wave`: reset the local demo.
- `POST /api/command-wave/proposals`: submit a command proposal.
- `POST /api/command-wave/votes`: record a yes/no vote. Body requires `proposalId`, `voterIdentity`, and `vote`.
- `POST /api/command-wave/decision`: record a manual 6529 decision receipt. Body requires `proposalId` and `reference`. PR commands require a 6529 drop URL in the discussion.
- `POST /api/command-wave/codex-packet`: create a copyable manual Codex work packet for a PR command with a recorded 6529 decision receipt.
- `POST /api/command-wave/execute`: run the local agent adapter.
- `POST /api/command-wave/review`: run the local reviewer adapter.

Command-wave mutation routes are open only for local demo mode when `ADMIN_API_KEY` is blank. Once `ADMIN_API_KEY` is set,
send it as either `x-admin-api-key: <key>` or `Authorization: Bearer <key>`. In production, missing `ADMIN_API_KEY` is a
server misconfiguration and mutations fail closed.

The web console has a collapsed **Access key** field in setup. It stores the key in browser session storage and sends it
only for protected actions. This is an MVP bridge for testing protected routes; production should replace it with proper
wallet/session auth before opening the console broadly.

API errors include an `errorId` so a user-visible error can be matched to server logs.

## Next Production Steps

1. Apply the Postgres schema, set `COMMAND_WAVE_STORE=postgres`, and verify durable storage.
2. Wire live 6529 setup, proposal, vote, and human-posted result update flows.
3. Finish controlled GitHub branch, commit, PR comment, and CI-state operations.
4. Add controlled Codex execution using [docs/agent-harness-plan.md](docs/agent-harness-plan.md).
5. Add contract-aware review adapters for diffs, tests, deployment files, governance, parameters, and upgradeability patterns.
6. Add human-reviewed contribution reports across wave posts, PRs, reviews, commits, and ledger events.
7. Add production auth, secrets, rate limits, job queue controls, and required GitHub branch protection.
