# Lessons Reused From 6529arena

The old `6529arena` repo should not be copied wholesale. Command Waves is a different product. The useful parts are the operating lessons and a few adapter patterns.

## Keep

- 6529 waves are the social source of truth.
- The external app is the control panel for setup, rules, queue state, and audit views.
- Every meaningful state change gets a ledger event.
- Local mock mode comes first, then production adapters.
- 6529 reads need pagination, cap warnings, and source metadata.
- 6529 posts should go through one dedicated bot wallet, never a user's personal wallet.
- Agents should request tool actions. The platform decides whether the action is allowed.
- Cost caps, rate limits, and run status belong in the backend, not only in the UI.
- Production readiness should be explicit and boring: database, secrets, rate limits, 6529 auth, posting readiness, provider readiness.

## Do Not Keep

- Battles, leaderboards, public agent submissions, and scoring surfaces are not part of the Command Waves MVP.
- "Operator/admin" language should not dominate the user-facing product.
- Long check-in summaries are not the core product. Summaries become context for proposals, reviews, and audits.
- External agents should not get direct secrets, broad filesystem access, wallet keys, or posting rights.

## Safety Model

Reputation is useful for routing and eligibility, but it is not a security boundary.

Permissions are the security boundary.

For Command Waves this means:

- Read-only and draft-only actions can be low risk.
- Posting, PR creation, scripts, deploys, spending, and rule changes require explicit policy.
- High-risk tool calls go through a tool proxy controlled by the app.
- The AI worker receives only the context required for the approved command.
- Secrets stay in environment variables or a secret manager and never enter prompts.
- Prompt injection is expected. The defense is constrained tools and review, not trust in source text.
- The reviewer checks the approved command, artifacts, changed files, tests, rule version, and dangerous surfaces before completion.

## 6529 Integration Pattern

The arena repo already proved these pieces are useful:

- Normalize wave IDs from pasted wave links.
- Search waves by name through the 6529 API, with local history fallback later.
- Fetch drops in pages with `serial_no_limit` and `FIND_OLDER`.
- Track whether a fetch hit the safety cap.
- Label context from primary wave vs related/sub waves.
- Preserve source wave IDs, names, roles, drop IDs, authors, serial numbers, and timestamps.
- Use mock mode for offline tests.
- Post only after policy allows it, and record post failures as events.

## First Production Shape

Start with:

- Next app on Vercel or a simple Node host.
- Postgres for command waves, proposals, polls, executions, reviews, ledger events, jobs, and cached 6529 drops.
- Vercel Cron or a small worker for queued AI worker/reviewer jobs.
- Internal AI worker adapters first: Codex CLI or Claude Code called from controlled workers.
- Dedicated 6529 bot wallet stored only in the host secret store.
- No arbitrary external agent endpoints until signed manifests, timeouts, payload limits, domain allowlists, and tool permissions exist.

## Command Waves Translation

Arena concept -> Command Waves concept:

- Wave check-in -> command context snapshot.
- Task workflow -> command kind / risk class.
- Source gate -> reviewer evidence check.
- Operator action -> member or agent proposal.
- Admin-only posting -> policy-gated bot post.
- Evaluation battle -> not in MVP.
