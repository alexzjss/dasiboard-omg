# Design: card de perfil, notificações, badges, cargos e app Android

**Data:** 2026-10-20
**Planejamento e revisão:** Opus · **Implementação:** Sonnet (lógica, segurança, UI nova) e Haiku (tarefas mecânicas e bem delimitadas).
**Base:** sistema social já entregue (`docs/plans/2026-10-20-sistema-social.md`). Stack: React 19 + Vite (front), Express 5 servido como função na Vercel (`api/index.ts`), Supabase (Postgres, service role, RLS ligado sem políticas), login Google via `@react-oauth/google` + `google-auth-library`, sessão em cookie (`jose`).

## Intenção

O perfil do aluno vira uma **carta colecionável**: algo que dá vontade de mostrar, trocar e personalizar, no estilo do card do Arc. A carta é a cara da pessoa na Comunidade, num link que dá para compartilhar e num QR que se escaneia num evento. Ela só fica rica se tiver o que mostrar, então vem junto o que alimenta a carta: foto própria, cargos nas entidades, mais tipos de badge e tecnologias. Notificações de verdade e um APK Android fazem o app ser usado no dia a dia, e não só aberto de vez em quando.

## Fases (nesta ordem)

1. **Base:** Google One Tap, upload de foto com recorte, cargos nas entidades, novas badges, tecnologias.
2. **Notificações:** central no app e push no navegador.
3. **Card:** carta modelo A, personalização, link público, PNG, coleção e card de entidade.
4. **Android:** Capacitor, login Google nativo, push nativo (FCM) e APK.

Cada fase tem plano próprio (`docs/plans/`), escrito quando ela começa, e revisão do Opus ao terminar. Cada fase deve ir para produção sozinha, sem quebrar o que já existe.

## Objetivos, não-objetivos e anti-objetivos

**Objetivos**
- A carta aparece no próprio perfil (`/perfil`) e no de outra pessoa (`/comunidade/:handle`).
- A personalização é visível e divertida, mas a carta continua legível com qualquer combinação.
- As notificações cobrem conexões, entidades/cargos, badges e avisos da administração.
- O APK instalável por link reaproveita o app React atual.

**Não-objetivos (agora)**
- Publicar na Play Store (mas não fechar a porta: assinatura e `applicationId` definitivos desde já).
- iOS.
- Chat ou mensagens diretas.
- Preferências de notificação por tipo (a pessoa não pediu agora; ver "Fica para depois").
- E-mail.

**Anti-objetivos (seria um fracasso mesmo funcionando)**
- O link público ou o QR expõe e-mail, nº USP, matérias, horários ou conexões de quem não escolheu mostrar.
- A carta fica ilegível (contraste ruim) com alguma combinação de cor e papel.
- Push que vira spam: o mesmo evento chega duas vezes, ou um aviso da admin dispara centenas de pushes sem controle.
- O APK vira um segundo app para manter: telas e lógica divergentes da web.
- Upload de foto aceita arquivo arbitrário ou imagem gigante.

## Fase 1: Base

### Google One Tap
- Fica só na tela de login, junto do botão atual: `useOneTap` em `LoginScreen.tsx`, com `auto_select` para quem já entrou antes.
- O credential vai pelo mesmo endpoint `/api/auth/google`. A validação de domínio @usp.br continua no servidor.
- Se o One Tap for dispensado ou bloqueado (cooldown do Google, cookies de terceiros), o botão continua funcionando sem erro visível.

### Foto de perfil
- **Recorte no cliente:** a pessoa recorta e dá zoom antes do envio, num modal com área quadrada. A imagem final sai em WebP 512×512 e uma miniatura 128×128, gerada no cliente via canvas. Biblioteca leve de recorte ou implementação própria: escolha do builder, priorizando tamanho de bundle.
- **Envio:** o servidor gera uma *signed upload URL* do Supabase Storage (bucket `avatars`, público para leitura). O cliente envia direto para o Storage, sem passar o arquivo pela função da Vercel, que tem limite de corpo. Depois o servidor confirma e grava o caminho.
- **Limites:**
  - só `image/webp`, `image/png` e `image/jpeg`;
  - no máximo 2 MB no envio;
  - caminho `avatars/{user_id}/{versão}.webp`, com versão nova a cada troca para invalidar cache;
  - rate limit no endpoint que gera a URL.
