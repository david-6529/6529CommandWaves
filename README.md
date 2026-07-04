# 6529 Hook Room

## Short Version

This is a simple shared workspace for building the 6529 hook in public.

The first public phase connects one 6529 room to one smart contract repo. Builders talk in the room, turn one idea into a
small proposal, record the 6529 decision, build a draft PR, review it, and share the result back with a clear log.

The same loop can become reusable infrastructure for public open source work later. For now, the product stays focused on
one successful hook build.

The builder flow is:

1. Choose the hook project.
2. Read what is happening now.
3. Chat with the room.
4. Suggest one small change.
5. Record the room decision.
6. Build the PR.
7. Review before humans merge.
8. Share the update.

The simple product shape is:

`Access -> Room -> Decision -> PR -> Review -> Log`

## Current Status

This repo is an MVP prototype for one public hook-building room. The app is a standalone 6529 Hook project site first. It
is designed so the same pattern can become a broader public builder protocol after the first loop works.

What exists now:

- A Next app product surface focused on building the 6529 hook together.
- One active hook project with a public 6529 room and a code repo.
- A simplified room-first UI with a project overview, work-loop status, current hook change, chat composer, room snapshot,
  latest log, member profiles, rules of the game, and folded proposal flow.
- Simple work types: Code PR, Question, Update, and Context.
- Copyable drafts for room posts, join requests, decisions, review requests, project updates, launch packets, Codex work
  packets, and contribution reports.
- Hook proposal checks for caps, tests, upgradeability, deployment, governance, payments, and live-holder authority claims.
- Per-instance rate limits for public routes that read 6529 or GitHub setup context.
- Timeout and response-size bounds around external 6529, GitHub, setup, launch, and smoke-check fetches.
- Client request timeouts so UI actions fail clearly instead of hanging.
- Scoped API routes for setup, proposals, local votes, decision receipts, PR records, reviews, launch audit, setup proof,
  and public project state.
- Shared JSON body validation for API routes so malformed, non-object, or oversized request bodies fail clearly.
- A deterministic reviewer foundation with PR manifests, guardian attestations, proof replay, risky path checks, and hook
  contract signal checks.
- Local file storage for the demo flow and optional Postgres storage via [db/001_command_waves.sql](db/001_command_waves.sql).

What remains manual or MVP-only:

- Room posting works when a 6529 bot wallet is configured. Without bot credentials, the app drafts text and opens the
  room for a human to post manually.
- REP, TDH, holder, allowlist, and QnA gates are advisory notes until live wallet/session/score checks are wired.
- Local votes are app records. PR work requires a manually recorded 6529 decision URL before code work starts.
- Codex execution is a controlled packet and local/demo adapter today, not autonomous branch creation.
- The GitHub adapter only opens draft PRs from existing branches when configured. It does not create branches, merge,
  deploy, or spend funds.
- The current guardian runs as a repo-local GitHub Action. The stronger production version should be an external GitHub App.
- Contribution reporting uses visible app activity and room posts pulled into the app. Full scoring across GitHub commits,
  reviews, merges, and off-app activity is still future work.
- The demo work loop can be complete while the public launch audit remains blocked by deployment and environment setup.

What we are working on next:

1. Pick the first real public 6529 room and hook repo.
2. Configure launch env, durable storage, and the required guardian check.
3. Finish the first public loop: discussion, scoped proposal, 6529 decision, PR record, reviewer proof, and share-back.
4. Wire live wallet/session gate checks when the manual gate process is proven.
5. Expand contribution analysis after the workflow is useful and understandable.

## Why This Exists

Agents can help builders move faster, but broad tool access gets risky when a group is moving quickly. In phase 1, agents
only help with reads, drafts, room updates, and PR work after the rules allow it.

The app makes the important answers visible:

- Who decided this work should happen?
- Did the work need a vote?
- Did quorum pass?
- What tool or agent prepared the work?
- What changed?
- Was the result reviewed?
- Can humans audit the chain later?

