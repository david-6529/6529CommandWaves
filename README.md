# Decentralized Coding: Beta

## Short Version

This is a simple shared workspace for building an open source project in public through one project chat and one GitHub repo.

The first public phase is the 6529 AMM hook. Builders talk in project chat, turn one idea into a small proposal, record
the decision, build a draft PR, review it, and share the result back with a clear log.

The same loop can become reusable infrastructure later. For now, the product stays focused on one successful hook build.

The builder flow is:

1. Choose the hook project.
2. Read what is happening now.
3. Chat with builders.
4. Suggest one small change.
5. Record the project decision.
6. Build the PR.
7. Review before humans merge.
8. Share the update.

The simple product shape is:

`Project -> Discuss -> Decide -> PR -> Review -> Log`

## Current Status

This repo is an MVP prototype for one public hook-building project. The pilot is the 6529 AMM hook, with a 6529 wave as
the first project chat source. It is intentionally scoped to prove one clear loop before it becomes a broader builder
protocol.

What exists now:

- A Next app product surface called Decentralized Coding: Beta, focused on helping builders work together in public.
- One active hook project with project chat and a placeholder GitHub repo until the first repo is selected.
- A top-right wallet connection control that can add a connected address to the access request draft.
- Orchestrator identity set to the 6529 account `daemon`.
- Review agent and GitHub repo are explicit placeholders for this phase until the reviewer process and first repo are selected.
- A simplified chat-first UI with a project overview, current hook change, chat composer, latest posts, builder profiles,
  project rules, and folded proposal flow.
- Simple work types: Code PR, Question, Update, and Context.
- Copyable drafts for chat posts, join requests, decisions, review requests, project updates, launch packets, Codex work
  packets, and contribution reports.
- Hook proposal checks for caps, tests, upgradeability, deployment, governance, payments, and live-holder authority claims.
- Per-instance rate limits for public routes that read 6529 or GitHub setup context.
- Timeout and response-size bounds around external 6529, GitHub, setup, launch, and smoke-check fetches.
- Client request timeouts so UI actions fail clearly instead of hanging.
- Scoped API routes for setup, proposals, local votes, decision receipts, PR records, reviews, launch audit, setup proof,
  and public project state.
- Public active project index for agents or future UI surfaces that need the hook list and project chat links.
- Public verification manifest lists itself, setup proof, state, project index, launch audit, chat launch, and required hash fields.
- Public project state includes a full snapshot hash, so setup checks can detect stale or edited state payloads.
- Shared JSON body validation for API routes so malformed, non-object, or oversized request bodies fail clearly.
- A deterministic reviewer foundation with PR manifests, guardian attestations, proof replay, risky path checks, and hook
  contract signal checks.
- Setup proof omits placeholder GitHub repo values and blocks required-check verification until the real repo is selected.
- Setup validation checks the selected hook repo for contributor rules, the PR template, the guardian workflow, and the required guardian check.
- Launch audit, workflow proof, checklists, launch packets, update drafts, and contribution reports reject stale PR or review evidence unless the PR link and review proof are bound to the configured repo.
- Review cannot record guardian proof unless the current execution includes a PR link for the configured repo.
- GitHub guardian PR evidence includes the target repo and fails when it does not match the configured hook repo.
- The GitHub adapter can open draft PRs from prepared branches and post bounded PR comments. It still does not create
  branches, commit code, merge, deploy, or change repo settings.
- Local file storage for the demo flow and optional Postgres storage via [db/001_command_waves.sql](db/001_command_waves.sql).

What remains manual or MVP-only:

- Chat posting works when a 6529 bot wallet is configured. Without bot credentials, the app drafts text for a human to
  post manually.
- Wallet connection is identity context for access drafts. Reputation, token, holder, allowlist, and QnA requirements are
  manual notes until live wallet, session, and score checks exist.
- Local votes are app records. PR work requires a manually recorded project decision URL before code work starts.
- Codex execution is a controlled packet and local/demo adapter today, not autonomous branch creation. PR work packets
  require the GitHub repo to be selected.
