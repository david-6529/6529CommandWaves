# 6529 Command Waves

## ELI5

Command Waves is a builder swarm for creating open source hooks in public. The first proof project is the 6529 Hook.

For the first public phase, the product is simple: a gated set of builders joins a 6529 wave, shares ideas and code,
and uses orchestration rules to decide what can become GitHub PR work. Low-risk work can move quickly. Important or risky
changes need a visible wave decision before they enter the repo. A reviewer gate checks PRs in CI against the approved
command, rules, risk, and hook guardrails before humans merge.

The same loop can become a reusable public open source protocol later. The first launch stays focused on one hook, one
builder wave, and one GitHub smart contract repo. The 6529 wave remains the live conversation and decision surface. This
app shows the project snapshot, recent wave context, GitHub PR state, code review evidence, launch evidence, and
contribution reports.

The app keeps the loop visible:

1. Gate who can play.
2. Share ideas in the builder wave.
3. Propose one PR-sized change.
4. Classify risk and decide whether it should run.
5. Build or open the PR.
6. Review the result in CI before humans merge.
7. Log the activity.

The simple project view is:

`Gate -> Wave -> PR -> Review`

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

1. Choose one 6529 builder wave.
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

The first public phase is a governed hook-building workflow controlled by a 6529 builder wave.

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

1. Pick the first real builder wave and hook repo, then publish the launch playbook.
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

The current app is a local prototype of the hook-building flow:

- simple public project room with the vision, rules drawer, proposal form, current build, swarm chat, members, and activity
- large readable default UI that keeps secondary details collapsed until needed
- first-screen jump actions for suggesting work, checking the current build, and talking to the swarm
- beginner-friendly hook work proposal form with visible next steps
- current build view with proposal, decision, PR, review, and one next action
- builder wave chat area with latest-post preview and a copyable conversation note
- swarm member list with 6529 profile links and informational contribution scores
- project details drawer with the active hook, builder wave, repo evidence, gate notes, and repo action
- launch checklist drawer with work state, launch state, and phase progress
- advanced controls drawer for preflight, orchestration, voting, PR build, and review details
- reports and fees drawer for contribution evidence and manual developer fee planning
- share update drawer for the human-reviewed wave update draft and launch packet
- collapsed maintainer setup and guardrail controls at the bottom of the page
- project wave setup with simpler user-facing language
- 6529 wave search by name or pasted wave URL/ID
- GitHub repo link
- editable participation gate notes that keep REP, TDH, holder, allowlist, and QnA claims advisory
- copyable participation guide for joining the builder wave without claiming live gate enforcement
- copyable builder wave launch brief for the first public project post
- hook guardrails for immutable-by-default smart contract work
- phase scope inventory that separates launch tools from parked ideas
- bounded hook parameter policy that requires explicit caps and bound-focused tests
- transparent contribution report for proposals, votes, decision receipts, and activity log evidence
- per-contributor score basis so report points are auditable
- contribution report coverage notes that separate scored app evidence from off-app activity
- manual developer fee plan draft that uses review evidence without moving funds
- copyable launch packet for wave, PR, review, contribution, and fee evidence
- launch packet verification section with setup proof and state endpoints
- copyable launch status note with next action, open items, and verification links
- safety rules by command type
- simple hook work proposal form with advanced command settings collapsed
- backend command surface limited to context reads, drafts, wave updates, and PR commands
- persisted older rule sets are normalized so scripts, deploys, spending, and rule changes stay parked
- first-phase proposal picker focused on PRs, drafts, wave updates, and context reads
- hook proposal preflight for caps, tests, upgradeability, deployment, governance, and live holder-authority claims
- automatic risk classification
- high-risk classification for hook, fee, Solidity, proxy, deployment, and governance work
- poll voting with one vote per voter identity
- backend setup validation for 6529 wave links, GitHub repo links, contributor rules, and PR template
- setup validation checks that the PR template includes Command Waves manifest markers
- launch readiness checks for local mode, storage, 6529 mode, GitHub PRs, guardian wave state, and guardian mode
- first-phase launch check with setup evidence and a single next action
- automated U+2014 guard for project text
- controlled local run record
- copyable manual Codex work packet for PR commands with a recorded wave decision receipt
- deterministic run manifest evidence with rules hash, tool permissions, and budget cap
- deterministic Codex handoff packet with branch, permission, evidence, and forbidden-action bounds
- manual wave decision receipt that can anchor approval to a 6529 drop URL
- PR decision receipt URL validation against the configured builder wave
- orchestration proposal draft with risk and decision route for manual wave posting before local tracking
- builder-wave decision request draft before PR work starts
- builder-wave review request draft after PR evidence is recorded
- opt-in GitHub PR adapter that opens draft PRs from prepared branches with the required manifest
- contributor workflow and PR template for Command Waves manifest evidence
- PR reviewer-gate foundation for checking command manifests, vote status, rules hashes, risky file paths, and hook contract signals
- patch-level Solidity checks for upgradeability, delegatecall, deployment, governance, and parameter writes when PR patches are available
- deterministic guardian attestations with input hashes and rerunnable pass/fail results
- review records store compact guardian proof material for later audit
- human-reviewed wave update draft for manual sharing back to the builder wave
- wave update draft verification links for setup proof, command-wave state, and launch audit status
- copyable informational contribution report for manual sharing
- human-reviewed launch packet for PR audit trails
- public setup proof endpoint for third-party verification of wave/repo/storage/rules/check expectations
- public command-wave state endpoint for `COMMAND_WAVE_STATE_URL`
- public launch audit endpoint with setup, readiness, checklist, and next-action evidence
- copyable setup proof, state, and launch audit URLs in launch readiness controls
- recent activity view with full audit log export
- local API routes for fetching/resetting state, proposals, votes, runs, and reviews
- 6529 adapter foundation for wave ID normalization, mock-mode wave reads, drop normalization, context pagination, and capped context previews
- direct 6529 drop links in wave context previews
- local file persistence for command-wave state when `COMMAND_WAVE_STORE=file`
- Postgres command-wave repository and schema in [db/001_command_waves.sql](db/001_command_waves.sql)

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
- `POST /api/command-wave/decision`: record a manual wave decision receipt. Body requires `proposalId` and `reference`. PR commands require a 6529 drop URL in the builder wave.
- `POST /api/command-wave/codex-packet`: create a copyable manual Codex work packet for a PR command with a recorded wave decision receipt.
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