- **Precedência:** foto enviada → foto do Google (`users.picture`) → iniciais. Há um botão para remover a foto enviada e voltar à do Google.
- **Schema:** coluna nova `student_profiles.avatar_path text`.

### Cargos nas entidades
- Coluna nova `entity_members.title text`, um título livre de até 40 caracteres (ex.: "Diretor de Marketing").
- O título é independente da permissão `role` (`member`/`admin`), que continua como está.
- **Quem define:** o admin da entidade, para qualquer membro, e o superadmin. O próprio membro não define o seu.
- **Onde aparece:** lista de membros da entidade, perfil, carta (subtítulo: o cargo da entidade que a pessoa escolher como "principal"; ver Fase 3) e notificação "você agora é X na entidade Y".

### Novas badges
Ampliar `user_badges`, que já é genérica (`kind`, `source_id`, `label`, `awarded_at`, `revoked_at`):

| Tipo (`kind`) | Quem concede | Exemplos |
|---|---|---|
| `entity_member` (já existe) | sistema | membro do DASI |
| `achievement` | sistema, automático | perfil completo, 10/50 conexões, grade importada, colecionou 10 cartas |
| `admin_award` | superadmin | Monitor, Representante discente, Hackathon 2026 |
| `entity_award` | admin da entidade | Organizador do evento X, só para membros daquela entidade |
| `cohort` | sistema, automático | Turma 2024, curso SI |

- **Catálogo:** tabela nova `badge_definitions`, que guarda as badges que podem ser concedidas manualmente. Colunas:
  - `id`;
  - `kind`;
  - `entity_id` (opcional; dono da badge, para `entity_award`);
  - `label`;
  - `description`;
  - `icon` (nome de um ícone de um conjunto fixo, não upload);
  - `color`;
  - `created_by`.
- **Conquistas automáticas:** a lista é fixa no código. São avaliadas no servidor após o evento que pode concedê-las (aceitar conexão, salvar perfil, importar grade, colecionar carta), sem job periódico, e são idempotentes graças ao `unique (user_id, kind, source_id)` que já existe.
- **Badges de turma/curso:** derivadas de `entry_year` e `course`. Se a pessoa mudar esses campos, a anterior é revogada.
- **Telas:**
  - superadmin cria e concede badges `admin_award`, procurando a pessoa por handle;
  - admin da entidade cria e concede `entity_award` aos membros da entidade;
  - quem concede pode revogar.
- **Exibição:** cada badge tem ícone, cor e rótulo. No perfil aparecem todas; na carta, a pessoa escolhe quais (Fase 3).

### Tecnologias
- Uma lista curada de ~150 tecnologias fica num arquivo estático no front. Cada item tem id, nome, cor e ícone SVG (de preferência a partir de Simple Icons, respeitando a licença; os ícones carregam sob demanda para não inflar o bundle).
- A pessoa busca e adiciona até 12, e arrasta para ordenar.
- **Schema:** `student_profiles.technologies text[]`, ids na ordem. O servidor valida contra a mesma lista, que é compartilhada ou duplicada no servidor.
- Aparece no perfil e na carta.

## Fase 2: Notificações

### Modelo
Tabela nova `notifications`:
- `id`;
- `user_id` (destinatário);
- `type`;
- `actor_id` (opcional);
- `entity_id` (opcional);
- `payload jsonb` (dados para montar o texto e o link);
- `created_at`;
- `read_at`.

Índices: `(user_id, read_at)` e `(user_id, created_at desc)`.

Tipos:
- `connection_request`, `connection_accepted`;
- `entity_joined` (para admins: novo membro), `entity_role_changed` (cargo ou permissão alterados), `entity_removed`;
- `badge_awarded`;
- `announcement`.

Avisos ficam numa tabela própria, `announcements`, com:
- `id`;
- `author_id`;
- `audience` (`all` | `course` | `cohort` | `entity`) + `audience_value`;
- `title`, `body`, `link` (opcional);
- `created_at`.

Cada destinatário recebe uma linha em `notifications`, criadas em lote numa única inserção no banco (`insert ... select`).

**Quem pode avisar:**
- o superadmin, para qualquer público;
- o admin de entidade, só para os membros da sua entidade.

Para evitar spam, há rate limit para avisos: admin de entidade com no máximo N por dia, valor definido pelo builder, sugestão 3.

