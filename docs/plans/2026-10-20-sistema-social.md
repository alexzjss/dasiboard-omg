# Plano: sistema social (Comunidade, perfis, conexões e entidades)

**Data:** 2026-10-20
**Planejamento:** Opus · **Implementação:** Sonnet (tarefas com lógica, segurança ou UI nova) e Haiku (tarefas mecânicas e bem delimitadas). Cada tarefa abaixo traz o modelo indicado.

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Conexão | Pedido + aceite (mútua). Lista de pedidos pendentes. |
| Privacidade | Só usuários logados com @usp.br veem perfis. Cada aluno escolhe, por item (matérias, conexões), entre **todos**, **só conexões** ou **ninguém**. Nome, foto, curso e entidades são sempre visíveis para logados. |
| Keys de entidade | Código de convite rotativo por entidade (ex.: `DASI-7KQ2`). Quem digita entra na hora como membro. |
| Administração | Superadmin (você, por e-mail em variável de ambiente) promove membros a admin de uma entidade. Admin da entidade troca o código e remove membros. |
| Badges | Tabela genérica `user_badges`. Ser membro de entidade é o primeiro tipo de badge. |
| Página social | "Comunidade" em `/comunidade`, com feed no topo e abas **Alunos** e **Docentes**. Aluno abre em `/comunidade/:handle`. |
| Avisos | Contador no item Comunidade da nav e no perfil, mais a lista de pedidos. Sem e-mail. |
| Extras | Colegas de turma, bio/foto/links, busca e filtros, membros na página da entidade. |

## Decisões minhas (pode contestar)

- **Handle do aluno** = parte do e-mail antes do `@` (`alex.santana@usp.br` → `/comunidade/alex.santana`). É único, já existe e não precisa de escolha.
- **Foto**: a do Google (já salva em `users.picture`). Upload próprio fica para depois (precisaria de storage).
- **Curso e ano de ingresso**: o aluno preenche no próprio perfil (tabela `student_profiles`, que já existe). O curso não vem do Jupiter de forma confiável.
- **Matérias do perfil** = as da última importação do Jupiter (`schedule_imports.entries`), só código e nome; horários e salas nunca aparecem para outros.
- **Feed** é calculado a partir de eventos reais (sem tabela de posts): novos membros de entidades, conexões aceitas por suas conexões, colegas de turma que entraram no daSIboard. Só eventos que a privacidade de cada um permite.
- **Superadmin** definido por `SUPERADMIN_EMAILS` (lista separada por vírgula) no ambiente do servidor, não no banco.
- **Rota antiga** `/docentes` redireciona para `/comunidade?aba=docentes`.
- **Código de convite**: guardado só como hash (SHA-256 com pepper do servidor); o admin vê o código em texto apenas no momento em que gera um novo. Tentativas erradas contam no rate limit.
- **Sair de uma entidade**: o próprio aluno pode sair; o badge é marcado como encerrado (não apagado), o que já prepara o histórico de badges.
- **Banco**: o servidor continua usando a service role do Supabase, e toda regra de acesso fica no Express (RLS segue ligado e sem políticas, como hoje, bloqueando acesso direto).

---

## 1. Modelo de dados (`supabase/schema.sql` + migração)

```sql
-- perfil social (estende student_profiles, que já existe)
alter table student_profiles
  add column if not exists handle text unique,
  add column if not exists bio text check (char_length(bio) <= 280),
  add column if not exists entry_year smallint,
  add column if not exists links jsonb not null default '{}'::jsonb,        -- { github, linkedin, instagram }
  add column if not exists show_courses text not null default 'all'
    check (show_courses in ('all','connections','none')),
  add column if not exists show_connections text not null default 'all'
    check (show_connections in ('all','connections','none'));

create table if not exists entities (
  id text primary key,                -- 'dasi', 'sintese', ... (mesmos ids de src/features/entidades/data.ts)
  name text not null,
  invite_code_hash text,
  invite_code_rotated_at timestamptz
);

create table if not exists entity_members (
  entity_id text references entities(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','admin')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (entity_id, user_id)
);

create table if not exists connections (
  requester_id uuid references users(id) on delete cascade,
  addressee_id uuid references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
-- impede pedido duplicado em sentido contrário
create unique index if not exists connections_pair_idx
  on connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  kind text not null,                 -- 'entity_member' agora; outros depois
  source_id text,                     -- id da entidade, para kind = 'entity_member'
  label text not null,
  awarded_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, kind, source_id)
);

-- matérias normalizadas para "colegas de turma" e filtros
create table if not exists user_courses (
  user_id uuid references users(id) on delete cascade,
  code text not null,
  title text not null,
  primary key (user_id, code)
);
create index if not exists user_courses_code_idx on user_courses(code);
```

