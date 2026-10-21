# Calendário com eventos submetidos — Planejamento

> **Status (2026-10-21):** Etapa A concluída; B1 (só "Vou"/"Tenho interesse", sem "Lembrar") e B3 (feed `.ics`) concluídas. **Pendentes para depois:** botão "Lembrar" + cron de lembretes (B2), importação do calendário USP (B4) e a revisão final (C1).
>
> **Modelos:** planejamento e revisão final com **Opus**; tarefas marcadas com **Sonnet** (lógica, rotas, telas) ou **Haiku** (schema, textos, ligações simples).

**Goal:** Uma página `/calendario` que junta a grade do Júpiter com eventos da USP, do campus, do curso, da turma, das matérias e das entidades. Qualquer aluno pode propor um evento para um escopo do qual faz parte. Eventos de matéria entram direto e são controlados por denúncias dos colegas; os demais passam por aprovação de um moderador.

**Architecture:** Uma tabela `events` com `scope` + `scope_value` (a quem o evento pertence) e `status`. Funções puras concentram as regras — `canSubmit`, `canModerate`, `canView`, `canReport` — e as rotas só chamam essas funções; o front nunca decide permissão. Leitura do calendário filtra por intervalo de datas e pelos escopos visíveis ao aluno. Notificações e push reaproveitam `notify(...)` da Fase 2. Lembretes usam um cron diário da Vercel (o único cron do projeto).

**Tech Stack:** Express 5, Supabase (`server/social/db.ts` + `server/test/fakeSocialDb.ts`), React. Sem biblioteca de calendário nova (grade do mês feita à mão, como o `WeekMap`). Feed `.ics` gerado à mão (formato texto simples).

## Decisões

| # | Tema | Decisão |
|---|---|---|
| P1 | Escopos | Seis: `usp`, `campus`, `course`, `cohort` (ano de ingresso), `class` (matéria), `entity` |
| P2 | USP / campus | Qualquer aluno propõe; só superadmin aprova |
| P3 | Matéria | **Sem aprovação.** Entra publicado; **3 denúncias** de colegas da matéria escondem o evento e o mandam para a fila do superadmin, que restaura ou remove |
| P4 | Curso / turma | Só superadmin aprova |
| P5 | Visibilidade de matéria | Por padrão só quem cursa; filtro "outras matérias" (desligado) mostra as demais |
| P6 | Eventos internos | Já na v1: `visibility: 'public' \| 'members'`, só para escopo `entity` |
| P7 | Editar aprovado | Descrição, local e link mudam direto. Título, data ou tipo vão para `pending_changes` e precisam de aprovação; a versão antiga continua visível até lá. Escopo nunca muda |
| P8 | Ajuste do moderador | Pode editar antes de aprovar; autor recebe "aprovado com ajustes" |
| P9 | Expiração | Pendente com data no passado some da fila (filtro na consulta, sem cron) |
| P10 | Limite | 10 submissões por aluno por dia, contadas no banco; moderadores sem limite no próprio escopo |
| P11 | Avisos | Moderadores recebem central **+ push**; autor recebe push ao ser aprovado, recusado ou ter o evento escondido |
| P12 | Tipos | `event`, `meeting`, `exam`, `assignment`, `deadline`, `holiday` |
| P13 | Recorrência | v2 |
| P14 | Imagem | Só link na v1 |
| P15 | Calendário USP | Importação automática acionada por **botão do superadmin**; os itens importados caem na fila para revisão e publicação |
| P16 | Lembretes e "Vou" | Ambos na v1: botão "Lembrar" (push às 20h da véspera via cron diário) e "Vou / Tenho interesse" só com contagem |
| P17 | Feed `.ics` | Na v1: link secreto pessoal para assinar no Google Calendar |
| P18 | Navegação | PC: 5º item no menu lateral. Celular: Calendário **substitui Disciplinas** na barra inferior (Disciplinas continua acessível pelo menu) |
| P19 | Aulas do Júpiter | Aparecem em cinza, com filtro; provas usam a cor da matéria |
| P20 | Prova pendente | Não se aplica mais: eventos de matéria não ficam pendentes |

## O que já existe e será reaproveitado