- The GitHub repo is a placeholder in the default project state and must be selected before PR work can run.
- The GitHub adapter only opens draft PRs from existing branches when configured. It does not create branches, merge,
  deploy, or spend funds.
- The current guardian runs as a repo-local GitHub Action. The stronger production version should be an external GitHub App.
- Contribution reporting uses visible app activity and project chat posts pulled into the app. Full scoring across GitHub commits,
  reviews, merges, and off-app activity is still future work.
- The seeded demo includes discussion and decision activity, but the default placeholder repo keeps PR work blocked until the repo is selected.

What we are working on next:

1. Pick the first real public project chat.
2. Keep the GitHub repo as a placeholder until the hook repo is selected for PR work.
3. Configure launch env, durable storage, and daemon chat posting.
4. Add the selected hook repo, guardian workflow, and required guardian check before the first PR.
5. Finish the first public loop: discussion, scoped proposal, project decision, PR record, reviewer proof, and share-back.
6. Wire live wallet/session access checks when the manual access process is proven.
7. Expand contribution analysis after the workflow is useful and understandable.

## Why This Exists

Agents can help builders move faster, but broad agent permissions get risky when a group is moving quickly. In phase 1, agents
only help with reads, drafts, chat updates, and PR work after the rules allow it.

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

1. Choose one public project chat.
2. Connect one GitHub smart contract repo for the hook.
3. Record who-can-join requirements such as reputation, token, allowlists, or QnA as advisory until live enforcement exists.
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

The first public phase is a governed hook-building workflow controlled by one public project chat.

Current trust controls:

- The MVP guardian is a repo-local GitHub Action named `Command Waves Guardian`.
- PRs must carry a Command Waves manifest that ties code changes back to an approved project proposal.
- The guardian writes replayable proof artifacts: `guardian-attestation.json`, `guardian-wave-state.json`, and
  `guardian-pr-evidence.json`.
- `npm run guardian:verify-proof` replays the guardian decision from those artifacts.
- Setup proofs now disclose the current guardian mode as `repo_local_github_action` and mark it as `mvp` strength.
- Guardian/reviewer/setup-proof code changes are treated as critical-risk diffs.

The most important production hardening step is moving from the repo-local GitHub Action to an external GitHub App. The app
should own the required check, read the public project state, replay the same deterministic verifier, and publish the same proof
artifacts. Until then, the MVP is useful and auditable, but not the strongest possible trust boundary.

First launch tasks:

1. Pick the first real project chat and hook repo, then publish the launch playbook.
2. Set `COMMAND_WAVE_STATE_URL` to the deployed `/api/command-wave/state` endpoint before making the guardian a required PR check.

Hardening tasks after the first public loop:

1. Move the guardian into an external GitHub App, keeping the verifier as the shared core.
2. Replace local PR adapter execution with a controlled Codex harness that prepares branches.
3. Expand contribution reports from app activity into wave posts, PRs, reviews, commits, and ledger events.

## Lessons Reused From `6529arena`

See [docs/6529arena-lessons.md](docs/6529arena-lessons.md) for the full transfer.

Short version:

- Keep the public project chat as the social source of truth.
- Use the app as the control panel for setup, rules, jobs, and audit views.
- Reputation can route work, but permissions are the real security boundary.
- Agents request actions; the app decides what is allowed.
- Design for local mock mode first, then production adapters.
- Log every meaningful state transition.

## Current App

The current app is a local prototype of the first hook-building loop. The default screen is the product surface. Secondary
setup and audit tools stay collapsed until a maintainer needs them.

Default workspace:

- Project overview with chat, repo, access, and current status.
- Current hook task, saved discussion items, visible decision need, recent PR evidence, latest log, and next action.
- Links to project chat, GitHub repo, current PR, and reviewed work where those records exist.
- Builder message composer with direct chat posting when configured, recent posts, and copyable discussion draft.
- Folded proposal form for one PR-sized hook change with a Discuss, Decide, Save, Build, Review flow strip.
- Builder profiles with profile links, visible chat and repo activity, and informational contribution signals.
- Collapsed build reference: who can join, activity-report boundaries, and hook guardrails.

Safety and review:

- Rules section with plain-English access notes.
- Hook proposal preflight for caps, tests, upgradeability, deployment, governance, and live holder-authority claims.
- Risk classification for hook, fee, Solidity, proxy, deployment, and governance work.
- Reviewer check foundation for manifests, vote status, rules hashes, risky paths, and hook contract signals.
- PR patch checks for upgradeability, delegatecall, destructive opcodes, deployment, governance, parameter writes, and bound-test evidence when patch records exist.

Audit and launch:

- Recent activity log with export.
- Activity report section for app records and manual planning context.
- Launch checklist with setup, readiness, flow checklist, and launch next-action records.
- Remote launch checks can be run from maintainer controls to refresh setup, required guardian check, and readiness blockers.
- Copyable launch status includes an operator checklist with the exact env and repo actions needed before broad participation.
- Public setup proof, command-wave state, and launch audit endpoints.
- Public verification manifest with stable anchors, required hash fields, and a self endpoint for third-party checks.
- Public contribution report endpoint with a hashable informational report. It does not grant access, payouts, merge
  rights, reputation, or token weight.
- Public command-wave state and launch audit publish the phase 1 authority boundary for agents, reviewers, and third-party auditors.
- Public launch audit includes a human-readable status draft with next action, operator checklist, verification links, and guardrails.
- Public launch audit separates chat launch readiness from the full reviewed PR loop.
- `npm run chat:launch` verifies the chat launch track while the GitHub repo is still a placeholder.
- Public command-wave state includes the informational contribution report method and notes.
- Public launch audit includes the hashed wave state, rules, and full audit bundle it checked.
- Public command-wave state and launch audit include a workflow proof for chat, decision, PR, review, and log steps.
- Public launch audit includes informational contribution and developer fee records, with payments kept outside the app.
- Public launch audit publishes the same human-readable launch packet builders can share back to chat, with a packet hash.
- Copyable discussion update, launch packet, Codex work packet, decision request, and review request drafts.
- The copyable launch packet includes the same workflow proof chain for chat share-back.
- The local demo separates current work status from launch readiness. Chat launch readiness still needs production env,
  durable storage, live 6529 mode, and daemon posting. PR-loop readiness also needs a selected repo, GitHub PR adapter,
  guardian state, guardian workflow, and required checks.

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
Chat posting also requires `6529_BOT_BEARER_TOKEN` and `6529_BOT_WALLET_ADDRESS`; otherwise builders can copy the draft
and post manually.

With the example env, command-wave demo state is stored in `.data/command-wave.json`.

Before opening a PR, run the local quality check:

```bash
npm run verify
```

This regenerates Next route types before TypeScript, runs lint and tests, checks for em dash characters, and builds the app.

## First Public Launch Env

Before inviting broad participation, set the first-loop launch variables:

```bash
NEXT_PUBLIC_APP_URL=https://your-app.example
COMMAND_WAVE_STORE=postgres
DATABASE_URL=postgresql://user:password@host:5432/command_waves
ADMIN_API_KEY=<strong random key>
COMMAND_WAVE_INITIAL_NAME="Hook Build"
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

Use [.env.production.example](.env.production.example) as the deployment checklist.

`COMMAND_WAVE_INITIAL_WAVE_URL` seeds the first project chat. `COMMAND_WAVE_INITIAL_REPO_URL` stays as a placeholder
until the pilot repo is selected, and PR work stays blocked while it is unchanged. Launch readiness fails a placeholder
project chat, warns on a placeholder repo, and blocks PR work until a real repo is selected. `ADMIN_API_KEY` protects setup,
proposal, vote, run, review, and reset actions. `COMMAND_WAVE_STATE_URL` gives guardian PR checks the public wave state.
`COMMAND_WAVE_GUARDIAN_REQUIRED_CHECK` names the check that must be required in GitHub branch protection or rulesets.
The chat-first launch requires daemon chat posting credentials and durable storage. A ready PR loop also requires the
GitHub PR adapter, the guardian workflow in the selected hook repo, and the required guardian check so the public workflow
can record draft PRs predictably.

The local demo still reports launch gaps until the first hook chat is reachable, `ADMIN_API_KEY`, `NEXT_PUBLIC_APP_URL`,
durable storage, live 6529 mode, daemon chat posting credentials, and setup validation are configured. PR-loop readiness
also requires the selected repo, GitHub PR adapter, guardian state, guardian workflow, and required guardian check.

## Durable Storage

For a small first loop, local file storage can prove the chat-to-PR workflow while 6529 holds the public discussion and
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

The repo includes a first GitHub Actions check named `Command Waves Guardian`.

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

The attestation includes hashes of the project state, proposal, poll, rules, PR manifest, and changed paths. The replay
script recomputes the guardian result from the uploaded artifacts. That is the simple fairness proof: anyone with the same
inputs can rerun the deterministic guardian and get the same result.

This is the simple first step. The PR adapter feeds changed paths, PR manifests, and wave state into the same verifier so
GitHub can block merges that do not match the project rules. Pull requests without a Command Waves manifest fail the guardian
check instead of bypassing it.

The current guardian enforcement mode is `repo_local_github_action`. That is good enough for the MVP because guardian code
and workflow changes are treated as critical-risk PRs, but the stronger production version should move the check into an
external GitHub App so the governed repo cannot edit its own reviewer.

The setup proof can advertise the production guardian by setting:

- `COMMAND_WAVE_GUARDIAN_MODE=external_github_app`
- `COMMAND_WAVE_GUARDIAN_REQUIRED_CHECK=<external app check name>`
- `COMMAND_WAVE_GUARDIAN_PROOF_ARTIFACT=<artifact name>`

Before making `Command Waves Guardian` a required GitHub check, copy `.github/workflows/guardian-review.yml` into the
selected hook repo and configure one real wave-state source for the workflow:

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

If GitHub returns 404 for a rules endpoint, the verifier prints `GITHUB_TARGET_UNAVAILABLE` and continues. If another setup
target cannot be fetched, it prints `SETUP_TARGET_UNAVAILABLE`. The audit still fails unless the required evidence is found.

When the setup proof includes `commandWaveStateUrl`, the same command also checks that the state URL returns a
`command-wave-state-v0.1` snapshot for the governed project with a matching state hash.

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

Verify the chat launch before inviting builders into discussion:

```bash
CHAT_LAUNCH_URL='https://your-app.example/api/command-wave/launch/chat?remote=1' npm run chat:launch
```

If `NEXT_PUBLIC_APP_URL` is set, `npm run launch:audit` reads
`$NEXT_PUBLIC_APP_URL/api/command-wave/launch/audit?remote=1`. Set `LAUNCH_AUDIT_REMOTE=0` only for local shape checks.
Without an explicit path, URL, or app URL, `npm run launch:audit` uses the local dev app at `http://localhost:5001` and
runs a shape-only audit.

If `NEXT_PUBLIC_APP_URL` is set, `npm run chat:launch` reads
`$NEXT_PUBLIC_APP_URL/api/command-wave/launch/chat?remote=1`. Set `CHAT_LAUNCH_REMOTE=0` only for local shape checks.
Without an explicit path, URL, or app URL, `npm run chat:launch` uses the local dev app at `http://localhost:5001` and
runs a shape-only chat launch check.

`npm run chat:launch` exits nonzero until the chat launch track is ready and generated with remote setup checks. The full
`npm run launch:audit` command exits nonzero until the reviewed PR loop is also ready. For offline verification, set
`CHAT_LAUNCH_PATH` or `LAUNCH_AUDIT_PATH`. The full launch verifier prints the status draft, state hashes, blockers,
open items, and an operator checklist.
When it can resolve the command-wave state target, it also checks that the public state snapshot hash matches the launch
audit evidence. When it can resolve the project index target, it checks that the active project list includes the launch
project and has a valid hash. Set `LAUNCH_AUDIT_STATE_URL` or `LAUNCH_AUDIT_PROJECT_INDEX_URL` to override those targets
during offline checks.

Against a running local dev server on the default port:

```bash
SMOKE_BASE_URL=http://localhost:5001 npm run smoke:app
npm run setup:verify
npm run chat:launch
npm run launch:audit
```