## MVP

The first public phase:

1. Choose one public 6529 room.
2. Connect one GitHub smart contract repo for the 6529 hook.
3. Record participation gates such as REP, TDH, allowlists, or QnA as advisory until live enforcement is wired.
4. Propose hook work in plain English with clear limits.
5. Let orchestration rules classify risk and require votes for important changes.
6. Let an agent help produce a PR when allowed.
7. Review the PR in CI against the approved proposal, rules, and hook guardrails.
8. Show recent activity and a transparent contribution report.
9. Keep the full audit log available.

No auto-merges, autonomous deploys, spending, or live REP/TDH authority in the first phase.

Launch operating notes are in [docs/first-hook-launch-playbook.md](docs/first-hook-launch-playbook.md).
Contributor rules for the first hook phase are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Trust Boundary

The first public phase is a governed hook-building workflow controlled by one public 6529 room.

Current trust controls:

- The MVP guardian is a repo-local GitHub Action named `Command Waves Guardian`.
- PRs must carry a Command Waves manifest that ties code changes back to an approved room proposal.
- The guardian writes replayable proof artifacts: `guardian-attestation.json`, `guardian-wave-state.json`, and
  `guardian-pr-evidence.json`.
- `npm run guardian:verify-proof` replays the guardian decision from those artifacts.
- Setup proofs now disclose the current guardian mode as `repo_local_github_action` and mark it as `mvp` strength.
- Guardian/reviewer/setup-proof code changes are treated as critical-risk diffs.

The most important production hardening step is moving from the repo-local GitHub Action to an external GitHub App. The app
should own the required check, read the 6529 wave state, replay the same deterministic verifier, and publish the same proof
artifacts. Until then, the MVP is useful and auditable, but not the strongest possible trust boundary.

First launch tasks:

1. Pick the first real 6529 room and hook repo, then publish the launch playbook.
2. Set `COMMAND_WAVE_STATE_URL` to the deployed `/api/command-wave/state` endpoint before making the guardian a required PR check.

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
- Agents request actions; the app decides what is allowed.
- Design for local mock mode first, then production adapters.
- Log every meaningful state transition.

## Current App

The current app is a local prototype of the first hook-building loop. The default screen is the product surface. Secondary
setup and audit tools stay collapsed until a maintainer needs them.

Default workspace:

- Project overview with work-loop status, room, repo, access, review, and first public launch links.
- Current hook task, visible decision need, PR status, latest log, and next action.
- Links to the room, code repo, current PR, and reviewed work.
- Builder message composer with direct room posting when configured, a visible room snapshot, and copyable discussion draft.
- Folded proposal form for one PR-sized hook change with limits, safety checks, and success criteria.
- Builder profiles with 6529 profile links, evidence, visible room activity, and informational activity points.
- Rules of the game next to the builder profiles: who can play, how work moves, and hook guardrails.

Safety and review:

- Rules and access drawer with advisory gate notes.
- Hook proposal preflight for caps, tests, upgradeability, deployment, governance, and live holder-authority claims.
- Risk classification for hook, fee, Solidity, proxy, deployment, and governance work.
- Reviewer gate foundation for manifests, vote status, rules hashes, risky paths, and hook contract signals.
- PR patch checks for upgradeability, delegatecall, destructive opcodes, deployment, governance, and parameter writes when patch records exist.

Audit and launch:

- Recent activity log with export.
- Activity report drawer for app records and manual planning context.
- Launch checklist with setup, readiness, flow checklist, and launch next-action records.
- Remote launch checks can be run from the maintainer drawer to refresh setup and readiness blockers.
- Public setup proof, command-wave state, and launch audit endpoints.
- Copyable discussion update, launch packet, Codex work packet, decision request, and review request drafts.
- The local demo separates work-loop status from launch readiness. Launch readiness still fails until production env,
  durable storage, live 6529 mode, GitHub PR adapter, guardian state, and required checks are configured.