| Peça | Onde | Uso no calendário |
|---|---|---|
| Admin geral | `SUPERADMIN_EMAILS` → `viewer.isSuperadmin` (`server/social/guards.ts`) | Modera USP, campus, curso, turma; revisa denúncias e importação |
| Admin de entidade | `entity_members.role = 'admin'`, `requireEntityAdmin` | Modera eventos da própria entidade |
| Membros de entidade | `entity_members` (`left_at is null`) | Propor evento da entidade; ver eventos `members` |
| Matérias do aluno | `user_courses (user_id, code, title)` | Propor, ver e denunciar eventos da matéria |
| Curso / campus / ingresso | `student_profiles.course`, `campus`, `entry_year` | Escopos `course`, `campus`, `cohort` |
| Notificações + push | `server/social/notify.ts`, `notificationText.ts`, `push.ts` | Avisos de moderação e lembretes |
| Ícone `calendar` | `src/components/Icon.tsx` | Item novo na navegação |

## Modelo de dados

```sql
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  description text check (char_length(description) <= 1000),
  kind text not null check (kind in ('event','meeting','exam','assignment','deadline','holiday')),
  scope text not null check (scope in ('usp','campus','course','cohort','class','entity')),
  scope_value text,                 -- campus | código do curso | ano | código da matéria | entity_id; null só em 'usp'
  entity_id text references public.entities(id) on delete cascade, -- = scope_value quando scope = 'entity'
  visibility text not null default 'public' check (visibility in ('public','members')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text check (char_length(location) <= 120),
  link text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','hidden')),
  pending_changes jsonb,            -- edição de título/data/tipo aguardando aprovação (P7)
  source text not null default 'user' check (source in ('user','usp_import')),
  external_id text,                 -- id estável do item importado (idempotência da importação)
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
-- + índices: (status, starts_at), (scope, scope_value, starts_at), (created_by, created_at desc), (entity_id)

create table if not exists public.event_reports (   -- P3
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.event_rsvps (     -- P16
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('going','interested')),
  remind boolean not null default false,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.student_profiles add column if not exists calendar_feed_token_hash text; -- P17 (só o hash é salvo)
```

Novos tipos em `notifications.type`: `event_submitted`, `event_approved`, `event_rejected`, `event_hidden`, `event_reminder`.

### Regras de permissão

| Escopo | `scope_value` | Pode propor | Entra como | Modera | Vê quando publicado |
|---|---|---|---|---|---|
| `usp` | — | qualquer aluno | `pending` | superadmin | todos |
| `campus` | ex.: `EACH` | `campus` do perfil igual | `pending` | superadmin | todos |
| `course` | código do curso | curso do perfil igual | `pending` | superadmin | todos |
| `cohort` | ano de ingresso | `entry_year` igual | `pending` | superadmin | todos |
| `class` | código da matéria | tem a matéria em `user_courses` | **`approved`** | superadmin (só denúncias) | quem cursa; outros via filtro |
| `entity` | `entity_id` | membro ativo | `pending` | admin da entidade ou superadmin | todos, ou só membros se `visibility = 'members'` |

- Quem modera o escopo e propõe nele tem o evento aprovado na hora.
- **Denúncia (só `class`):** quem cursa a matéria e não é o autor pode denunciar uma vez. Na 3ª denúncia o evento vira `hidden` (update condicional, uma única vez) e o superadmin recebe a notificação. Restaurar apaga as denúncias e volta para `approved`; remover vira `cancelled`.
- **Edição (P7):** o autor muda descrição, local e link direto. Título, data e tipo vão para `pending_changes`, exceto em `class` (sem moderação), onde a mudança vale na hora.

### Fluxo de estados

```
                 ┌──────────── class ────────────┐
proposto ────────┤                               ▼
                 └──► pending ──aprovar/ajustar──► approved ──3 denúncias──► hidden ──restaurar──► approved
                         │                            │                         └──remover──► cancelled
                         └──recusar──► rejected       └──cancelar (autor ou moderador)──► cancelled
```

## Rotas

