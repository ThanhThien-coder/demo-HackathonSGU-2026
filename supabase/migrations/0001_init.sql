-- 0001_init.sql: Khoi tao luoc do CSDL SimpliFey (03_API_VA_LUU_TRU Muc 3, 3.2)

-- 1. Enums
create type swe_skill as enum (
  'HTTP_ROUTING','DTO_VALIDATION','AUTH_SECURITY','DEPENDENCY_INJECTION',
  'LAYERED_SEPARATION','DB_OPTIMIZATION','ASYNC_CONCURRENCY','TRANSACTION_INTEGRITY',
  'ERROR_HANDLING','STATE_MANAGEMENT','ALGORITHMIC_COMPLEXITY','MEMORY_MANAGEMENT',
  'API_CONTRACT_DESIGN','CACHING_STRATEGY','RATE_LIMIT_RESILIENCE','DATA_SERIALIZATION'
);

create type run_mode as enum ('LEARN');

-- 2. Tables
create table profiles (
  user_id      uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

create table skill_states (
  user_id           uuid not null references profiles on delete cascade,
  skill             swe_skill not null,
  p_mastery         double precision not null check (p_mastery between 0.01 and 0.99),
  last_practiced_at timestamptz not null,
  practice_count    int not null default 0,
  correct_count     int not null default 0,
  primary key (user_id, skill)
);

create table learning_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles on delete cascade,
  source           text not null check (source in ('GITHUB','ZIP')),
  repo_key         text not null,
  snapshot_id      text not null,
  snapshot_id_kind text not null check (snapshot_id_kind in ('COMMIT_SHA','ARCHIVE_HASH')),
  subdir           text not null default '',
  ref_label        text,
  repo_name        text not null,
  engine_version   text not null,
  graph_skeleton   jsonb not null,
  tokens_used      int not null default 0,
  created_at       timestamptz not null default now(),
  last_active_at   timestamptz not null default now()
);
create index on learning_sessions (user_id, source, snapshot_id, subdir, engine_version);

create table session_snapshots (
  session_id  uuid primary key references learning_sessions on delete cascade,
  result      jsonb not null,
  created_at  timestamptz not null default now()
);

create table node_progress (
  session_id       uuid not null references learning_sessions on delete cascade,
  node_id          text not null,
  status           text check (status in ('AVAILABLE','COMPLETED','FAILED')),
  analysis_failed  boolean not null default false,
  updated_at       timestamptz not null default now(),
  primary key (session_id, node_id)
);

create table node_runs (
  id                          uuid primary key default gen_random_uuid(),
  session_id                  uuid not null references learning_sessions on delete cascade,
  node_id                     text not null,
  mode                        run_mode not null,
  questions                   jsonb not null,
  steps                       jsonb not null,
  forbidden_external_keywords text[] not null,
  started_at                  timestamptz not null default now(),
  finished_at                 timestamptz
);
create unique index node_runs_one_open on node_runs (session_id, node_id) where finished_at is null;
create index on node_runs (session_id, node_id);

create table question_attempts (
  id             bigint generated always as identity primary key,
  run_id         uuid not null references node_runs on delete cascade,
  question_index smallint not null,
  attempt_number smallint not null check (attempt_number between 1 and 3),
  skill          swe_skill not null,
  core_accuracy  smallint not null,
  simplicity     smallint not null,
  intent         text not null check (intent in ('ANSWER','GIVE_UP','OFF_TOPIC')),
  is_passed      boolean not null,
  points_covered boolean[] not null,
  student_answer text not null check (char_length(student_answer) <= 2000),
  created_at     timestamptz not null default now()
);
create index on question_attempts (run_id);

create table ai_cache (
  cache_key      text primary key,
  kind           text not null check (kind in ('NODE_ANALYSIS','REPO_OVERVIEW')),
  payload        jsonb not null,
  model          text not null,
  prompt_version text not null,
  tokens_in      int not null,
  tokens_out     int not null,
  created_at     timestamptz not null default now()
);

create table ai_usage (
  id          bigint generated always as identity primary key,
  session_id  uuid not null references learning_sessions on delete cascade,
  call_kind   text not null check (call_kind in ('ANALYZE','OVERVIEW','QUESTIONS','GRADE')),
  tokens_in   int not null,
  tokens_out  int not null,
  cost_usd    numeric(8,6) not null,
  created_at  timestamptz not null default now()
);
create index on ai_usage (session_id);

create table dispute_reports (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references profiles on delete cascade,
  run_id         uuid not null references node_runs on delete cascade,
  question_index smallint not null,
  note           text not null check (char_length(note) <= 500),
  created_at     timestamptz not null default now()
);
create index on dispute_reports (run_id);
create index on dispute_reports (user_id);

-- 3. Row Level Security (RLS) - 03 Muc 3.2
alter table profiles enable row level security;
alter table skill_states enable row level security;
alter table learning_sessions enable row level security;
alter table session_snapshots enable row level security;
alter table node_progress enable row level security;
alter table node_runs enable row level security;
alter table question_attempts enable row level security;
alter table ai_cache enable row level security;
alter table ai_usage enable row level security;
alter table dispute_reports enable row level security;

-- Client SELECT policies
create policy "profiles_select_own" on profiles
  for select to authenticated
  using (auth.uid() = user_id);

create policy "skill_states_select_own" on skill_states
  for select to authenticated
  using (auth.uid() = user_id);

create policy "learning_sessions_select_own" on learning_sessions
  for select to authenticated
  using (auth.uid() = user_id);

create policy "node_progress_select_own" on node_progress
  for select to authenticated
  using (
    exists (
      select 1 from learning_sessions
      where learning_sessions.id = node_progress.session_id
        and learning_sessions.user_id = auth.uid()
    )
  );

create policy "dispute_reports_select_own" on dispute_reports
  for select to authenticated
  using (auth.uid() = user_id);
