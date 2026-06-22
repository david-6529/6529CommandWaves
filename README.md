# 6529 Command Waves

## ELI5

Command Waves let a 6529 wave control an AI worker.

Instead of everyone shouting prompts at the AI, people propose commands in the wave. The app checks the rules:

1. Safe commands can run.
2. Risky commands need a yes/no vote.
3. Approved commands run through the AI worker.
4. The result is reviewed.
5. Everything important is logged.

The simple flow is:

`Propose -> Vote if risky -> Run -> Review`

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

The first narrow demo:

1. Choose one 6529 project wave.
2. Connect one GitHub repo.
3. Propose a command in plain English.
4. Let the app decide whether it can run or needs a vote.
5. Vote yes/no when the command is risky.
6. Run the approved command through a controlled agent adapter.
7. Review the result against the approved command.
8. Show recent activity and keep the full audit log available.

No deploys, merging, spending, or autonomous tool use in the first demo.

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

The current app is a local prototype of the simple flow:

- first-screen flow: choose wave, propose work, run/review
- project wave setup with simpler user-facing language
- 6529 wave search by name or pasted wave URL/ID
- GitHub repo link
- participation gate notes
- safety rules by command type
- command proposal form
- automatic risk classification
- poll voting with one vote per voter identity
- backend setup validation for 6529 wave links and GitHub repo links
- controlled run placeholder
- deterministic run manifest evidence with rules hash, tool permissions, and budget cap
- PR reviewer-gate foundation for checking command manifests, vote status, rules hashes, and risky file paths
- deterministic guardian attestations with input hashes and rerunnable pass/fail results
- review records store compact guardian proof material for later audit
- public setup proof endpoint for third-party verification of wave/repo/rules/check expectations
- review placeholder
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

For local demos only, set `COMMAND_WAVE_ALLOW_DEMO_STATE=true` to use the built-in demo wave state.

When the PR adapter runs in GitHub Actions, it writes `guardian-attestation.json`, appends a Markdown proof summary to the
job summary, and uploads the attestation as a workflow artifact.

This is the simple first step. The PR adapter feeds changed paths, PR manifests, and wave state into the same verifier so
GitHub can block merges that do not match the wave rules. Pull requests without a Command Waves manifest fail the guardian
check instead of bypassing it.

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
- `POST /api/command-wave/execute`: run the local AI worker adapter.
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
3. Add real GitHub repo integration.
4. Add controlled agent adapters using [docs/agent-harness-plan.md](docs/agent-harness-plan.md): Codex first, then Claude Code.
5. Add independent review adapters for diffs, tests, rules, and security checks.
6. Add rule version hashes and append-only ledger storage.
7. Add production auth, secrets, rate limits, and job queue controls.
