# Fase 2 (Notificações) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Central de notificações no app (lista, lidas/não lidas), eventos reais (conexões, entidades/cargos, badges, avisos) e push no navegador.

**Architecture:** Tudo passa por um único módulo `server/social/notify.ts`. As rotas chamam `notify(...)` depois de concluir a ação. O módulo grava as linhas em `notifications` e tenta mandar push com prazo curto. O texto de cada notificação (título, corpo, link) é montado só no servidor, por `describeNotification`, e é o mesmo para a lista e para o push. Avisos ficam em `announcements` e geram uma linha de notificação por destinatário, inseridas em lote.

**Tech Stack:** Express 5, Supabase, `web-push` (nova dependência do servidor), service worker estático em `public/sw.js`, React.

**Spec:** `docs/plans/2026-10-20-cards-notificacoes-android-design.md` (seção "Fase 2"). A Fase 1 já está pronta: badges genéricas (`awardBadge`, `syncAutoBadges`), cargos (`setMemberTitle`) e o padrão `db.ts`/`fakeSocialDb.ts`.

## Global Constraints

- Valem as mesmas regras da Fase 1. Textos em português informal. Escrita com `authedWrite`, leitura com `authed`. Rotas não usam `getClient()`: tudo passa por `server/social/db.ts` e é espelhado no fake. SQL idempotente ao fim de `supabase/schema.sql`. `npm test && npm run lint && npm run build` verdes ao fim de cada tarefa. Commits em português com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Falha ao notificar nunca derruba a ação principal: `try/catch` + `logError`.
- Vercel Hobby: função com limite de 10 s. O push de cada requisição tem prazo total de **6 s**. O que não sair até lá é abandonado e registrado no log (a notificação na central já existe).
- Escala alvo: menos de 500 alunos. Nada de fila nem cron.
- Ninguém recebe notificação da própria ação (o autor do aviso e quem aceita a conexão ficam de fora).
- Badges `cohort` **não** notificam (mudam com o perfil e seriam ruído). Conquistas e badges concedidas por admin/entidade notificam. O script de backfill nunca notifica.

## Review Focus

1. **Notificação duplicada.** Duas requisições aceitam a mesma conexão ao mesmo tempo, ou a corrida já tratada em `POST /api/connections/:handle`. Esperado: `connection_accepted` só sai pelo caminho que de fato mudou o status (`acceptConnection` devolve `true`). Teste na Tarefa 3.
2. **Ler notificação alheia.** `POST /api/notifications/:id/read` com o id da notificação de outra pessoa. Esperado: 404, sem alterar nada. Teste na Tarefa 2.
3. **Aviso para público vazio ou valor inválido.** `audience: 'cohort'` com `audienceValue: 'abc'`, ou um curso inexistente. Esperado: 400 para valor malformado; 201 com `recipients: 0` para um público válido mas vazio. Teste na Tarefa 4.
4. **Admin de entidade estourando o limite de avisos.** O 4º aviso no mesmo dia, mesmo em outra instância da Vercel. Esperado: 429. O limite é contado no banco, não em memória. Teste na Tarefa 4.
5. **Inscrição de push morta.** O endpoint responde 410/404. Esperado: a inscrição é apagada e o restante do envio continua. Teste na Tarefa 6.

---

### Task 1: Schema das notificações — **Haiku**

**Files:**
- Modify: `supabase/schema.sql` (anexar), `supabase/README.md` (nota "Fase 2")

**Interfaces:**
- Produces:
  - `notifications`: `id uuid pk default gen_random_uuid()`, `user_id uuid not null references users(id) on delete cascade`, `type text not null check (type in ('connection_request','connection_accepted','entity_joined','entity_role_changed','entity_removed','badge_awarded','announcement'))`, `actor_id uuid references users(id) on delete set null`, `entity_id text references entities(id) on delete cascade`, `payload jsonb not null default '{}'`, `created_at timestamptz not null default now()`, `read_at timestamptz`. Índices `notifications_user_created_idx on (user_id, created_at desc, id desc)` e `notifications_user_unread_idx on (user_id) where read_at is null`.
  - `announcements`: `id uuid pk default gen_random_uuid()`, `author_id uuid references users(id) on delete set null`, `entity_id text references entities(id) on delete cascade` (preenchido quando o aviso vem de admin de entidade), `audience text not null check (audience in ('all','course','cohort','entity'))`, `audience_value text`, `title text not null check (char_length(title) between 1 and 80)`, `body text not null check (char_length(body) between 1 and 500)`, `link text`, `recipients int not null default 0`, `created_at timestamptz not null default now()`. Índice `announcements_entity_created_idx on (entity_id, created_at desc)`.
  - `push_subscriptions`: `id uuid pk default gen_random_uuid()`, `user_id uuid not null references users(id) on delete cascade`, `kind text not null default 'web' check (kind in ('web','fcm'))`, `endpoint text not null unique`, `keys jsonb not null default '{}'`, `created_at timestamptz not null default now()`, `last_seen_at timestamptz not null default now()`. Índice em `(user_id)`.
  - RLS habilitado nas três tabelas, sem políticas.

