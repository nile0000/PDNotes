-- PD Notes v2 — initial schema
-- Run this once in the Supabase project's SQL editor (Dashboard > SQL Editor > New query).

-- ── medication_schedules ────────────────────────────────────────────────
create table medication_schedules (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  dose        text not null default '',
  timing      text not null default '',
  purpose     text not null default '',
  start_date  date not null,
  end_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_medication_schedules_user_range
  on medication_schedules (user_id, start_date, end_date);

-- ── day_statuses (composite natural key: one row per user per date) ─────
create table day_statuses (
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  rating      text not null default 'NORMAL'
                check (rating in ('GOOD', 'NORMAL', 'BAD')),
  note        text not null default '',
  exercise    text not null default '',
  is_read     boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, date)
);

-- ── day_symptoms (composite natural key) ─────────────────────────────────
create table day_symptoms (
  user_id             uuid not null references auth.users(id) on delete cascade,
  date                date not null,
  tremors             text not null default '',
  tremors_severity    smallint not null default 0 check (tremors_severity between 0 and 5),
  legs                text not null default '',
  legs_severity       smallint not null default 0 check (legs_severity between 0 and 5),
  plumbing            text not null default '',
  plumbing_severity   smallint not null default 0 check (plumbing_severity between 0 and 5),
  neuropathy          text not null default '',
  neuropathy_severity smallint not null default 0 check (neuropathy_severity between 0 and 5),
  sleep               text not null default '',
  sleep_severity      smallint not null default 0 check (sleep_severity between 0 and 5),
  diet                text not null default '',
  diet_severity       smallint not null default 0 check (diet_severity between 0 and 5),
  pain                text not null default '',
  pain_severity       smallint not null default 0 check (pain_severity between 0 and 5),
  updated_at          timestamptz not null default now(),
  primary key (user_id, date)
);

-- ── contacts ───────────────────────────────────────────────────────────
create table contacts (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  role        text not null default '',
  phone       text not null default '',
  email       text not null default '',
  address     text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_contacts_user on contacts (user_id);

-- ── appointments ───────────────────────────────────────────────────────
create table appointments (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  title       text not null,
  time        text not null default '',   -- "HH:mm" 24h, "" = unset
  location    text not null default '',
  notes       text not null default '',
  contact_id  uuid references contacts(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_appointments_user_date on appointments (user_id, date);

-- ── Row Level Security: every table scoped to auth.uid() = user_id ─────
alter table medication_schedules enable row level security;
alter table day_statuses          enable row level security;
alter table day_symptoms          enable row level security;
alter table contacts              enable row level security;
alter table appointments          enable row level security;

create policy "select_own" on medication_schedules for select using (auth.uid() = user_id);
create policy "insert_own" on medication_schedules for insert with check (auth.uid() = user_id);
create policy "update_own" on medication_schedules for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own" on medication_schedules for delete using (auth.uid() = user_id);

create policy "select_own" on day_statuses for select using (auth.uid() = user_id);
create policy "insert_own" on day_statuses for insert with check (auth.uid() = user_id);
create policy "update_own" on day_statuses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own" on day_statuses for delete using (auth.uid() = user_id);

create policy "select_own" on day_symptoms for select using (auth.uid() = user_id);
create policy "insert_own" on day_symptoms for insert with check (auth.uid() = user_id);
create policy "update_own" on day_symptoms for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own" on day_symptoms for delete using (auth.uid() = user_id);

create policy "select_own" on contacts for select using (auth.uid() = user_id);
create policy "insert_own" on contacts for insert with check (auth.uid() = user_id);
create policy "update_own" on contacts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own" on contacts for delete using (auth.uid() = user_id);

create policy "select_own" on appointments for select using (auth.uid() = user_id);
create policy "insert_own" on appointments for insert with check (auth.uid() = user_id);
create policy "update_own" on appointments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own" on appointments for delete using (auth.uid() = user_id);
