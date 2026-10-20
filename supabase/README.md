# Supabase

The application accesses these tables only through the server using the `service_role` key. Row level security is enabled on every table with no policies, which blocks direct access with the anon key.

The Google `sub` is stored as `users.google_sub`, which is the stable identifier used for the upsert. Email is kept as profile data and is not used as the primary identity.

## Fresh database

Run `schema.sql` once in Supabase Studio > SQL Editor. It already contains the final state, including the social tables and the seed of the 8 entities. It is safe to re-run, but it does not add the social columns to an old `student_profiles` table: for an existing database use the migration below.

## Existing database: social system migration

`migrations/2026-10-20-social.sql` adds the social system (profile fields, `entities`, `entity_members`, `connections`, `user_badges`, `user_courses`), seeds the entities and backfills data for current users (a `student_profiles` row per user, `handle` from the email local part, and `user_courses` from `schedule_imports`). It is idempotent: running it twice is safe. It runs in a single transaction, so a failure leaves the database unchanged.

Apply it with either option:

1. SQL editor: open Supabase Studio > SQL Editor, paste the whole content of `migrations/2026-10-20-social.sql` and run it.
2. CLI (psql, using the connection string from Project Settings > Database):

   ```bash
   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/2026-10-20-social.sql
   ```

   With the Supabase CLI instead, copy the file to `supabase/migrations/<timestamp>_social.sql` and run `supabase db push`.

Quick check afterwards:

```sql
select count(*) from public.entities;                                  -- 8
select count(*) from public.student_profiles where handle is null;     -- 0
```

Invite codes (`entities.invite_code_hash`) start empty; an entity admin or superadmin generates the first code through the app.

## Fase 1 (foto, tecnologias, cargos e badges)

Rodar `schema.sql` de novo no SQL Editor aplica a Fase 1: as colunas novas usam `add column if not exists`, a tabela `badge_definitions` é criada e o bucket `avatars` (público, até 2 MB, webp/png/jpeg) é criado pelo próprio SQL.

## Fase 2 (notificações, avisos e push)

Rodar `schema.sql` de novo no SQL Editor aplica a Fase 2: as tabelas `notifications`, `announcements` e `push_subscriptions` são criadas com `create table if not exists`, com RLS habilitado e sem políticas. Para o push no navegador (Tarefa 6) é preciso configurar as variáveis VAPID no servidor.

## Fase 3 (carta e coleção)

Rodar `schema.sql` de novo no SQL Editor aplica a Fase 3: as colunas `card` e `card_public` em `student_profiles` usam `add column if not exists`, e a tabela `card_collection` é criada com `create table if not exists`, com RLS habilitado e sem políticas. As variáveis `VITE_PUBLIC_APP_URL` (front) e `PUBLIC_APP_URL` (servidor) são opcionais: definem o domínio usado no QR e nos links da carta; sem elas, vale a origem atual (`window.location.origin` no front e `frontendUrl` no servidor).