- [ ] **Step 1:** Anexar o SQL sob `-- Fase 2: notificações, avisos e push`.
- [ ] **Step 2:** Nota no README: rodar o schema de novo e configurar as variáveis VAPID (Tarefa 6).
- [ ] **Step 3:** `npm test`. Esperado: verde.
- [ ] **Step 4:** Commit: "Adiciona schema da Fase 2 (notificações, avisos e push)".

---

### Task 2: Camada de notificações, textos e rotas da central — **Sonnet**

**Files:**
- Create: `server/social/notify.ts`, `server/social/notificationText.ts`, `server/social/notificationText.test.ts`, `server/routes/notifications.ts`, `server/routes/notifications.test.ts`
- Modify: `server/social/db.ts` + `server/test/fakeSocialDb.ts`, `server/index.ts`, `server/routes/social.ts` (remover a rota antiga `/api/notifications/count`, que muda de casa)
- Modify: `src/lib/socialApi.ts`, `src/features/comunidade/hooks/useNotificationCount.ts`, `src/app/AppLayout.tsx`

**Interfaces:**
- db:
  - `type NotificationType = 'connection_request' | 'connection_accepted' | 'entity_joined' | 'entity_role_changed' | 'entity_removed' | 'badge_awarded' | 'announcement'`
  - `type NotificationInput = { type: NotificationType; actorId?: string | null; entityId?: string | null; payload?: Record<string, unknown> }`
  - `type NotificationRow = { id: string; userId: string; type: NotificationType; actorId: string | null; entityId: string | null; payload: Record<string, unknown>; createdAt: string; readAt: string | null }`
  - `insertNotifications(userIds: string[], input: NotificationInput): Promise<NotificationRow[]>`: uma única inserção em lotes de 500. Ignora ids repetidos.
  - `listNotifications(userId: string, before: { at: string; id: string } | null, limit: number): Promise<NotificationRow[]>`: ordem `created_at desc, id desc`.
  - `countUnread(userId: string): Promise<number>`
  - `markRead(userId: string, id: string): Promise<boolean>`: `false` se a notificação não for desse usuário ou se o id não for UUID.
  - `markAllRead(userId: string): Promise<void>`
- `notificationText.ts`:
  - `type NotificationContext = { actor: { name: string; handle: string } | null; entityName: string | null }`
  - `describeNotification(row: NotificationRow, ctx: NotificationContext): { title: string; body: string; url: string }`. Textos exatos (com `{actor}` = primeiro nome do ator, `{entity}` = nome da entidade):
    - `connection_request` → "Novo pedido de conexão" / "{actor} quer se conectar com você." / `/perfil#pedidos`
    - `connection_accepted` → "Conexão aceita" / "{actor} aceitou seu pedido." / `/comunidade/{handle}`
    - `entity_joined` → "Novo membro em {entity}" / "{actor} entrou na entidade." / `/entidades/{entityId}`
    - `entity_role_changed`, com payload `{ title?: string | null, role?: 'admin' | 'member' }`:
      - com `title` → "Novo cargo em {entity}" / "Agora você é {title}."
      - com `role: 'admin'` → "Você agora é admin de {entity}"
      - com `role: 'member'` → "Você não é mais admin de {entity}"
      - corpo dos dois últimos: "".
      - url `/entidades/{entityId}`
    - `entity_removed` → "Você saiu de {entity}" / "Um admin removeu você da entidade." / `/entidades`
    - `badge_awarded` (payload `{ label }`) → "Nova badge: {label}" / "Ela já aparece no seu perfil." / `/perfil`
    - `announcement` (payload `{ title, body, link? }`) → `{title}` / `{body}` / `link ?? '/'`
  - Ator ausente (conta apagada) usa "Alguém". A url de entidade usa o slug do front: o mesmo `entityId` que `/entidades/:slug` já resolve hoje; conferir em `src/features/entidades/data.ts` e, se o slug for diferente do id, gravar `entitySlug` no payload em vez de adivinhar.
