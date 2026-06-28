create table if not exists command_waves (
  id text primary key,
  name text not null,
  wave_id text not null unique,
  wave_url text not null,
  repo_url text not null,
  gates_json jsonb not null default '[]'::jsonb,
  active_rules_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists command_waves_updated_at_idx on command_waves (updated_at desc);

create table if not exists command_wave_rules (
  id text primary key,
  command_wave_id text not null references command_waves(id) on delete cascade,
  version text not null,
  rules_json jsonb not null,
  rules_hash text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (command_wave_id, version),
  unique (command_wave_id, rules_hash)
);

create index if not exists command_wave_rules_wave_created_idx on command_wave_rules (command_wave_id, created_at desc);

create table if not exists command_proposals (
  id text primary key,
  command_wave_id text not null references command_waves(id) on delete cascade,
  drop_id_6529 text,
  title text not null,
  proposer text not null,
  kind text not null,
  risk text not null,
  prompt text not null,
  spec text not null,
  budget_usd numeric(12, 4) not null default 0,
  status text not null,
  rules_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists command_proposals_wave_created_idx on command_proposals (command_wave_id, created_at desc);
create index if not exists command_proposals_wave_status_idx on command_proposals (command_wave_id, status);
create index if not exists command_proposals_drop_id_6529_idx on command_proposals (drop_id_6529);

create table if not exists command_polls (
  id text primary key,
  proposal_id text not null unique references command_proposals(id) on delete cascade,
  poll_drop_id_6529 text,
  decision_receipt_json jsonb not null default '{}'::jsonb,
  yes_votes integer not null default 0,
  no_votes integer not null default 0,
  quorum_required integer not null,
  yes_percent_required integer not null,
  status text not null,
  opened_at timestamptz not null default now(),
  closes_at timestamptz,
  closed_at timestamptz
);

create index if not exists command_polls_status_closes_idx on command_polls (status, closes_at);
create index if not exists command_polls_drop_id_6529_idx on command_polls (poll_drop_id_6529);

create table if not exists command_votes (
  id text primary key,
  poll_id text not null references command_polls(id) on delete cascade,
  voter_identity text not null,
  vote text not null,
  weight numeric(20, 8) not null default 1,
  source text not null default '6529',
  created_at timestamptz not null default now(),
  unique (poll_id, voter_identity)
);

create index if not exists command_votes_poll_idx on command_votes (poll_id);

create table if not exists command_executions (
  id text primary key,
  proposal_id text not null references command_proposals(id) on delete cascade,
  harness text not null,
  status text not null,
  summary text not null,
  artifacts_json jsonb not null default '[]'::jsonb,
  tool_requests_json jsonb not null default '[]'::jsonb,
  cost_json jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  error text
);

create index if not exists command_executions_proposal_idx on command_executions (proposal_id);
create index if not exists command_executions_status_started_idx on command_executions (status, started_at desc);

create table if not exists guardian_reviews (
  id text primary key,
  proposal_id text not null references command_proposals(id) on delete cascade,
  execution_id text references command_executions(id) on delete set null,
  status text not null,
  checks_json jsonb not null default '[]'::jsonb,
  proof_json jsonb not null default '{}'::jsonb,
  summary text not null,
  reviewer text not null,
  created_at timestamptz not null default now()
);

create index if not exists guardian_reviews_proposal_created_idx on guardian_reviews (proposal_id, created_at desc);
create index if not exists guardian_reviews_execution_idx on guardian_reviews (execution_id);

create table if not exists command_ledger_events (
  id text primary key,
  command_wave_id text not null references command_waves(id) on delete cascade,
  proposal_id text references command_proposals(id) on delete set null,
  actor text not null,
  type text not null,
  message text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists command_ledger_events_wave_created_idx on command_ledger_events (command_wave_id, created_at desc);
create index if not exists command_ledger_events_proposal_created_idx on command_ledger_events (proposal_id, created_at desc);
create index if not exists command_ledger_events_type_created_idx on command_ledger_events (type, created_at desc);

create table if not exists cached_waves (
  wave_id text primary key,
  name text,
  description text,
  raw_json jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

create table if not exists cached_wave_drops (
  drop_id text primary key,
  wave_id text not null,
  serial_no integer,
  created_at_6529 timestamptz,
  author_handle text,
  content text,
  raw_json jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

create index if not exists cached_wave_drops_wave_serial_idx on cached_wave_drops (wave_id, serial_no);
create index if not exists cached_wave_drops_wave_created_idx on cached_wave_drops (wave_id, created_at_6529 desc);
create index if not exists cached_wave_drops_author_idx on cached_wave_drops (author_handle);

create table if not exists command_jobs (
  id text primary key,
  command_wave_id text not null references command_waves(id) on delete cascade,
  proposal_id text references command_proposals(id) on delete set null,
  type text not null,
  status text not null,
  attempts integer not null default 0,
  locked_at timestamptz,
  locked_by text,
  run_after timestamptz not null default now(),
  payload_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists command_jobs_status_run_after_idx on command_jobs (status, run_after);
create index if not exists command_jobs_locked_at_idx on command_jobs (locked_at);
create index if not exists command_jobs_proposal_idx on command_jobs (proposal_id);