### Central no app
- Ícone de sino com o contador, que substitui o contador atual baseado só em pedidos de conexão. O endpoint `/api/notifications/count` passa a contar notificações não lidas. O polling de 60 s em `useNotificationCount` continua como fallback.
- Página ou painel de notificações em lista paginada. Clicar abre o destino e marca como lida; há também a ação "marcar todas como lidas".
- Pedidos de conexão continuam com aceitar/recusar inline.
- Notificações com mais de 90 dias podem ser apagadas por limpeza oportunista (escolha do builder).

### Push no navegador (Web Push)
- Service worker próprio, mínimo, só para push e clique. Não é um PWA offline completo; isso fica para depois.
- Chaves VAPID nas variáveis de ambiente.
- Tabela `push_subscriptions`:
  - `id`;
  - `user_id`;
  - `kind` (`web` | `fcm`);
  - `endpoint` ou token;
  - `keys jsonb`;
  - `created_at`;
  - `last_seen_at`.
- O pedido de permissão nunca acontece ao abrir o app. Ele aparece depois de uma ação: um banner na central de notificações ("Receber avisos no celular/navegador?").
- **Envio:** ao criar a notificação, o servidor envia push para as inscrições do destinatário, dentro da mesma requisição. **Escala (decisão do Alex): Vercel Hobby, menos de 500 alunos** — avisos em massa enviam em lotes paralelos dentro da própria requisição (timeout de 10 s), sem fila nem cron. Se o envio não terminar, o restante fica sem push (a notificação na central já existe), e isso é registrado em log. Uma linha de `notifications` por destinatário cabe tranquilamente no Supabase free nesse volume.
- Inscrições que retornam 404/410 são removidas.
- Uma notificação gera no máximo um push por inscrição.

## Fase 3: O card (modelo A, "Arc fiel")

Referência visual: mockup aprovado em `.superpowers/brainstorm/*/content/card-arc-v2.html`, opção A, inspirado no card de perfil do Arc.

### Frente
- Papel (creme por padrão) dentro de um fundo colorido com cantos arredondados, e textura de grão sutil.
- Foto grande na forma escolhida (padrão: "folha", com dois cantos opostos bem arredondados). Sem foto, um gradiente com as cores do tema.
- Nome grande e em negrito na cor de destaque.
- Subtítulo: o cargo principal e a entidade (ex.: "Diretor de Marketing · DASI"). Sem cargo: curso e turma.
- Rodapé esquerdo: etiquetas de tecnologias com o separador hachurado do Arc, no máximo 3 visíveis na frente.
- Rodapé direito: ícones pequenos com contorno, para as entidades e badges escolhidas (no máximo 4).

### Verso
- Handle, curso e turma.
- QR grande no centro, apontando para o link público do card.
- Redes sociais como chips.
- Todas as tecnologias.
- Lista de entidades com os cargos e badges escolhidas.

### Interação
- Clique ou toque vira a carta.
- Tilt com brilho seguindo o mouse; no celular, o giroscópio (`DeviceOrientation`, com pedido de permissão quando o sistema exigir).
- Acabamento foil quando desbloqueado.
- Respeitar `prefers-reduced-motion`: sem tilt e sem animação de virar, só troca de face.

### Personalização
Fica salva em `student_profiles.card jsonb`, validado no servidor por um schema fechado:

| Opção | Valores |
|---|---|
| Cor de destaque | paletas pré-definidas (~10) + cor livre |
| Papel | creme, branco, escuro |
| Fundo externo | cor sólida da paleta ou gradiente da paleta |
| Forma da foto | folha, arco, círculo, squircle |
| Moldura da foto | com/sem |
| Grão | com/sem |
| Acabamento | comum, foil, holográfico, dourado (desbloqueáveis) |
| O que mostrar | quais entidades (e qual é a principal do subtítulo), quais badges e a ordem das tecnologias |

- **Contraste:** cor livre só é aceita se tiver contraste AA (4,5:1) com o papel escolhido. O editor avisa e sugere o ajuste; o servidor recusa o que não passar.
- **Editor:** fica no próprio perfil, com preview ao vivo da carta ao lado (desktop) ou acima (celular).

### Raridade (acabamentos)
Desbloqueio por conquistas, com regras fixas no código e conferidas no servidor ao salvar. Sugestão inicial, que o builder pode ajustar:
- **comum:** todos;
- **foil:** 5 badges;
- **holográfico:** cargo em alguma entidade ou 25 conexões;
- **dourado:** qualquer badge `admin_award` ou colecionou 50 cartas.