- `notify.ts`:
  - `notify(userIds: string[], input: NotificationInput, opts?: { excludeId?: string }): Promise<void>`: remove `excludeId`, chama `insertNotifications` e depois `deliverPush(rows)`. Engole e registra no log qualquer erro.
  - `export let deliverPush: (rows: NotificationRow[]) => Promise<void> = async () => {}`, com `setPushDeliverer(fn)`. A Tarefa 6 liga o envio real; os testes podem espionar.
- Rotas (`server/routes/notifications.ts`):
  - `GET /api/notifications?cursor=` → `{ items: { id, type, title, body, url, createdAt, read: boolean, actor: PersonMini | null }[], nextCursor }`, com página de 20 e cursor no mesmo formato do feed (base64 de `{at,id}`). Atores e entidades são resolvidos em lote.
  - `GET /api/notifications/count` → `{ unread: number, pendingRequests: number }`
  - `POST /api/notifications/:id/read` → 204, ou 404 se não for do usuário
  - `POST /api/notifications/read-all` → 204
- Cliente:
  - `listNotifications(cursor?)`, `markNotificationRead(id)`, `markAllNotificationsRead()`
  - `getNotificationCount()` passa a devolver `{ unread, pendingRequests }`
  - `useNotificationCount()` devolve `{ unread, pendingRequests, refresh }`
  - `AppLayout` continua mostrando `pendingRequests` no item Comunidade. `unread` é usado na Tarefa 5.

- [ ] **Step 1:** Write failing tests:
  - `notificationText.test.ts`: um caso por tipo, com os textos exatos acima, mais o caso de ator ausente ("Alguém…");
  - `notifications.test.ts`: lista paginada (25 notificações → 20 + `nextCursor`, e a segunda página com 5); `count` com unread correto; marcar como lida a notificação de outro usuário dá 404; `read-all` zera o unread.
- [ ] **Step 2:** `npx vitest run server/social/notificationText.test.ts server/routes/notifications.test.ts`. Esperado: FAIL.
- [ ] **Step 3:** Implementar db, fake, `notificationText`, `notify` e as rotas. Atualizar o cliente e o hook (os testes de `BottomNav`/`AppLayout` existentes devem continuar passando; ajustar os mocks ao formato novo).
- [ ] **Step 4:** `npm test && npm run lint && npm run build`. Esperado: verde.
- [ ] **Step 5:** Commit: "Adiciona central de notificações no servidor".

---

### Task 3: Ligar os eventos às notificações — **Sonnet**

**Files:**
- Modify: `server/routes/social.ts`, `server/routes/entities.ts`, `server/routes/admin.ts`, `server/routes/badges.ts`, `server/social/achievements.ts`
- Test: `server/routes/social.test.ts`, `server/routes/entities.test.ts`, `server/routes/badges.test.ts`, `server/routes/admin` (criar `admin.test.ts` se não existir)

**Interfaces:**
- Consumes: `notify` (Tarefa 2), com um spy em `deliverPush` ou leitura do fake.
- Para testar pelo fake, o fake precisa expor `store.notifications` com o que `insertNotifications` gravou.
- Pontos de disparo, sempre **depois** da ação confirmada:
  - `connection_request` → para o alvo, quando `createConnection` devolve `'created'`. Ator: quem pediu.
  - `connection_accepted` → para quem fez o pedido original, só quando `acceptConnection(...)` devolve `true`, nos dois caminhos (`POST /api/connections/:handle` com pedido reverso e `POST /api/connections/:handle/accept`). Ator: quem aceitou.
  - `entity_joined` → para os admins ativos da entidade (ids via `listMembers` filtrando `role === 'admin'`), excluindo quem entrou. Só quando houve entrada de fato (não era membro ativo).
  - `entity_role_changed`:
    - em `PUT .../members/:handle/title`, quando o título mudou e o novo não é `null`, com payload `{ title }`;
    - em `PUT /api/admin/entities/:id/admins/:handle`, com payload `{ role }`, só se o papel mudou.

    Destinatário: o membro. Ator: quem mudou.
  - `entity_removed` → para o membro removido em `DELETE /api/entities/:id/members/:handle`. Sair por conta própria não notifica.
  - `badge_awarded` → em `grant` (Fase 1, `badges.ts`), quando `awardBadge` devolve `'awarded'`, com payload `{ label }`.
  - Conquistas: criar `syncAutoBadgesAndNotify(userId)` em `achievements.ts`. Ela chama `syncAutoBadges` e notifica cada `sourceId` concedido que seja `achievement` (não `cohort`), com `{ label }` vindo de `ACHIEVEMENTS`. As rotas que hoje chamam `syncAutoBadges` passam a chamar a nova. O backfill continua chamando `syncAutoBadges` direto.