Também: índices em `connections(addressee_id, status)` e `entity_members(user_id)`, RLS ligado nas tabelas novas, seed das 8 entidades, e backfill de `handle` e `user_courses` para quem já existe.

---

## 2. API (Express, `server/`)

Dividir `server/index.ts` em `server/routes/{auth,schedule,social,entities,admin}.ts` antes de adicionar rotas. Todas exigem sessão; escrita passa por `isAllowedOrigin`.

| Método e rota | O que faz |
|---|---|
| `GET /api/me/profile` | Perfil próprio completo, incluindo privacidade, entidades, pedidos pendentes e `isSuperadmin`. |
| `PATCH /api/me/profile` | Atualiza bio, curso, ano, links, privacidade. Valida tamanhos e URLs (só domínios github.com, linkedin.com, instagram.com). |
| `GET /api/people?q=&curso=&ano=&entidade=&materia=&cursor=` | Lista paginada de alunos (20 por página) com indicador de conexão e nº de matérias em comum. |
| `GET /api/people/:handle` | Perfil público de outro aluno, já filtrado pela privacidade e pela relação com quem pede. Inclui matérias em comum. |
| `POST /api/connections/:handle` | Envia pedido. Se já existe pedido no sentido contrário, aceita direto. |
| `POST /api/connections/:handle/accept` · `DELETE /api/connections/:handle` | Aceitar; recusar, cancelar ou desfazer. |
| `GET /api/connections?status=pending\|accepted` | Pedidos recebidos e conexões. |
| `GET /api/notifications/count` | Nº de pedidos pendentes (para o contador). |
| `GET /api/feed?cursor=` | Feed da Comunidade, respeitando privacidade. |
| `POST /api/entities/join` `{ code }` | Entra na entidade cujo código bate; cria `entity_members` e `user_badges`. Rate limit 5/10 min. |
| `DELETE /api/entities/:id/membership` | Sair da entidade (marca `left_at` e `revoked_at`). |
| `GET /api/entities/:id/members` | Membros ativos (para a página da entidade). |
| `POST /api/entities/:id/invite-code` | Admin da entidade ou superadmin gera novo código; devolve em texto uma única vez. |
| `DELETE /api/entities/:id/members/:handle` | Admin remove membro. |
| `PUT /api/admin/entities/:id/admins/:handle` | Superadmin promove/rebaixa admin. |

Ao salvar a grade (`saveSchedule`), atualizar `user_courses` na mesma operação. Ao apagar a grade, limpar `user_courses`.

---

## 3. Front-end

- **Nav**: item "Docentes" vira **Comunidade** (`/comunidade`, ícone `people`), com contador de pedidos pendentes (bolinha com número) também na sidebar e no botão de perfil da bottom nav. `/docentes` redireciona.
- **`/comunidade`**:
  - Topo: **feed** compacto (até 5 itens, "ver mais").
  - Abas **Alunos** | **Docentes** (aba na URL: `?aba=`). A aba Docentes é a `DocentesPage` atual, sem mudanças de comportamento.
  - Alunos: busca por nome com debounce, filtros (curso, ano, entidade, matéria em comum), grade de cartões (foto, nome, curso/ano, entidades como mini-badges, "N matérias em comum", botão Conectar/Pendente/Conectado).
- **`/comunidade/:handle`**: perfil de outro aluno: cabeçalho (foto, nome, handle, curso, ano, bio, links), botão de conexão, badges de entidades (link para a entidade), matérias (destacando as em comum), conexões (contagem + lista se permitido), "colegas de turma em comum".
- **`/perfil`** (próprio), em seções:
  1. Cabeçalho editável (bio, curso, ano, links) com prévia de como os outros veem.
  2. **Pedidos de conexão** pendentes (aceitar/recusar).
  3. **Minhas matérias** (do Jupiter, com link para importar se vazio).
  4. **Minhas entidades**: badges das 8 entidades (participa = colorido, não participa = apagado) e campo **"Tenho um código"**. Botão sair.
  5. **Privacidade**: controles para matérias e conexões.
  6. **Administrar** (só para admin de entidade/superadmin): gerar novo código, ver e remover membros, promover admins (superadmin).
  7. Aparência e sair (já existem).