| Método | Rota | Quem | O que faz |
|---|---|---|---|
| `GET` | `/api/events?from=&to=&otherClasses=` | logado | Publicados visíveis ao aluno no intervalo (máx. 100 dias) + os pendentes dele; inclui a contagem de "Vou" e o RSVP do aluno |
| `GET` | `/api/events/scopes` | logado | Escopos em que o aluno pode propor |
| `POST` | `/api/events` | logado | Propõe; `canSubmit`; auto-aprova se `class` ou `canModerate`; limite de 10/dia |
| `PATCH` | `/api/events/:id` | autor ou moderador | Edita seguindo P7/P8 |
| `POST` | `/api/events/:id/cancel` | autor ou moderador | Cancela |
| `GET` | `/api/events/mine` | logado | Minhas submissões com status e motivo |
| `GET` | `/api/events/review` | moderador | Fila: pendentes, edições pendentes, escondidos e importados que **este** aluno pode moderar |
| `POST` | `/api/events/:id/review` | moderador do escopo | `{ decision: 'approve' \| 'reject' \| 'restore' \| 'remove', note?, changes? }` |
| `POST` | `/api/events/:id/report` | colega da matéria | Denuncia (uma vez por aluno) |
| `PUT` | `/api/events/:id/rsvp` | quem vê o evento | `{ status: 'going' \| 'interested' \| null, remind: boolean }` |
| `POST` | `/api/admin/usp-calendar/sync` | superadmin | Busca o calendário oficial, cria/atualiza itens `usp_import` como `pending` (idempotente por `external_id`) e devolve o resumo |
| `POST` | `/api/calendar-feed/token` | logado | Gera ou troca o link secreto (mostrado uma única vez) |
| `GET` | `/api/calendar-feed/:token.ics` | público com token | Feed `.ics` com aulas + eventos visíveis ao dono do token |
| `GET` | `/api/cron/event-reminders` | Vercel Cron (`CRON_SECRET`) | Uma vez por dia: push para quem marcou "Lembrar" em eventos do dia seguinte; marca `reminded_at` |

## Telas

1. **`/calendario`**: visões **Mês** (grade) e **Agenda** (lista). Aulas do Júpiter em cinza; eventos coloridos por tipo; provas e entregas na cor da matéria. Filtros: USP/campus, curso/turma, minhas matérias, outras matérias (desligado), entidades, aulas.
2. **Detalhe do evento** (painel): dados, quem propôs, contagem de "Vou"/"Interesse", botões "Vou", "Tenho interesse" e "Lembrar", editar, cancelar e denunciar, conforme a permissão de cada um.
3. **Propor evento**: escopo (só os que `/scopes` devolve), tipo, data/hora ou dia inteiro, local, link, descrição e, em entidade, "só membros". Aviso "vai para aprovação de X" ou "publica na hora".
4. **Minhas submissões**: aba com status, motivo de recusa e edição pendente.
5. **Moderação**: aba "Para revisar" com contador (só para quem modera algo): aprovar, ajustar e aprovar, recusar com motivo, restaurar e remover. Atalhos no Perfil (seção admin) e em `EntidadeDetail`. Para superadmin, botão "Sincronizar calendário USP".
6. **Assinar no Google Calendar**: no Perfil ou no calendário: gerar link, copiar e trocar.
7. **Navegação**: menu lateral ganha "Calendário"; no celular a barra inferior troca Disciplinas por Calendário.
8. **Home**: card "Próximos eventos" (3–5 itens) abaixo do mapa da semana.

## Tarefas

> Cada tarefa termina com `npm test && npm run lint && npm run build` verdes e um commit em português com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Mesmas regras globais das fases anteriores: rotas não usam `getClient()`, tudo passa por `db.ts` espelhado no fake, SQL idempotente no fim de `schema.sql`, falha ao notificar nunca derruba a ação principal.

### Etapa A — núcleo

| # | Tarefa | Modelo | Arquivos principais |
|---|---|---|---|
| A1 | Schema: `events`, `event_reports`, `event_rsvps`, coluna do token do feed, índices, RLS, tipos novos em `notifications` | **Haiku** | `supabase/schema.sql`, `supabase/README.md` |
| A2 | Regras puras `canSubmit`/`canModerate`/`canView`/`canReport`/`initialStatus`/`splitEdit` (P7) + validação do payload + testes da tabela de permissões | **Sonnet** | `server/events/rules.ts`, `server/events/validation.ts`, testes |
| A3 | Camada de dados + fake: criar, listar no intervalo, fila de revisão, decidir (condicional em `status`), editar, cancelar, denunciar com contagem atômica, contar submissões do dia, `findModeratorIds` | **Sonnet** | `server/social/db.ts`, `server/test/fakeSocialDb.ts` |
| A4 | Rotas de eventos, revisão e denúncia + testes (incluindo os itens do Review Focus) | **Sonnet** | `server/routes/events.ts`, `server/routes/events.test.ts`, `server/index.ts` |
| A5 | Textos das 5 notificações novas + ligação com `notify` (push para moderadores) | **Haiku** | `server/social/notificationText.ts` (+ teste), `server/social/notify.ts` |
| A6 | Cliente da API e hooks (`useEvents(range)`, `useEventScopes`, `useReviewQueue`, `useMyEvents`) | **Haiku** | `src/lib/eventsApi.ts`, `src/features/calendario/hooks/*` |
| A7 | Página `/calendario`: mês, agenda, filtros, aulas do Júpiter, rota e navegação (troca no celular) | **Sonnet** | `src/features/calendario/*`, `src/app/routes.tsx`, `src/app/navItems.ts`, `BottomNav.tsx`, `src/styles/calendario.css` |
| A8 | Propor evento + detalhe + editar/cancelar/denunciar + Minhas submissões | **Sonnet** | `EventForm.tsx`, `EventDetail.tsx`, `MyEvents.tsx` |
| A9 | Moderação: fila, ajustar e aprovar, recusar, restaurar/remover, contador, atalhos no Perfil e na entidade | **Sonnet** | `ReviewQueue.tsx`, `AdminSection.tsx`, `EntidadeDetail.tsx` |
| A10 | Card "Próximos eventos" na Home | **Haiku** | `src/features/home/UpcomingEvents.tsx`, `HomePage.tsx` |