- [ ] **Step 1:** Write failing tests:
  - pedir conexão gera 1 `connection_request` para o alvo;
  - aceitar gera 1 `connection_accepted` para quem pediu e nenhuma para quem aceitou;
  - aceitar duas vezes gera só 1 (Review Focus 1);
  - entrar com o código notifica os 2 admins, e não o novo membro;
  - definir o cargo notifica o membro, mas limpar o cargo não notifica;
  - remover o membro notifica, e sair por conta própria não;
  - conceder badge notifica, e conceder de novo (`'exists'`) não;
  - PATCH de perfil que completa o perfil gera `badge_awarded` "Perfil completo";
  - trocar a turma não gera notificação.
- [ ] **Step 2:** Rodar os testes. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test && npm run lint && npm run build`. Esperado: verde.
- [ ] **Step 5:** Commit: "Envia notificações em conexões, entidades e badges".

---

### Task 4: Avisos da administração e das entidades — **Sonnet**

**Files:**
- Create: `server/routes/announcements.ts`, `server/routes/announcements.test.ts`, `src/features/perfil/AnnouncementForm.tsx`
- Modify: `server/social/db.ts` + fake, `server/index.ts`, `src/lib/socialApi.ts`, `src/features/perfil/AdminSection.tsx`

**Interfaces:**
- db:
  - `type Audience = 'all' | 'course' | 'cohort' | 'entity'`
  - `resolveAudience(audience: Audience, value: string | null): Promise<string[]>`:
    - `all`: todos os `student_profiles.user_id`;
    - `course`: `course = value`;
    - `cohort`: `entry_year = Number(value)`;
    - `entity`: membros ativos.

    Limite de segurança de 5000 ids.
  - `createAnnouncement(input: { authorId: string; entityId: string | null; audience: Audience; audienceValue: string | null; title: string; body: string; link: string | null; recipients: number }): Promise<{ id: string }>`
  - `countEntityAnnouncementsSince(entityId: string, sinceIso: string): Promise<number>`
- Validação (função pura `validateAnnouncement(body, scope: 'admin' | 'entity')` em `server/social/validation.ts`):
  - `title` com 1–80 caracteres e `body` com 1–500, depois de trim;
  - `link` opcional: caminho interno começando com `/` (sem `//`) ou URL `https://`;
  - no escopo `admin`: `audience` ∈ `all | course | cohort | entity`; `cohort` exige `audienceValue` com 4 dígitos entre 2000 e o ano atual + 1; `course` exige texto não vazio; `entity` exige `ENTITY_ID_PATTERN` e entidade existente (checada na rota);
  - no escopo `entity`: `audience` é sempre `entity` com a própria entidade da rota, e o corpo não escolhe público.
- Rotas:
  - `POST /api/admin/announcements` (superadmin) → 201 `{ id, recipients }`
  - `POST /api/entities/:id/announcements` (`requireEntityAdmin`): 429 "Limite de 3 avisos por dia" quando `countEntityAnnouncementsSince(entity, agora - 24h) >= 3`. O superadmin ignora o limite.
  - Fluxo: validar → `resolveAudience` → `createAnnouncement` → `notify(ids, { type: 'announcement', entityId, payload: { title, body, link } }, { excludeId: autor })`.
- Cliente: `sendAdminAnnouncement(input)` e `sendEntityAnnouncement(entityId, input)`.
- UI: `<AnnouncementForm scope="admin" | { entityId } />` com título, texto, link opcional e, no admin, a seleção de público com o campo de valor. Antes de enviar, pede confirmação ("Enviar para todo mundo?"). Depois mostra "Aviso enviado para N pessoas". O formulário fica em `AdminSection`, nos blocos de superadmin e de cada entidade administrada.