O editor mostra os acabamentos bloqueados com o requisito.

### Link público e privacidade
- Rota pública `/c/:handle` (curta, boa para o QR). É uma página leve, só com a carta, que também abre dentro do app quando logado.
- `student_profiles.card_public boolean default false`. Desligado: só esconde de visitantes sem login — a rota pede login e **qualquer aluno logado** vê e coleciona a carta normalmente (decisão do Alex).
- **Domínio canônico:** `https://dasiboard.vercel.app` (decisão do Alex, aceitando o risco de QRs quebrarem se o projeto for renomeado). Fica numa variável `PUBLIC_APP_URL` usada para gerar QR, links e App Links — nunca escrito à mão no código.
- A carta pública mostra só as entidades e badges que a pessoa marcou para a carta (entidades já são visíveis para logados no perfil atual; no público vale apenas a seleção da carta).
- **Ligado, a carta pública mostra só:** nome, foto, cargo/entidades, badges escolhidas, tecnologias, redes e turma/curso.
- **Nunca mostra:** e-mail, nº USP, matérias, horários ou conexões.
- Endpoint público próprio, com um presenter separado e testado para não vazar campos. Tem rate limit e não aceita listagem nem busca.
- Meta tags Open Graph com uma imagem estática genérica. Gerar a imagem da carta no servidor fica para depois.

### Baixar como imagem
- Botão "Baixar PNG" que exporta a frente (e opcionalmente o verso) no cliente, em 2× ou 3× para stories.
- Usar uma lib de DOM→imagem (ex.: `html-to-image`) carregada sob demanda. A foto precisa vir com CORS liberado (Supabase Storage público serve).
- Efeitos dependentes de mouse (brilho) ficam neutros na exportação.

### Coleção de cartas
- Tabela `card_collection`: `collector_id`, `collected_id`, `collected_at`, com PK no par.
- Abrir `/c/:handle` logado (vindo do QR ou do link) mostra a carta com o botão **"Colecionar"**. Depois de colecionar, se ainda não houver conexão, aparece **"Pedir conexão"**.
- Colecionar não envia pedido de conexão automaticamente.
- Página "Minha coleção" em grade, ordenada pela mais recente.
- Colecionar conta para conquistas (10/50 cartas). O dono da carta não é notificado, para não virar spam; pode virar opção depois.
- **Leitor de QR dentro do app:** fica para a Fase 4 (câmera nativa). Na web, a câmera do próprio celular já abre o link.

### Card de entidade
- Mesma linguagem visual do modelo A, com logo da entidade, nome, tipo, nº de membros, membros com cargos (os primeiros) e QR para a página da entidade.
- Personalização restrita: as cores ficam presas às cores da entidade já definidas no front.
- Aparece na página da entidade, com opção de baixar PNG.

## Fase 4: Android (Capacitor)

- **Projeto:** Capacitor no próprio repo (`android/`), com o build web (`dist`) empacotado no APK, não carregando a URL remota. `applicationId` definitivo: **`br.usp.dasiboard`** (decisão do Alex).
- **API e sessão:** o app empacotado roda em `https://localhost` dentro do WebView, então os cookies da API na Vercel viram cookies de terceiros. O builder escolhe uma das duas:
  - usar `CapacitorHttp` com cookies nativos;
  - sessão por token Bearer só no app, com o mesmo JWT da sessão atual, guardado em armazenamento seguro.

  O servidor precisa aceitar a origem do app no CORS/`isAllowedOrigin`.
- **Login Google:** o botão e o One Tap da web não funcionam no WebView. No app, usar login nativo (Credential Manager, via plugin Capacitor) que devolve um ID token. O servidor passa a aceitar também o client ID Android como `audience` válido. Mesma regra @usp.br.
- **Push nativo:** Firebase Cloud Messaging via `@capacitor/push-notifications`. O token é salvo em `push_subscriptions` com `kind = 'fcm'` e o servidor envia com `firebase-admin`. O mesmo evento gera push para todas as inscrições da pessoa. Pedido de permissão do Android 13+ no mesmo momento da web (após uma ação).
- **Nativo extra:**
  - câmera/galeria para a foto (`@capacitor/camera`), alimentando o mesmo recorte;
  - leitor de QR para colecionar cartas;
  - deep link `https://dasiboard.vercel.app/c/:handle` abrindo o app (App Links), servindo `/.well-known/assetlinks.json` pelo próprio app na Vercel.