Maintainer setup:

- Collapsed project setup and guardrail controls at the bottom of the page.
- 6529 wave search by name or pasted wave URL/ID.
- Code repo link and setup validation for contributor rules and PR template markers.
- Local file persistence and Postgres storage via [db/001_command_waves.sql](db/001_command_waves.sql).

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Next.

6529 mock mode is the safe default. Set `6529_MOCK_MODE=false` only when you are ready to use the live 6529 API.
Room posting also requires `6529_BOT_BEARER_TOKEN` and `6529_BOT_WALLET_ADDRESS`; otherwise builders can copy the draft
and post manually in the room.

With the example env, command-wave demo state is stored in `.data/command-wave.json`.

Before opening a PR, run the local app gate:

```bash
npm run verify
```

## First Public Launch Env

Before inviting broad participation, set the first-loop launch variables:

```bash
NEXT_PUBLIC_APP_URL=https://your-app.example
COMMAND_WAVE_STORE=postgres
DATABASE_URL=postgresql://user:password@host:5432/command_waves
ADMIN_API_KEY=<strong random key>
6529_MOCK_MODE=false
COMMAND_WAVE_STATE_URL=https://your-app.example/api/command-wave/state
COMMAND_WAVE_REPO_ADAPTER=github
COMMAND_WAVE_GITHUB_TOKEN=<github token>
```

Use [.env.production.example](.env.production.example) as the deployment checklist.

`ADMIN_API_KEY` protects setup, proposal, vote, run, review, and reset actions. `COMMAND_WAVE_STATE_URL` gives guardian PR
checks the public wave state. The ready launch audit requires durable storage and the GitHub PR adapter so the public
workflow can survive restarts and record draft PRs predictably.

The local demo still reports launch gaps until `ADMIN_API_KEY`, `NEXT_PUBLIC_APP_URL`, durable storage, live 6529 mode,
GitHub PR adapter, guardian state, setup validation, and the required guardian check are configured.

## Durable Storage

For a small first loop, local file storage can prove the room-to-PR workflow while 6529 holds the public discussion and
decision receipts. Before broad participation, use Postgres so setup, proposals, votes, decisions, PR records, reviews,
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

Run the PR record adapter against a GitHub pull request event:

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
`guardian-wave-state.json` snapshot it checked, writes `guardian-pr-evidence.json`, appends a Markdown proof summary to
the job summary, replays the proof, and uploads the files as a `guardian-proof` workflow artifact.

The attestation includes hashes of the room state, proposal, poll, rules, PR manifest, and changed paths. The replay
script recomputes the guardian result from the uploaded artifacts. That is the simple fairness proof: anyone with the same
inputs can rerun the deterministic guardian and get the same result.

This is the simple first step. The PR adapter feeds changed paths, PR manifests, and wave state into the same verifier so
GitHub can block merges that do not match the room rules. Pull requests without a Command Waves manifest fail the guardian
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

The GitHub adapter only opens draft PRs from an existing same-repo branch name. It rejects fork refs, raw SHAs, tags, and
ambiguous refs. It does not create branches, merge PRs, deploy contracts, or spend funds.

Verify a published setup proof against GitHub required-check payloads:

```bash
SETUP_PROOF_URL=https://your-app.example/api/command-wave/setup/proof npm run setup:verify
```

If GitHub returns 404 for a rules endpoint, the verifier prints `GITHUB_TARGET_UNAVAILABLE` and continues. The audit still
fails unless the required guardian check is found in another fetched payload or in `SETUP_GITHUB_PAYLOADS_PATH`.