- [ ] **Step 1:** Write failing tests em `announcements.test.ts`:
  - não-superadmin recebe 403;
  - `cohort` 2024 alcança só quem tem `entry_year` 2024 e não alcança o autor;
  - `cohort` "abc" dá 400;
  - `course` sem ninguém dá 201 com `recipients: 0`;
  - admin da entidade: o 4º aviso em 24 h dá 429, e o superadmin na mesma entidade passa;
  - link `javascript:alert(1)` dá 400;
  - cada destinatário recebe exatamente 1 notificação `announcement`.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar o servidor e a UI.
- [ ] **Step 4:** `npm test && npm run lint && npm run build`. Esperado: verde.
- [ ] **Step 5:** Commit: "Adiciona avisos da administração e das entidades".

---

### Task 5: Central de notificações no app — **Sonnet**

**Files:**
- Create: `src/features/notificacoes/NotificacoesPage.tsx`, `src/features/notificacoes/NotificacoesPage.test.tsx`, `src/components/NotificationBell.tsx`, `src/styles/notificacoes.css`
- Modify: `src/app/routes.tsx` (rota `notificacoes`), `src/app/AppLayout.tsx`, `src/components/Sidebar.tsx`, `src/app/layoutContext.ts` (se precisar expor `unread`)

**Interfaces:**
- Consumes: as rotas e funções do cliente da Tarefa 2; `acceptConnection` e `removeConnection` já existentes.
- `<NotificationBell count={number} />`: botão com ícone de sino e `CountBadge`, que navega para `/notificacoes`, com `aria-label` "Notificações" / "Notificações, N não lidas".
  - Desktop: dentro do `Sidebar`, junto da área do usuário.
  - Mobile (< 768 px): botão fixo no canto superior direito do `app-main`, escondido na própria página `/notificacoes`.
- `/notificacoes`:
  - lista com título, corpo e tempo relativo ("há 5 min"), e as não lidas destacadas;
  - clicar marca como lida e navega para `url` (`url` externo `https://` abre em nova aba);
  - `connection_request` tem botões "Aceitar" e "Recusar" inline, usando o `handle` do ator;
  - "Marcar todas como lidas";
  - "Carregar mais" pelo cursor;
  - estado vazio: "Nada por aqui ainda.";
  - ao entrar e após cada ação, chama `refreshNotifications()` do layout;
  - um slot `<PushOptIn />` no topo, vazio até a Tarefa 6 (pode ser só um comentário + export vazio).

- [ ] **Step 1:** Write failing tests em `NotificacoesPage.test.tsx`, com a API mockada:
  - renderiza títulos e destaca as não lidas;
  - clicar chama `markNotificationRead` e navega para a url;
  - "Aceitar" chama `acceptConnection(handle)`;
  - "Marcar todas como lidas" chama a função e tira o destaque;
  - lista vazia mostra "Nada por aqui ainda.".
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar a página, o sino, a rota e o estilo, seguindo os tokens de `src/styles/tokens.css`.
- [ ] **Step 4:** `npm test && npm run lint && npm run build`. Esperado: verde.
- [ ] **Step 5:** Commit: "Adiciona central de notificações no app".

---

### Task 6: Push no navegador — **Sonnet**

**Files:**
- Create: `server/social/push.ts`, `server/social/push.test.ts`, `server/routes/push.ts`, `server/routes/push.test.ts`, `public/sw.js`, `src/lib/push.ts`, `src/features/notificacoes/PushOptIn.tsx`
- Modify: `server/lib/config.ts` (VAPID), `server/index.ts`, `server/social/db.ts` + fake, `src/main.tsx` (registrar o SW), `README.md` (como gerar as chaves VAPID: `npx web-push generate-vapid-keys`)
- Add dependency: `web-push` (+ `@types/web-push` em dev)

**Interfaces:**
- config:
  - `vapid: { publicKey: string; privateKey: string; subject: string } | null`, lido de `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` (padrão `mailto:` + o primeiro e-mail de `SUPERADMIN_EMAILS`);
  - `null` quando faltar alguma variável: o push fica desligado sem erro.
- db:
  - `savePushSubscription(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<void>`: upsert por `endpoint`. Se o endpoint estava com outro usuário, passa para o atual.
  - `deletePushSubscription(userId: string, endpoint: string): Promise<void>`
  - `listPushSubscriptions(userIds: string[]): Promise<{ id: string; userId: string; endpoint: string; keys: { p256dh: string; auth: string } }[]>`: só `kind = 'web'`.
  - `deletePushSubscriptionById(id: string): Promise<void>`