- **Setup manual (tarefas para o Alex, guiadas no plano da Fase 4):** criar keystore definitiva (e backup), projeto Firebase + service account, OAuth client Android com o SHA-1 dessa keystore. Nada disso pode mudar depois sem quebrar login/push.
- **Distribuição:**
  - APK assinado com keystore guardada fora do repo, e instrução de backup no README;
  - publicado em GitHub Releases, com link na própria web ("Baixar app Android");
  - `versionCode` e `versionName` incrementados por release;
  - aviso de "nova versão disponível" no app, comparando com um endpoint simples de versão.
- **Fora do escopo:** Play Store e iOS.

## Restrições

- Toda regra de acesso continua no Express com a service role; RLS ligado sem políticas, como hoje. O Storage é exceção: leitura pública do bucket `avatars`, e escrita só por signed URL emitida pelo servidor.
- Funções da Vercel têm limite de tempo e de corpo. Nada de arquivo passando pelo servidor, e envios em massa em lotes.
- Migrações SQL incrementais e idempotentes (`if not exists`), no estilo de `supabase/schema.sql`.
- Testes: seguir o padrão atual (vitest + supertest com `fakeSocialDb`). Toda regra de privacidade, permissão e desbloqueio precisa de teste.
- Textos de interface em português, no tom informal que o app já usa.
- O mesmo componente de carta serve para perfil próprio, perfil alheio, link público, exportação PNG e coleção.

## Decisões da pessoa (Alex)

- One Tap só na tela de login.
- Foto no Supabase Storage, com editor de recorte.
- Cargos com título livre, separado da permissão.
- Badges: conquistas automáticas, concedidas pela admin, concedidas pela entidade e de turma/curso.
- Tecnologias de lista curada com ícones.
- Notificações em central e push, com os eventos: conexões, entidades/cargos, badges e avisos da admin.
- Avisos segmentados por todos, curso, turma ou entidade; admins de entidade avisam os seus membros.
- Card modelo A ("Arc fiel"), com virar, tilt/holográfico, PNG e link público.
- Personalização: fundo e cores, moldura da foto, o que mostrar e acabamentos.
- Link público opcional (a pessoa liga), e o QR aponta para o card público.
- Acabamentos desbloqueados por conquistas.
- Coleção: escanear coleciona e sugere conexão.
- Extras: coleção, card de entidade e recorte de foto.
- Android com Capacitor, APK distribuído direto.
- Ordem: base → notificações → card → Android.
- Modelos: Opus planeja e revisa; Sonnet e Haiku dividem a implementação.

## Decisões minhas (pode contestar)

- Upload direto ao Storage por signed URL, sem passar pelo servidor, e WebP 512 px.
- `badge_definitions` com ícones de um conjunto fixo, sem upload de ícone.
- Conquistas avaliadas no evento, sem cron. No deploy, um script de **backfill** concede conquistas e badges de turma/curso a quem já tem dados, **sem gerar notificações** (evita push em massa no lançamento).
- Badges `admin_award` são criadas pelo superadmin pela tela, sem seed. O acabamento dourado é liberado por **qualquer** `admin_award` (ou 50 cartas), não por uma badge específica.
- Rota pública curta `/c/:handle`, card público desligado por padrão.
- Contraste AA obrigatório na cor livre.
- Coleção não notifica o dono da carta.
- Rate limit de avisos para admin de entidade.
- APK empacota o build (não carrega URL remota) e o login no app é Google nativo, que é obrigatório porque o login web não funciona no WebView.
- Web Push com service worker mínimo, sem PWA offline.

## Fica com o builder

- Biblioteca de recorte e de DOM→imagem (priorizar bundle pequeno e carga sob demanda).
- Fila ou lote para push em massa.
- Sessão no app: `CapacitorHttp` com cookies ou Bearer.
- Limpeza de notificações antigas.
- Lista exata de conquistas e limiares dos acabamentos, partindo das sugestões acima.
- Paletas exatas, partindo do mockup.

## Fica para depois

- Preferências de notificação por tipo.
- Imagem Open Graph gerada no servidor.
- Play Store.
- iOS.
- PWA offline.
- Notificar o dono quando a carta é colecionada.