When the setup proof includes `commandWaveStateUrl`, the same command also checks that the state URL returns a
`command-wave-state-v0.1` snapshot for the governed room with a matching state hash.

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
LAUNCH_AUDIT_URL='https://your-app.example/api/command-wave/launch/audit?remote=1' npm run launch:audit
```

The command exits nonzero until the launch audit is ready and generated with remote setup checks. For offline verification, set
`LAUNCH_AUDIT_PATH`.

Against a running local dev server, replace `LOCAL_APP_URL` with the URL printed by Next:

```bash
LOCAL_APP_URL=http://localhost:5001
SMOKE_BASE_URL=$LOCAL_APP_URL npm run smoke:app
SETUP_PROOF_URL=$LOCAL_APP_URL/api/command-wave/setup/proof npm run setup:verify
LAUNCH_AUDIT_URL=$LOCAL_APP_URL/api/command-wave/launch/audit npm run launch:audit
```

The smoke check should pass when the app is loading. The setup and launch commands still exit nonzero until production
env, live 6529 mode, durable storage, GitHub PR adapter, guardian state, and the required guardian check are configured.

Expose the current room state to the guardian with:

```bash
COMMAND_WAVE_STATE_URL=https://your-app.example/api/command-wave/state
```

## Local API

- `GET /api/6529/waves/search?q=term`: search 6529 waves by name.
- `POST /api/6529/context/preview`: preview fetched wave context with cap/source metadata.
- `POST /api/6529/room-post`: post a human-triggered chat message when the bot wallet is configured.
- `GET /api/readiness`: show local/production readiness checks.
- `GET /api/command-wave/setup/proof`: public setup proof with hashes and third-party verification targets.
- `GET /api/command-wave/state`: public current wave state snapshot for guardian PR checks.
- `GET /api/command-wave/launch/audit`: public first-loop launch audit. Add `?remote=1` to run remote wave and repo setup checks.
- `GET /api/command-wave`: return the current local command wave.
- `PUT /api/command-wave`: disabled in phase 1. Use scoped setup, proposal, vote, decision, run, and review routes.
- `PATCH /api/command-wave`: update the demo wave/repo setup and log it.
- `DELETE /api/command-wave`: reset the local demo.
- `POST /api/command-wave/proposals`: submit a work proposal.
- `POST /api/command-wave/votes`: record a yes/no vote. Body requires `proposalId`, `voterIdentity`, and `vote`.
- `POST /api/command-wave/decision`: record a manual 6529 decision receipt. Body requires `proposalId` and `reference`. PR commands require a decision URL from the room.
- `POST /api/command-wave/codex-packet`: create a copyable manual Codex work packet for a PR command with a recorded 6529 decision receipt.
- `POST /api/command-wave/execute`: run the local agent adapter.
- `POST /api/command-wave/review`: run the local reviewer adapter.

Command-wave mutation routes and room posting are open only for local demo mode when `ADMIN_API_KEY` is blank. Once
`ADMIN_API_KEY` is set, send it as either `x-admin-api-key: <key>` or `Authorization: Bearer <key>`. In production,
missing `ADMIN_API_KEY` is a server misconfiguration and protected actions fail closed.

The web console has a collapsed **Access key** field in setup. It stores the key in browser session storage and sends it
only for protected actions. This is an MVP bridge for testing protected routes; production should replace it with proper
wallet/session auth before opening the console broadly.

API errors include an `errorId` so a user-visible error can be matched to server logs.
Routes that accept JSON require a JSON object body. Malformed JSON, arrays, and null bodies return 400-level errors.

## Next Production Steps

1. Apply the Postgres schema, set `COMMAND_WAVE_STORE=postgres`, and verify durable storage.
2. Wire live 6529 setup, proposal, vote, and human-posted result update flows.
3. Finish controlled GitHub branch, commit, PR comment, and CI-state operations.
4. Add controlled Codex execution using [docs/agent-harness-plan.md](docs/agent-harness-plan.md).
5. Add contract-aware review adapters for diffs, tests, deployment files, governance, parameters, and upgradeability patterns.
6. Add human-reviewed contribution reports across wave posts, PRs, reviews, commits, and ledger events.
7. Add production auth, secrets, distributed rate limits, job queue controls, and required GitHub branch protection.