- **`/entidades/:slug`**: nova seção "Quem está no daSIboard" com avatares dos membros (linkando ao perfil).
- **Disciplinas**: no detalhe de uma disciplina (lista e constelação), "N colegas fazem esta matéria", abrindo a lista filtrada em `/comunidade?materia=ACH2023`.
- Tudo com os tokens e a identidade da Fase 5; funciona em 375px e desktop; estados vazios e de carregamento em todas as listas.

---

## 4. Tarefas, ordem e modelo

| # | Tarefa | Modelo | Depende de |
|---|---|---|---|
| T1 | Migração SQL (`supabase/migrations/2026-10-20-social.sql`), atualizar `schema.sql`, seed das 8 entidades, backfill de `handle` e `user_courses`, instruções no `supabase/README.md` | **Sonnet** | — |
| T2 | Dividir `server/index.ts` em `server/routes/*` e `server/lib/{session,rateLimit,errors}.ts`, sem mudar comportamento | **Haiku** | — |
| T3 | Camada de dados social em `server/social/db.ts` (consultas para perfis, conexões, entidades, badges, feed) + regras de privacidade em uma função única `canSee(viewer, owner, item)` + testes unitários das regras | **Sonnet** | T1, T2 |
| T4 | Rotas da API da seção 2, validação de entrada, rate limits, hash do código de convite, `SUPERADMIN_EMAILS`, sincronizar `user_courses` no `saveSchedule` + testes de rota (supertest com Supabase mockado) | **Sonnet** | T3 |
| T5 | Cliente da API tipado `src/lib/socialApi.ts` + hooks (`useProfile`, `usePeople`, `useConnections`, `useNotificationCount` com revalidação no foco) | **Haiku** | T4 (contratos) |
| T6 | Nav: renomear para Comunidade, rota `/comunidade`, redirecionar `/docentes`, contador nos 3 lugares | **Haiku** | T5 |
| T7 | Página `/comunidade`: feed, abas, lista de alunos com busca/filtros/paginação | **Sonnet** | T5, T6 |
| T8 | Página `/comunidade/:handle` (perfil de outro aluno) | **Sonnet** | T5 |
| T9 | `/perfil` novo: edição, pedidos, matérias, entidades com código, privacidade | **Sonnet** | T5 |
| T10 | Seção Administrar no perfil (código, membros, promoção) | **Sonnet** | T9 |
| T11 | Membros em `/entidades/:slug` e "colegas fazem esta matéria" em Disciplinas | **Haiku** | T5 |
| T12 | Revisão final: segurança (IDOR, vazamento por privacidade, enumeração de códigos), a11y e responsivo em 375/768/1280 | **Opus** (revisão) | todas |

Paralelismo possível: T1 e T2 juntas; depois T3 → T4; T5 e T6 em sequência; T7, T8 e T11 podem rodar em paralelo (arquivos diferentes); T9 → T10.

Cada tarefa termina com `npx tsc -b`, `npx tsc -p tsconfig.server.json --noEmit`, `npx vitest run`, `npm run lint` e `npm run build` verdes; tarefas de UI também conferem `/dev/*` no navegador em 375px e 1280px, nos dois temas.

---

## 5. Desenvolvimento local

O modo `/dev/home` não tem sessão real, então as telas sociais ficariam vazias. Adicionar em T4 um **modo de dados de demonstração** só em `NODE_ENV !== 'production'`: `DEV_FAKE_SESSION=1` faz o servidor aceitar o usuário de dev e um script `npm run seed:dev` cria ~15 alunos fictícios, conexões, pedidos e membros de entidades no Supabase de desenvolvimento. Nunca ativo em produção (checado no boot).

---

## 6. Riscos e cuidados

- **Privacidade**: toda leitura de perfil passa por `canSee`; testes cobrem os 3 níveis × (anônimo de sessão, logado, conectado, dono).
- **Enumeração**: `GET /api/people/:handle` responde igual para handle inexistente e para perfil oculto; códigos de convite com 8+ caracteres aleatórios e rate limit.
- **IDOR**: rotas de admin conferem `entity_members.role = 'admin'` da **entidade da rota**, não de qualquer entidade.
- **Dados do Jupiter**: horários e salas continuam privados; só código e nome da matéria entram em `user_courses`.
- **Vercel**: rate limit em memória é por instância (já documentado); aceitável para o volume esperado.

## 7. Fora do escopo desta versão

E-mail de notificação, chat/mensagens, upload de foto, badges além de entidade, cargos dentro da entidade (diretor etc.), bloqueio/denúncia de usuários (recomendo como próxima entrega).
