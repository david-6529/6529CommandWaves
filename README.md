# 6529 Command Waves

## ELI5

Command Waves let a 6529 builder wave govern scoped work in a GitHub repo.

For the first public phase, the project is simple: use a 6529 wave to coordinate a community-built 6529 hook.
People propose scoped work, decisions approve PRs, agents can help, reviewers check the output, and humans keep control.

The app keeps the loop visible:

1. Choose the builder wave and GitHub repo.
2. Propose one PR-sized change.
3. Decide whether it should run.
4. Build or open the PR.
5. Review the result.
6. Log the activity.

The simple flow is:

`Choose project -> Propose work -> Decide -> Build PR -> Review -> Log`

## Why This Exists

Agents can write code, open PRs, post updates, run scripts, deploy, and spend money. That gets dangerous when a group is moving at prompt speed.

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
3. Propose hook work in plain English with clear limits.
4. Decide whether the work is approved.
5. Let an agent help produce a PR when allowed.
6. Review the PR against the approved command, rules, and hook guardrails.
7. Show recent activity and a transparent contribution report.
8. Keep the full audit log available.

No auto-merges, autonomous deploys, spending, or live REP/TDH authority in the first phase.

Launch operating notes are in [docs/first-hook-launch-playbook.md](docs/first-hook-launch-playbook.md).

## Agent Handoff

This repo is now focused on **Command Waves**, not the earlier summarizer / SwarmOps direction. The product is a governed
agent workflow controlled by a 6529 wave.

Current work is centered on the trust boundary:

- The MVP guardian is a repo-local GitHub Action named `Command Waves Guardian`.
- PRs must carry a Command Waves manifest that ties code changes back to an approved wave command.
- The guardian writes replayable proof artifacts: `guardian-attestation.json`, `guardian-wave-state.json`, and
  `guardian-pr-evidence.json`.
- `npm run guardian:verify-proof` replays the guardian decision from those artifacts.
- Setup proofs now disclose the current guardian mode as `repo_local_github_action` and mark it as `mvp` strength.
- Guardian/reviewer/setup-proof code changes are treated as critical-risk diffs.

The most important missing production step is moving from the repo-local GitHub Action to an external GitHub App. The app
should own the required check, read the 6529 wave state, replay the same deterministic verifier, and publish the same proof
artifacts. Until then, the MVP is useful and auditable but not the strongest possible trust boundary.

Best next tasks for another agent:

1. Build the external GitHub App design in code/docs, keeping the existing verifier as the shared core.
2. Wire live 6529 proposal/vote state into `COMMAND_WAVE_STATE_URL`.
3. Add the GitHub repo adapter that opens PRs with the required Command Waves manifest.
4. Replace local mock execution with a controlled Codex harness adapter.
5. Keep every guardian change covered by tests and reflected in this README.

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

- first-screen flow: choose project, propose work, decide, build PR, review, log
- phase checklist derived from the current wave state
- project wave setup with simpler user-facing language
- 6529 wave search by name or pasted wave URL/ID
- GitHub repo link
- participation gate notes that do not claim live REP/TDH enforcement
- hook guardrails for immutable-by-default smart contract work
- bounded hook parameter policy that requires explicit caps and bound-focused tests
- transparent contribution report that does not grant permissions
- manual developer fee plan that uses review evidence without moving funds
- safety rules by command type
- command proposal form
- first-phase proposal picker focused on PRs, drafts, wave updates, and context reads
- automatic risk classification
- high-risk classification for hook, fee, Solidity, proxy, deployment, and governance work
- poll voting with one vote per voter identity
- backend setup validation for 6529 wave links and GitHub repo links
- controlled local run record
- deterministic run manifest evidence with rules hash, tool permissions, and budget cap
- deterministic Codex handoff packet with branch, permission, evidence, and forbidden-action bounds
- manual wave decision receipt that can anchor approval to a 6529 drop URL
- opt-in GitHub PR adapter that opens draft PRs from prepared branches with the required manifest
- PR reviewer-gate foundation for checking command manifests, vote status, rules hashes, risky file paths, and hook contract signals
- deterministic guardian attestations with input hashes and rerunnable pass/fail results
- review records store compact guardian proof material for later audit
- human-reviewed wave update draft for posting results back to the builder wave
- public setup proof endpoint for third-party verification of wave/repo/rules/check expectations
- recent activity view with full audit log export
- local API routes for fetching/resetting state, proposals, votes, runs, and reviews
- 6529 adapter foundation for wave ID normalization, mock-mode wave reads, drop normalization, context pagination, and context previews
- local file persistence for command-wave state when `COMMAND_WAVE_STORE=file`
- Postgres schema foundation in [db/001_command_waves.sql](db/001_command_waves.sql)

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Next. In this workspace it is currently `http://localhost:5010`.

6529 mock mode is the safe default. Set `6529_MOCK_MODE=false` only when you are ready to use the live 6529 API.

With the example env, command-wave demo state is stored in `.data/command-wave.json`.

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

- `COMMAND_WAVE_STATE_URL`
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

For a stricter production audit that fails until the guardian is external to the repo:

```bash
SETUP_REQUIRE_EXTERNAL_GUARDIAN=true \
SETUP_PROOF_URL=https://your-app.example/api/command-wave/setup/proof \
npm run setup:verify
```

For offline verification, set `SETUP_PROOF_PATH` and `SETUP_GITHUB_PAYLOADS_PATH`.

## Local API

- `GET /api/6529/waves/search?q=term`: search 6529 waves by name.
- `POST /api/6529/context/preview`: preview fetched wave context with cap/source metadata.
- `GET /api/readiness`: show local/production readiness checks.
- `GET /api/command-wave/setup/proof`: public setup proof with hashes and third-party verification targets.
- `GET /api/command-wave`: return the current local command wave.
- `PUT /api/command-wave`: replace the local command wave.
- `PATCH /api/command-wave`: update the demo wave/repo setup and log it.
- `DELETE /api/command-wave`: reset the local demo.
- `POST /api/command-wave/proposals`: submit a command proposal.
- `POST /api/command-wave/votes`: record a yes/no vote. Body requires `proposalId`, `voterIdentity`, and `vote`.
- `POST /api/command-wave/decision`: record a manual wave decision receipt. Body requires `proposalId` and `reference`.
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

1. Finish durable Postgres persistence using [docs/data-model.md](docs/data-model.md).
2. Wire live 6529 setup, proposal, vote, and result-posting flows.
3. Finish controlled GitHub branch, commit, PR comment, and CI-state operations.
4. Add controlled Codex execution using [docs/agent-harness-plan.md](docs/agent-harness-plan.md).
5. Add contract-aware review adapters for diffs, tests, deployment files, governance, parameters, and upgradeability patterns.
6. Add human-reviewed contribution reports across wave posts, PRs, reviews, commits, and ledger events.
7. Add production auth, secrets, rate limits, job queue controls, and required GitHub branch protection.