### Etapa B — extras da v1

| # | Tarefa | Modelo | Arquivos principais |
|---|---|---|---|
| B1 | "Vou / Interesse / Lembrar": rota `rsvp`, contagens em `GET /api/events`, botões no detalhe | **Sonnet** | `events.ts`, `db.ts`, `EventDetail.tsx` |
| B2 | Cron de lembretes: rota protegida por `CRON_SECRET`, `vercel.json` (`crons`), push com prazo de 6 s, idempotente por `reminded_at` | **Sonnet** | `server/routes/cron.ts`, `vercel.json`, testes |
| B3 | Feed `.ics`: geração do texto (escape, `DTSTART` com fuso/dia inteiro, aulas semanais com `RRULE`), token com hash, tela de assinar | **Sonnet** | `server/events/ics.ts` (+ teste), `server/routes/calendarFeed.ts`, `src/features/calendario/FeedLink.tsx` |
| B4 | Importação do calendário USP: parser da fonte oficial (com fixture HTML/PDF salva nos testes), `external_id` estável, rota de sincronização e botão do superadmin | **Sonnet** | `server/events/uspCalendar.ts` (+ fixture), `server/routes/admin.ts`, `AdminSection.tsx` |
| C1 | Revisão final: permissões, corridas, vazamento de dados no feed, UX no celular | **Opus** | — |

**Dependências:** A1 → A2 → A3 → A4 → A5. A6 depende de A4. A7 vem antes de A8, A9 e A10. B1–B4 dependem de A4. B1 depende de A8. B2 depende de B1. B3 e B4 são independentes entre si. A2 e A6 podem andar em paralelo se as interfaces forem fixadas antes.

## Review Focus

1. **Propor fora do próprio escopo.** Aluno sem `ACH2001` envia `scope: 'class', scopeValue: 'ACH2001'` → 403. O mesmo para entidade de que saiu (`left_at` preenchido).
2. **Admin de uma entidade moderando outra.** Esperado: 403, e o evento nem aparece na fila dele.
3. **Duas decisões ao mesmo tempo.** Update condicional `where status = 'pending'`; a segunda recebe 409 e só uma notificação sai.
4. **Denúncias.** O mesmo aluno denunciando duas vezes conta uma vez; o autor não denuncia o próprio evento; quem não cursa a matéria recebe 403; a 3ª denúncia esconde o evento **uma vez só**, mesmo com denúncias simultâneas.
5. **Editar para burlar a moderação.** Título, data ou tipo editados num escopo moderado não aparecem antes da aprovação; tentar trocar o escopo → 400.
6. **Vazamento.** `GET /api/events` e o feed `.ics` nunca trazem pendentes, recusados ou escondidos de outras pessoas, eventos `members` para quem não é membro, nem matérias que a pessoa não cursa (a menos que tenha ligado o filtro "outras matérias"). Token do feed errado → 404, sem dizer se o usuário existe.
7. **Spam.** A 11ª submissão do dia → 429, contada no banco.
8. **Cron.** Sem `CRON_SECRET` → 401. Rodar duas vezes no mesmo dia não manda dois lembretes.
9. **Fuso horário.** Evento de dia inteiro em 21/10 aparece em 21/10 em `America/Sao_Paulo`, no app e no `.ics`.
10. **Importação.** Rodar a sincronização duas vezes não duplica nada; um item que mudou na fonte atualiza o pendente em vez de criar outro.

---

## Decisões finais

| # | Tema | Decisão |
|---|---|---|
| Q1 | Fonte do calendário USP | Calendário escolar da Pró-Reitoria de Graduação + calendário da EACH (se legível). Confirmar o formato das páginas antes de começar a B4 |
| Q2 | Horário do lembrete | 20h de São Paulo (23h UTC) na véspera, para os eventos do dia seguinte |
| Q3 | "Vou" | Só o número, para todos (incluindo autor e moderadores); a API nunca devolve a lista de quem vai |