If Next is running on another port, set `LOCAL_APP_URL` to that app URL before `setup:verify`, `chat:launch`, or
`launch:audit`. The smoke check should pass when the app is loading. The setup and launch commands still exit nonzero
until production env, live 6529 mode, durable storage, and daemon posting are configured. PR-loop readiness also needs a
selected repo, GitHub PR adapter, guardian state, guardian workflow, and the required guardian check.

Expose the current project state to the guardian with:

```bash
COMMAND_WAVE_STATE_URL=https://your-app.example/api/command-wave/state
```

## Local API

- `GET /api/6529/waves/search?q=term`: search 6529 waves by name.
- `POST /api/6529/context/preview`: preview fetched wave context with cap/source metadata.
- `POST /api/6529/chat-post`: post a human-triggered chat message when the bot wallet is configured.
- `GET /api/readiness`: show local/production readiness checks.
- `GET /api/command-wave/setup/proof`: public setup proof with hashes and third-party verification targets.
- `GET /api/command-wave/state`: public current wave state snapshot for guardian PR checks.
- `GET /api/command-wave/projects`: public active hook project index with a stable project-list hash.
- `GET /api/command-wave/reports/contribution`: public informational contribution report with a `reportHash`.
- `GET /api/command-wave/verification/manifest`: public map of verification endpoints, required hash fields, stable anchors, and its own manifest URL.
- `GET /api/command-wave/launch/audit`: public first-loop launch audit with authority boundary. Add `?remote=1` to run remote wave and repo setup checks.
- `GET /api/command-wave/launch/chat`: public chat launch audit with `chatLaunchHash`. Add `?remote=1` before inviting builders into discussion.
- `GET /api/command-wave`: return the current local command wave.
- `PUT /api/command-wave`: disabled in phase 1. Use scoped setup, proposal, vote, decision, run, and review routes.
- `PATCH /api/command-wave`: update the demo wave/repo setup and log it.
- `DELETE /api/command-wave`: reset the local demo.
- `POST /api/command-wave/proposals`: submit a work proposal.
- `POST /api/command-wave/votes`: record a yes/no vote. Body requires `proposalId`, `voterIdentity`, and `vote`.
- `POST /api/command-wave/decision`: record a manual project decision receipt. Body requires `proposalId` and `reference`. PR commands require a decision URL from project chat.
- `POST /api/command-wave/codex-packet`: create a copyable manual Codex work packet for a PR command with a recorded project decision receipt.
- `POST /api/command-wave/execute`: run the local agent adapter.
- `POST /api/command-wave/review`: run the local reviewer adapter.

Command-wave mutation routes and chat posting are open only for local demo mode when `ADMIN_API_KEY` is blank. Once
`ADMIN_API_KEY` is set, send it as either `x-admin-api-key: <key>` or `Authorization: Bearer <key>`. In production,
missing `ADMIN_API_KEY` is a server misconfiguration and protected actions fail closed.

The web console has a collapsed **Access key** field in setup. It stores the key in browser session storage and sends it
only for protected actions. This is an MVP bridge for testing protected routes; production should replace it with proper
wallet/session auth before opening the console broadly.

API errors include an `errorId` so a user-visible error can be matched to server logs.
Routes that accept JSON require a JSON object body. Malformed JSON, arrays, and null bodies return 400-level errors.

## Next Production Steps

1. Apply the Postgres schema, set `COMMAND_WAVE_STORE=postgres`, and verify durable storage.
2. Set the initial hook wave and repo, then run the remote launch audit until setup is reachable.
3. Finish controlled GitHub branch, commit, and CI-state operations. Bounded PR comments are supported by the GitHub adapter.
4. Add controlled Codex execution using [docs/agent-harness-plan.md](docs/agent-harness-plan.md).
5. Add contract-aware review adapters for diffs, tests, deployment files, governance, parameters, and upgradeability patterns.
6. Add human-reviewed contribution reports across wave posts, PRs, reviews, commits, and ledger events.
7. Add production auth, secrets, distributed rate limits, job queue controls, and required GitHub branch protection.
