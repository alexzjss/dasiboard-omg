-- Migracao: sistema social (Comunidade, perfis, conexoes e entidades)
-- Plano: docs/plans/2026-10-20-sistema-social.md, secao 1.
-- Idempotente: pode ser executada mais de uma vez sem erro nem duplicacao.
-- Pressupoe o schema.sql anterior (users, student_profiles, schedule_imports, set_updated_at).

begin;

-- ---------------------------------------------------------------------------
-- 1. Perfil social (estende student_profiles)
-- ---------------------------------------------------------------------------
-- Colunas adicionadas sem constraints inline; as constraints sao criadas
-- abaixo, com nomes fixos e checagem em pg_constraint.
alter table public.student_profiles add column if not exists handle text;
alter table public.student_profiles add column if not exists bio text;
alter table public.student_profiles add column if not exists entry_year smallint;
alter table public.student_profiles add column if not exists links jsonb not null default '{}'::jsonb; -- { github, linkedin, instagram }
alter table public.student_profiles add column if not exists show_courses text not null default 'all';
alter table public.student_profiles add column if not exists show_connections text not null default 'all';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.student_profiles'::regclass
      and conname = 'student_profiles_bio_length_check'
  ) then
    alter table public.student_profiles
      add constraint student_profiles_bio_length_check
      check (char_length(bio) <= 280);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.student_profiles'::regclass
      and conname = 'student_profiles_show_courses_check'
  ) then
    alter table public.student_profiles
      add constraint student_profiles_show_courses_check
      check (show_courses in ('all', 'connections', 'none'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.student_profiles'::regclass
      and conname = 'student_profiles_show_connections_check'
  ) then
    alter table public.student_profiles
      add constraint student_profiles_show_connections_check
      check (show_connections in ('all', 'connections', 'none'));
  end if;
end
$$;

-- Handle unico (varios NULL sao permitidos ate o backfill/primeiro login).
create unique index if not exists student_profiles_handle_key
  on public.student_profiles (handle);

-- ---------------------------------------------------------------------------
-- 2. Entidades e membros
-- ---------------------------------------------------------------------------
create table if not exists public.entities (
  id text primary key,                -- mesmos ids de src/features/entidades/data.ts
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

create index if not exists entity_members_user_id_idx
  on public.entity_members (user_id);

-- ---------------------------------------------------------------------------
-- 3. Conexoes
-- ---------------------------------------------------------------------------
create table if not exists public.connections (
  requester_id uuid not null references public.users(id) on delete cascade,
  addressee_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- Impede pedido duplicado em sentido contrario.
create unique index if not exists connections_pair_idx
  on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists connections_addressee_status_idx
  on public.connections (addressee_id, status);

-- ---------------------------------------------------------------------------
-- 4. Badges
-- ---------------------------------------------------------------------------
create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,                 -- 'entity_member' agora; outros depois
  source_id text,                     -- id da entidade, para kind = 'entity_member'
  label text not null,
  awarded_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint user_badges_user_kind_source_key unique (user_id, kind, source_id)
);

create index if not exists user_badges_user_id_idx
  on public.user_badges (user_id);

-- ---------------------------------------------------------------------------
-- 5. Materias normalizadas (colegas de turma e filtros)
-- ---------------------------------------------------------------------------
create table if not exists public.user_courses (
  user_id uuid not null references public.users(id) on delete cascade,
  code text not null,
  title text not null,
  primary key (user_id, code)
);

create index if not exists user_courses_code_idx
  on public.user_courses (code);

-- ---------------------------------------------------------------------------
-- 6. RLS: ligado e sem politicas (o servidor usa a service role)
-- ---------------------------------------------------------------------------
alter table public.entities enable row level security;
alter table public.entity_members enable row level security;
alter table public.connections enable row level security;
alter table public.user_badges enable row level security;
alter table public.user_courses enable row level security;

-- ---------------------------------------------------------------------------
-- 7. Seed das 8 entidades (ids e nomes de src/features/entidades/data.ts)
-- ---------------------------------------------------------------------------
-- Em reexecucoes so o nome e sincronizado; o hash do codigo de convite nunca e tocado.
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

-- ---------------------------------------------------------------------------
-- 8. Backfill
-- ---------------------------------------------------------------------------
-- 8a. Um student_profiles para cada usuario sem perfil.
insert into public.student_profiles (user_id)
select u.id
from public.users u
where not exists (select 1 from public.student_profiles sp where sp.user_id = u.id)
on conflict (user_id) do nothing;

-- 8b. handle = lower(parte do e-mail antes do @), so para perfis sem handle.
-- Caracteres fora de [a-z0-9._-] viram '-' (o handle vai na URL). Em colisao
-- (com handle existente ou gerado nesta mesma execucao) acrescenta sufixo
-- numerico: base2, base3, ... Processa em ordem de criacao do usuario.
do $$
declare
  r record;
  base text;
  candidate text;
  n integer;
begin
  for r in
    select sp.user_id, u.email
    from public.student_profiles sp
    join public.users u on u.id = sp.user_id
    where sp.handle is null
    order by u.created_at, u.id
  loop
    base := regexp_replace(lower(split_part(r.email, '@', 1)), '[^a-z0-9._-]', '-', 'g');
    base := left(base, 60);
    if base = '' then
      base := 'aluno';
    end if;

    candidate := base;
    n := 1;
    while exists (select 1 from public.student_profiles where handle = candidate) loop
      n := n + 1;
      candidate := base || n::text;
    end loop;

    update public.student_profiles set handle = candidate where user_id = r.user_id;
  end loop;
end
$$;

-- 8c. user_courses a partir da ultima importacao do Jupiter (so codigo e nome;
-- horarios e salas nunca saem de schedule_imports). Distinto por (usuario, codigo),
-- ignorando codigo vazio. Nao sobrescreve linhas ja existentes.
insert into public.user_courses (user_id, code, title)
select distinct on (si.user_id, btrim(e.value ->> 'code'))
  si.user_id,
  btrim(e.value ->> 'code'),
  coalesce(nullif(btrim(e.value ->> 'title'), ''), btrim(e.value ->> 'code'))
from public.schedule_imports si
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(si.entries) = 'array' then si.entries else '[]'::jsonb end
) as e(value)
where jsonb_typeof(e.value) = 'object'
  and coalesce(btrim(e.value ->> 'code'), '') <> ''
order by si.user_id, btrim(e.value ->> 'code')
on conflict (user_id, code) do nothing;

commit;
