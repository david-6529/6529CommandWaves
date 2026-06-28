# Production Data Model

The current app uses local JSON persistence for development speed. Production should move the same state machine into Postgres without changing the product flow.

The first SQL foundation is in [../db/001_command_waves.sql](../db/001_command_waves.sql).

## Core Tables

### command_waves

One row per governed project wave.

- `id`
- `name`
- `wave_id`
- `wave_url`
- `repo_url`
- `gates_json`
- `active_rules_version`
- `created_at`
- `updated_at`

Indexes:

- unique `wave_id`
- `updated_at`

### command_wave_rules

Versioned governance rules.

- `id`
- `command_wave_id`
- `version`
- `rules_json`
- `rules_hash`
- `created_by`
- `created_at`

Rules should never be silently overwritten. A rule change creates a new version and ledger event.

Indexes:

- `command_wave_id, created_at`
- unique `command_wave_id, version`
- unique `command_wave_id, rules_hash`

### command_proposals

The proposed prompt/command before execution.

- `id`
- `command_wave_id`
- `6529_drop_id`
- `title`
- `proposer`
- `kind`
- `risk`
- `prompt`
- `spec`
- `budget_usd`
- `status`
- `rules_version`
- `created_at`
- `updated_at`

Indexes:

- `command_wave_id, created_at`
- `command_wave_id, status`
- `6529_drop_id`

### command_polls

The vote state tied to a proposal.

- `id`
- `proposal_id`
- `6529_poll_drop_id`
- `decision_receipt_json`
- `yes_votes`
- `no_votes`
- `quorum_required`
- `yes_percent_required`
- `status`
- `opened_at`
- `closes_at`
- `closed_at`

Indexes:

- unique `proposal_id`
- `6529_poll_drop_id`
- `status, closes_at`

### command_votes

Vote records for local MVP voting and, later, imported 6529 poll activity. The unique `(poll_id, voter_identity)` constraint is the server-side duplicate-vote guard.

- `id`
- `poll_id`
- `voter_identity`
- `vote`
- `weight`
- `source`
- `created_at`

Indexes:

- unique `poll_id, voter_identity`
- `poll_id`

### command_executions

The agent run record.

- `id`
- `proposal_id`
- `harness`
- `status`
- `summary`
- `artifacts_json`
- `tool_requests_json`
- `cost_json`
- `started_at`
- `finished_at`
- `error`

Indexes:

- `proposal_id`
- `status, started_at`

### guardian_reviews

The independent review of execution.

- `id`
- `proposal_id`
- `execution_id`
- `status`
- `checks_json`
- `summary`
- `reviewer`
- `created_at`

Indexes:

- `proposal_id, created_at`
- `execution_id`

### command_ledger_events

Append-only audit log.

- `id`
- `command_wave_id`
- `proposal_id`
- `actor`
- `type`
- `message`
- `metadata_json`
- `created_at`

Indexes:

- `command_wave_id, created_at`
- `proposal_id, created_at`
- `type, created_at`

## 6529 Cache Tables

### cached_waves

- `wave_id`
- `name`
- `description`
- `raw_json`
- `fetched_at`

### cached_wave_drops

- `drop_id`
- `wave_id`
- `serial_no`
- `created_at_6529`
- `author_handle`
- `content`
- `raw_json`
- `fetched_at`

Indexes:

- unique `drop_id`
- `wave_id, serial_no`
- `wave_id, created_at_6529`
- `author_handle`

This supports later cross-wave questions and user activity lookup without refetching every drop on every command.

## Job Tables

### command_jobs

Used for agent and reviewer jobs.

- `id`
- `command_wave_id`
- `proposal_id`
- `type`
- `status`
- `attempts`
- `locked_at`
- `locked_by`
- `run_after`
- `payload_json`
- `result_json`
- `error`
- `created_at`
- `updated_at`

Indexes:

- `status, run_after`
- `locked_at`
- `proposal_id`

## Non-Negotiables

- Ledger events are append-only.
- Rule versions are append-only.
- Executions and reviews must preserve the rules version they evaluated.
- Cached 6529 drops are operational context, not authority. The 6529 wave remains the source of truth.
- Posting, PR creation, scripts, deploys, spending, and rule changes must be represented as jobs with explicit status.
- Secrets never enter these tables. Store only references, public artifact URLs, hashes, and redacted summaries.