- `push.ts`:
  - `type PushSender = (sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) => Promise<{ statusCode: number }>`
  - `createPushDeliverer(send: PushSender, opts?: { concurrency?: number; deadlineMs?: number }): (rows: NotificationRow[]) => Promise<void>`
    - padrões: `concurrency` 20, `deadlineMs` 6000;
    - para cada linha, monta o texto com `describeNotification` (resolvendo ator e entidade em lote);
    - envia JSON `{ title, body, url, tag: row.id }` a cada inscrição do destinatário;
    - 404/410 apagam a inscrição;
    - outros erros vão para o log;
    - ao estourar o prazo, para de iniciar envios e registra no log quantos ficaram.
  - Na inicialização do app (`server/index.ts`), se `vapid` existir: `setPushDeliverer(createPushDeliverer(webPushSender))`, com `webPushSender` usando `webpush.sendNotification` e `TTL: 86400`.
- Rotas:
  - `GET /api/push/public-key` (`authed`) → `{ publicKey }`, ou 404 se o push estiver desligado;
  - `POST /api/push/subscriptions` (`authedWrite`, `rateLimit('push-sub', 20, 10 * 60_000)`) com `{ endpoint, keys: { p256dh, auth } }` → 204. Endpoint precisa ser `https://` e ter até 1000 caracteres; as chaves são strings base64url com até 200 caracteres. Fora disso, 400.
  - `DELETE /api/push/subscriptions` com `{ endpoint }` → 204.
- `public/sw.js`:
  - `push`: faz `showNotification(title, { body, icon: '/logo.png', badge: '/favicon.svg', tag, data: { url } })`;
  - `notificationclick`: foca uma aba do app já aberta e navega para `url`, ou abre uma nova;
  - sem cache nem fetch handler.
- `src/lib/push.ts`:
  - `pushSupported(): boolean`: precisa de `serviceWorker`, `PushManager` e `Notification`;
  - `pushState(): 'unsupported' | 'denied' | 'enabled' | 'available'`;
  - `enablePush(): Promise<void>`: permissão → `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` → POST;
  - `disablePush(): Promise<void>`.

  O SW é registrado em `main.tsx` só em produção ou com `VITE_ENABLE_SW=1`.
- `<PushOptIn />`, no topo de `/notificacoes`:
  - `available`: cartão "Receber avisos neste dispositivo?" com o botão "Ativar";
  - `enabled`: linha discreta "Avisos ativados neste dispositivo" e "Desativar";
  - `denied`: "Os avisos estão bloqueados nas configurações do navegador.";
  - `unsupported`: nada.

  Nunca pede permissão sozinho.

- [ ] **Step 1:** Write failing tests:
  - `push.test.ts` (sender fake):
    - 2 inscrições do destinatário recebem 1 envio cada, com `title` do `describeNotification`;
    - a resposta 410 apaga a inscrição e o envio seguinte continua (Review Focus 5);
    - com `deadlineMs: 50` e um sender que demora 100 ms, a função retorna em menos de 200 ms;
  - `push.test.ts` de rotas: endpoint `http://` dá 400; a mesma inscrição duas vezes resulta numa linha só; `public-key` sem VAPID dá 404.
- [ ] **Step 2:** Rodar. Esperado: FAIL.
- [ ] **Step 3:** Implementar o servidor, o SW, o cliente e o `PushOptIn`. Ligar o `PushOptIn` no slot da Tarefa 5.
- [ ] **Step 4:** `npm test && npm run lint && npm run build`. Conferir que `dist/sw.js` existe após o build.
- [ ] **Step 5:** Commit: "Adiciona push no navegador".

---

### Task 7: Verificação final — **Opus (revisão)**

- [ ] **Step 1:** `npm test && npm run lint && npm run build` e o typecheck do servidor (`npx tsc -p tsconfig.server.build.json --noEmit`).
- [ ] **Step 2:** Revisar o diff da fase contra a spec e a Review Focus.
- [ ] **Step 3:** Listar para o Alex os passos manuais:
  - rodar o schema;
  - gerar as chaves VAPID e cadastrá-las na Vercel;
  - testar o push num celular Android com o Chrome.
