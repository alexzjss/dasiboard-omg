create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  google_sub text not null unique,
  email text not null unique,
  name text not null,
  picture text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  university text not null default 'USP',
  course text not null default 'Sistemas de Informação',
  campus text,
  student_number text,
  semester smallint,
  handle text,
  bio text,
  entry_year smallint,
  links jsonb not null default '{}'::jsonb,
  show_courses text not null default 'all',
  show_connections text not null default 'all',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_profiles_bio_length_check check (char_length(bio) <= 280),
  constraint student_profiles_show_courses_check check (show_courses in ('all', 'connections', 'none')),
  constraint student_profiles_show_connections_check check (show_connections in ('all', 'connections', 'none'))
);

create unique index if not exists student_profiles_handle_key on public.student_profiles(handle);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  semester text,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (user_id, course_id, semester)
);

create table if not exists public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  room text,
  building text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists enrollments_user_id_idx on public.enrollments(user_id);
create index if not exists class_schedules_enrollment_id_idx on public.class_schedules(enrollment_id);

create table if not exists public.schedule_imports (
  user_id uuid primary key references public.users(id) on delete cascade,
  source text not null default 'jupiterweb',
  entries jsonb not null default '[]'::jsonb,
  imported_at timestamptz not null default now()
);

create index if not exists schedule_imports_imported_at_idx on public.schedule_imports(imported_at);

create table if not exists public.entities (
  id text primary key,
  name text not null,
  invite_code_hash text,
  invite_code_rotated_at timestamptz
);

create table if not exists public.entity_members (
  entity_id text not null references public.entities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (entity_id, user_id)
);

create index if not exists entity_members_user_id_idx on public.entity_members(user_id);

create table if not exists public.connections (
  requester_id uuid not null references public.users(id) on delete cascade,
  addressee_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create unique index if not exists connections_pair_idx
  on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists connections_addressee_status_idx on public.connections(addressee_id, status);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,
  source_id text,
  label text not null,
  awarded_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint user_badges_user_kind_source_key unique (user_id, kind, source_id)
);

create index if not exists user_badges_user_id_idx on public.user_badges(user_id);

create table if not exists public.user_courses (
  user_id uuid not null references public.users(id) on delete cascade,
  code text not null,
  title text not null,
  primary key (user_id, code)
);

create index if not exists user_courses_code_idx on public.user_courses(code);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists student_profiles_set_updated_at on public.student_profiles;
create trigger student_profiles_set_updated_at
before update on public.student_profiles
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.student_profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.class_schedules enable row level security;
alter table public.schedule_imports enable row level security;
alter table public.entities enable row level security;
alter table public.entity_members enable row level security;
alter table public.connections enable row level security;
alter table public.user_badges enable row level security;
alter table public.user_courses enable row level security;

insert into public.entities (id, name) values
  ('dasi', 'DASI'),
  ('sintese', 'Síntese Jr.'),
  ('petsi', 'PET-SI'),
  ('hype', 'Hype USP'),
  ('codelab', 'CodeLab Leste'),
  ('eachintheshell', 'Each in The Shell'),
  ('conway', 'Conway USP'),
  ('cossi', 'COSSI')
on conflict (id) do update set name = excluded.name;

-- Fase 1: foto, tecnologias, cargos e badges
alter table public.student_profiles add column if not exists avatar_path text;
alter table public.student_profiles add column if not exists technologies text[] not null default '{}';

alter table public.entity_members add column if not exists title text;
alter table public.entity_members drop constraint if exists entity_members_title_length_check;
alter table public.entity_members add constraint entity_members_title_length_check check (char_length(title) <= 40);

alter table public.user_badges add column if not exists icon text;
alter table public.user_badges add column if not exists color text;
alter table public.user_badges add column if not exists entity_id text references public.entities(id) on delete cascade;

create table if not exists public.badge_definitions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('admin_award', 'entity_award')),
  entity_id text references public.entities(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  description text check (char_length(description) <= 140),
  icon text not null,
  color text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint badge_definitions_entity_required_check check (kind <> 'entity_award' or entity_id is not null)
);

create index if not exists badge_definitions_entity_idx on public.badge_definitions(entity_id);

alter table public.badge_definitions enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- Fase 2: notificações, avisos e push
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('connection_request','connection_accepted','entity_joined','entity_role_changed','entity_removed','badge_awarded','announcement')),
  actor_id uuid references public.users(id) on delete set null,
  entity_id text references public.entities(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc, id desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id) where read_at is null;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.users(id) on delete set null,
  entity_id text references public.entities(id) on delete cascade,
  audience text not null check (audience in ('all','course','cohort','entity')),
  audience_value text,
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 500),
  link text,
  recipients int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists announcements_entity_created_idx on public.announcements(entity_id, created_at desc);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null default 'web' check (kind in ('web','fcm')),
  endpoint text not null unique,
  keys jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.notifications enable row level security;
alter table public.announcements enable row level security;
alter table public.push_subscriptions enable row level security;

-- Fase 3: carta e coleção
alter table public.student_profiles add column if not exists card jsonb not null default '{}'::jsonb;
alter table public.student_profiles add column if not exists card_public boolean not null default false;

create table if not exists public.card_collection (
  collector_id uuid not null references public.users(id) on delete cascade,
  collected_id uuid not null references public.users(id) on delete cascade,
  collected_at timestamptz not null default now(),
  primary key (collector_id, collected_id),
  check (collector_id <> collected_id)
);

create index if not exists card_collection_collector_idx on public.card_collection(collector_id, collected_at desc);

alter table public.card_collection enable row level security;

-- Calendário: eventos, denúncias, RSVP e feed
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  description text check (char_length(description) <= 1000),
  kind text not null check (kind in ('event','meeting','exam','assignment','deadline','holiday')),
  scope text not null check (scope in ('usp','campus','course','cohort','class','entity')),
  scope_value text,
  entity_id text references public.entities(id) on delete cascade,
  visibility text not null default 'public' check (visibility in ('public','members')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text check (char_length(location) <= 120),
  link text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','hidden')),
  pending_changes jsonb,
  source text not null default 'user' check (source in ('user','usp_import')),
  external_id text,
  created_by uuid references public.users(id) on delete set null,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (char_length(review_note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at),
  check (scope = 'usp' or scope_value is not null),
  check (visibility = 'public' or scope = 'entity')
);

create unique index if not exists events_external_id_key on public.events(source, external_id) where external_id is not null;
create index if not exists events_status_starts_idx on public.events(status, starts_at);
create index if not exists events_scope_idx on public.events(scope, scope_value, starts_at);
create index if not exists events_created_by_idx on public.events(created_by, created_at desc);
create index if not exists events_entity_idx on public.events(entity_id) where entity_id is not null;

create table if not exists public.event_reports (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists event_reports_event_idx on public.event_reports(event_id);

create table if not exists public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('going','interested')),
  remind boolean not null default false,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists event_rsvps_remind_idx on public.event_rsvps(event_id) where remind and reminded_at is null;

alter table public.student_profiles add column if not exists calendar_feed_token_hash text;
create unique index if not exists student_profiles_feed_token_key on public.student_profiles(calendar_feed_token_hash) where calendar_feed_token_hash is not null;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

alter table public.events enable row level security;
alter table public.event_reports enable row level security;
alter table public.event_rsvps enable row level security;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'connection_request','connection_accepted','entity_joined','entity_role_changed','entity_removed','badge_awarded','announcement',
  'event_submitted','event_approved','event_rejected','event_hidden','event_reminder'
));
