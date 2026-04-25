# DaSIboard 🎓

**Dashboard acadêmico completo do curso de Sistemas de Informação — EACH USP.**

Tudo que um estudante de SI precisa em um único lugar: Kanban de tarefas, controle de notas e frequência, calendário de eventos, salas de estudo colaborativas, perfil com conquistas, fluxograma curricular interativo e muito mais — com 34 temas visuais e um sistema de gamificação integrado.


---

## Sumário

- [Stack Tecnológica](#stack-tecnológica)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Funcionalidades — Frontend](#funcionalidades--frontend)
  - [Páginas](#páginas)
  - [Componentes](#componentes)
  - [Hooks e Utilitários](#hooks-e-utilitários)
  - [Sistema de Temas](#sistema-de-temas)
  - [Gamificação](#gamificação)
  - [Easter Eggs](#easter-eggs)
- [API Backend](#api-backend)
  - [Autenticação (`/auth`)](#autenticação-auth)
  - [Usuários (`/users`)](#usuários-users)
  - [Kanban (`/kanban`)](#kanban-kanban)
  - [Disciplinas e Notas (`/grades`)](#disciplinas-e-notas-grades)
  - [Eventos (`/events`)](#eventos-events)
  - [Entidades (`/entities`)](#entidades-entities)
  - [Social (`/social`)](#social-social)
- [Segurança](#segurança)
- [Banco de Dados](#banco-de-dados)
- [Deploy no DigitalOcean](#deploy-no-digitalocean)
- [Desenvolvimento Local](#desenvolvimento-local)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Licença](#licença)

---

## Stack Tecnológica

| Camada   | Tecnologia                                                        |
|----------|-------------------------------------------------------------------|
| Frontend | React 18 · Vite · TypeScript · Tailwind CSS · Zustand · Axios    |
| Backend  | Python 3.11 · FastAPI · psycopg2 · Pydantic v2 · Gunicorn/Uvicorn |
| Banco    | PostgreSQL 15 — schema em SQL puro, sem ORM                       |
| Servidor | Nginx — reverse proxy + SPA                                       |
| Deploy   | Docker Compose → DigitalOcean                                     |
| CI/CD    | GitHub Actions (push → deploy automático)                         |

**Dependências principais do frontend:**

| Pacote | Uso |
|---|---|
| `react-router-dom` | Roteamento SPA com lazy-loading |
| `zustand` | Gerenciamento de estado de autenticação |
| `axios` | Cliente HTTP com interceptors de refresh token |
| `@dnd-kit/core` e `@dnd-kit/sortable` | Drag-and-drop do Kanban |
| `date-fns` | Manipulação de datas |
| `react-hot-toast` | Notificações toast |
| `lucide-react` | Biblioteca de ícones |
| `clsx` | Composição dinâmica de classes CSS |

---

## Estrutura do Projeto

```
dasiboard/
├── database/
│   ├── init.sql              ← Schema completo + seed de entidades
│   ├── migrate_v2.sql        ← Migração: attendance, global_events, entities
│   └── migrate_social.sql    ← Migração: perfil público, notas, salas de estudo
│
├── backend/
│   ├── app/
│   │   ├── main.py           ← Instância FastAPI, CORS, registro de routers
│   │   ├── api/routes/
│   │   │   ├── auth.py       ← Registro, login, refresh token, /me
│   │   │   ├── users.py      ← Perfil, avatar, conquistas
│   │   │   ├── kanban.py     ← Boards, colunas e cards
│   │   │   ├── grades.py     ← Disciplinas, notas e frequência
│   │   │   ├── events.py     ← Eventos pessoais e globais
│   │   │   ├── entities.py   ← Entidades acadêmicas e membros
│   │   │   └── social.py     ← Perfil público, turma, notas, salas, follows, feed
│   │   ├── core/
│   │   │   ├── config.py     ← Settings via pydantic-settings (.env)
│   │   │   ├── security.py   ← Hashing bcrypt, JWT (access + refresh)
│   │   │   └── rate_limit.py ← Rate limiting por usuário (sliding window)
│   │   ├── db/
│   │   │   └── session.py    ← Conexão psycopg2, init_db, get_db (dependency)
│   │   └── schemas/
│   │       └── schemas.py    ← Todos os Pydantic models de entrada e saída
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx           ← Roteamento geral (lazy-loaded routes)
│   │   ├── main.tsx          ← Entry point React
│   │   ├── pages/            ← Todas as telas da aplicação
│   │   ├── components/       ← Componentes reutilizáveis e de UI
│   │   ├── hooks/            ← Custom hooks React
│   │   ├── context/          ← ThemeContext
│   │   ├── store/            ← Zustand (auth state)
│   │   ├── utils/            ← Cliente API axios, dados estáticos
│   │   └── styles/           ← CSS global e enhancements
│   ├── public/               ← Favicon, manifest PWA, service worker
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
├── nginx/
│   └── nginx.conf            ← Proxy /api → backend, servir SPA React
└── docker-compose.yml
```

---

## Funcionalidades — Frontend

### Páginas

Todas as páginas autenticadas são carregadas de forma lazy (code-splitting), reduzindo o bundle inicial em ~40%.

#### `/` — Dashboard (`DashboardPage`)

Página inicial com visão geral acadêmica e ferramentas do dia a dia:

- **Stats rápidas**: contagem de boards Kanban, disciplinas ativas, eventos próximos e média geral de notas.
- **Próximos eventos**: lista de eventos das próximas 48h com badge de tipo (Prova, Deadline, etc.) e contagem regressiva.
- **Progresso do semestre**: barra configurável com datas de início/fim do semestre, salvas no `localStorage`.
- **Foco do dia**: seletor de disciplina para acompanhar o tempo de estudo diário (reseta à meia-noite).
- **Newsletter da turma**: feed de avisos, oportunidades e eventos criados por usuários com chave de moderação. Suporta tags (`aviso`, `oportunidade`, `evento`, `geral`) e imagens.
- **EvaCountdown / NervHUD**: widgets especiais do tema Evangelion que exibem contagem regressiva no estilo NERV.

#### `/kanban` — Quadro Kanban (`KanbanPage`)

Sistema completo de gerenciamento de tarefas com drag-and-drop:

- **Boards**: crie múltiplos quadros com título e cor personalizados. Ao criar, 3 colunas padrão são geradas automaticamente ("A fazer", "Em andamento", "Concluído").
- **Colunas**: adicione ou renomeie colunas. A posição é persistida no backend.
- **Cards**: cada card possui título, descrição em Markdown, prioridade (Alta/Média/Baixa), data de vencimento e checklists internos.
- **Drag-and-drop**: mova cards entre colunas e reordene usando `@dnd-kit` com `rectIntersection` para detecção de colisão.
- **Modal de edição**: edite todos os campos do card, incluindo checklists de subtarefas e atribuição de responsável.
- **Indicadores visuais**: cards vencidos ficam com borda vermelha; cards de hoje ficam destacados.
- **EXP**: ações no Kanban (criar card, mover card) concedem pontos de experiência ao jogador.

#### `/grades` — Disciplinas e Notas (`GradesPage`)

Controle acadêmico completo por disciplina:

- **Cadastro de disciplinas**: código (ex: `ACH2001`), nome, professor, semestre, cor e total de aulas.
- **Notas com peso**: adicione avaliações com valor, peso e valor máximo configuráveis. A média ponderada é calculada automaticamente.
- **Frequência**: acompanhe aulas assistidas vs. total. Alerta automático quando a frequência cai abaixo de 75%.
- **Fluxograma curricular**: visualize as 8 fases do curso de SI com indicadores de aprovação, reprovação e dependências entre disciplinas. Status calculado com base nas notas registradas.
- **Horários**: cadastre slots de aula por dia da semana com hora de início, fim e sala (salvo no `localStorage`).
- **Notas e flashcards por disciplina**: integração com o painel de notas e gerador de flashcards da `StudyPage`.
- **Modo de revisão**: ative o `ReviewMode` diretamente da página de disciplinas para sessões de flashcards.

#### `/calendar` — Calendário (`CalendarPage`)

Calendário completo com múltiplas visualizações e tipos de eventos:

- **Visualizações**: mensal (grid), semanal (timeline com grade de horas 07h–22h) e dia completo.
- **Tipos de evento**: Prova (`exam`), Deadline, Acadêmico, Pessoal, Trabalho, Entidade. Cada tipo tem cor própria.
- **Eventos globais**: eventos do tipo `is_global` são visíveis para todos os usuários (requerem chave de moderação para criação).
- **Eventos de entidade**: eventos vinculados a entidades acadêmicas, com opção `members_only` para restringir visualização a membros.
- **Eventos recorrentes**: configure `recurring: true` com `recur_weeks` para repetição semanal.
- **Eventos de horário de aula**: os slots cadastrados em Disciplinas aparecem automaticamente no calendário semanal.
- **Exportação iCal**: baixe os eventos em formato `.ics` compatível com Google Calendar e Apple Calendar.
- **Filtros**: filtre por tipo de evento, código de disciplina e entidade.
- **Lembretes push**: o hook `useEventReminders` envia notificações push (via Web Push API) antes de provas.

#### `/entities` — Entidades Acadêmicas (`EntitiesPage`)

Diretório das organizações estudantis do curso de SI da EACH:

| Entidade | Slug | Categoria |
|---|---|---|
| Diretório Acadêmico de SI | `dasi` | Acadêmica |
| EACH in the Shell | `each-in-shell` | Tech / Segurança |
| Hype — Dados & IA | `hype` | Pesquisa |
| Conway | `conway` | Games |
| CodeLab Leste | `codelab` | Tech / Web |
| Síntese Jr. | `sintese` | Empresa Júnior |
| Semana de SI | `semana-si` | Evento |
| Lab das Minas | `lab-minas` | Diversidade |
| PET-SI | `pet-si` | Pesquisa |
| GrACE | `grace` | Diversidade |

- **Entrada por chave**: entidades podem ser configuradas para exigir uma chave de acesso via variável de ambiente (`ENTITY_KEY_<SLUG>`).
- **Eventos por entidade**: membros podem criar eventos vinculados à entidade.
- **Contagem de membros**: exibe quantos usuários fazem parte de cada entidade.

#### `/profile` — Perfil (`ProfilePage`)

Perfil detalhado do usuário autenticado:

- **Dados básicos**: nome, e-mail, nº USP, data de cadastro.
- **Avatar**: upload de imagem em base64 (limite de 2 MB) ou remoção. O avatar é persistido no backend.
- **Título e área gerados por seed**: título criativo (ex.: "Caçador de Bugs") e área de interesse gerados aleatoriamente a partir do nº USP.
- **Linguagens favoritas**: seleção múltipla de linguagens de programação.
- **Estatísticas de estudo**: notas criadas, flashcards respondidos, minutos de Pomodoro e streak de dias consecutivos de estudo.
- **Nível e EXP**: exibe o nível atual, barra de progresso e total de pontos acumulados.
- **Conquistas**: grade de conquistas (comuns, raras, épicas e lendárias) com indicação de desbloqueadas/bloqueadas e dicas para desbloquear as secretas.
- **Configurações de perfil público**: opt-in para tornar o perfil visível via `/u/:nusp`, com opção de exibir disciplinas e conquistas publicamente.
- **Exportar dados**: baixe todos os seus dados (notas, eventos, disciplinas, etc.) em formato JSON.

#### `/u/:nusp` — Perfil Público (`PublicProfilePage`)

Página pública acessível sem autenticação. Exibe apenas os dados que o usuário optou por tornar públicos: bio, ano de entrada, disciplinas com médias (opcional) e conquistas (opcional).

#### `/settings` — Configurações (`SettingsPage`)

Painel de preferências globais da aplicação:

- **Aparência**: seleção de tema (picker visual com prévia de cores), tamanho de fonte (slider 12–20px), densidade da interface (compacta / confortável) e redução de animações.
- **Notificações**: ativar/desativar notificações push para lembretes de provas, modo "Não Perturbe" com horário configurável.
- **Acessibilidade**: filtros para daltonismo (protanopia, deuteranopia, tritanopia, acromatopsia) e Modo Lite (sem animações pesadas).
- **Privacidade**: controla quais dados do perfil são visíveis publicamente (bio, disciplinas, conquistas).
- **Dados**: exportar backup JSON completo, limpar cache local, reset de configurações.
- **Idioma**: seleção de idioma da interface (hook `useI18n`).
- **Teclado**: lista de atalhos de teclado disponíveis.
- **Conta**: informações da sessão atual e botão de logout.

#### `/study` — Sala de Estudos (`StudyRoomPage`)

Ambiente de foco com ferramentas de estudo integradas, organizado em abas:

- **Pomodoro**: timer configurável com fases "Foco" (25 min padrão), "Pausa curta" (5 min) e "Pausa longa" (15 min). Sons ambiente opcionais (chuva, café, floresta, ondas, ruído branco). Beep sonoro ao fim de cada sessão. Registra minutos no `useStudyStats`.
- **Flashcards**: geração automática de flashcards a partir das notas da disciplina (padrões Q:/A:, **termo** — definição, ##Heading + parágrafo). Interface de review com acerto/erro e pontuação percentual de desempenho.
- **Notas**: editor de notas com suporte Markdown-lite, vinculado à disciplina selecionada.
- **Metas**: lista de metas de estudo do dia com checkbox.
- **Sala**: criação/entrada em salas de estudo colaborativas.

#### `/room` e `/room/:code` — Salas de Estudo Persistentes (`StudyRoomPersistentPage`)

Salas colaborativas onde múltiplos usuários podem estudar juntos:

- Código de sala gerado automaticamente (ex.: `BD1-26-A3X`).
- Rastreamento de sessões com tempo de duração calculado automaticamente via coluna gerada no banco.
- Usuários online em tempo real (polling).
- Convites por nº USP.
- Histórico de sessões com duração.

#### `/turma` e `/turma/:year` — Turma (`TurmaPage`)

Agrupamento de estudantes por ano de entrada no curso:

- Lista todas as turmas com perfis públicos opt-in.
- Exibe membros da turma com ranking por número de conquistas desbloqueadas (medalhas para o top 3).
- Eventos globais associados ao ano da turma.

#### `/feed` — Feed de Atividade (`FeedPage`)

Timeline das atividades recentes de usuários da comunidade:

- Tipos de atividade: nota compartilhada, entrada em sala de estudo, criação de sala, conquista desbloqueada, novo seguidor e menção em evento.
- Clique no avatar navega para o perfil público (se disponível).

#### `/docentes` — Docentes (`DocentesPage`)

Diretório dos professores do curso de SI da EACH.

#### `/fluxogram` — Fluxograma (`FluxogramPage`)

Visualização interativa do currículo do curso de SI:

- Grade de 8 semestres com todas as disciplinas obrigatórias e optativas.
- Status visual: bloqueada (pré-requisito não cumprido), disponível, em andamento, aprovada, reprovada, aprovada com dependência (nota fraca).
- Setas de pré-requisito entre disciplinas.
- Tooltips com nome completo, código e créditos.

#### `/notes/shared/:token` — Nota Compartilhada (`SharedNotePage`)

Visualização pública de uma nota compartilhada via link (`share_token`). Não requer autenticação.

#### `/login` e `/register` — Autenticação

- **Login**: formulário com e-mail e senha. Armazena tokens JWT via Zustand com persistência em `localStorage`.
- **Registro**: validação de e-mail `@usp.br`, senha mínima de 8 caracteres e nº USP opcional.

---

### Componentes

#### `AppLayout` (`components/layout/AppLayout.tsx`)

Layout principal da aplicação autenticada:

- **Sidebar responsiva**: navegação lateral com ícones e labels. Colapsável em mobile (drawer). Inclui busca global, seletor de tema, botão de logout e barra de EXP (em temas retrô).
- **Picker de temas**: seletor visual categorizado (Essenciais, Atmosfera, Tech, Games, Super-heróis, Anime, Especial, Neon & CRT) com prévia de cores em tempo real.
- **Teclas de atalho**: `K` abre a busca global; `/` navega para disciplinas; setas de navegação em mobile.
- **Swipe navigation**: deslize horizontalmente em mobile para navegar entre páginas (hook `useInteractions`).
- **Widgets temáticos**: renderiza condicionalmente `DLCCanvas`, `BlueprintRuler`, `ShellPrompt`, `EvaSyncBar`, `PortatilSaveState` e `LofiPlayer` de acordo com o tema ativo.
- **Onboarding**: exibe fluxo de boas-vindas na primeira visita (hook `useOnboarding`).
- **Notificações push**: banner `NotificationBanner` para solicitar permissão de notificações.
- **Modo Pânico**: detecta provas nas próximas 24h e exibe `PanicBanner` com contador regressivo.
- **Conquistas**: `AchievementToast` aparece ao desbloquear novas conquistas.
- **Easter eggs**: integra `useEasterEggs` e renderiza via `EasterEggRenderer`.

#### `EvaTimer` (`components/EvaTimer.tsx`)

Dois componentes exclusivos do tema **dark-eva** (Evangelion/NERV):

- **`EvaCountdown`**: contador regressivo em fonte Orbitron com glow verde-fosforescente para um evento específico.
- **`NervHUD`**: barra flutuante no rodapé estilo HQ da NERV com relógio em tempo real e próximo evento em alerta vermelho.

#### `AchievementToast` (`components/AchievementToast.tsx`)

Toast de desbloqueio de conquista:

- No tema **light-720** (Xbox 360): popup estilizado com orbe verde, jingle de 4 notas gerado via Web Audio API e barra de progresso animada.
- Nos demais temas: toast temático com cor e emoji da conquista.
- Auto-dispara via `triggerAchievementToast()` — bus global de eventos.

#### `ExpCounter` (`components/ExpCounter.tsx`)

Sistema de XP e níveis integrado à UI:

- **`ExpBar`**: barra de progresso exibida na sidebar em temas retrô (Pixel, 720, Portátil). Mostra nível atual, EXP atual/próximo e popup "LEVEL UP!".
- **`addExp(amount, reason)`**: função global para conceder EXP de qualquer parte da aplicação.
- **`getLevel(exp)`** e **`getExpToNext(exp)`**: calculam nível e progresso com base em thresholds de 20 níveis.
- EXP concedida automaticamente ao visitar páginas (`pageVisit: 3 EXP`).

#### `PanicMode` (`components/PanicMode.tsx`)

Modo de emergência para véspera de provas:

- **`usePanicMode`**: hook que busca eventos do tipo `exam` nas próximas 24h e expõe o estado do modo pânico.
- **`PanicBanner`**: banner vermelho fixo no topo com contador regressivo até a prova, botão "Modo Pânico" e botão de dispensar (dismissal salvo no `localStorage` por dia).
- **`PanicActiveBar`**: barra fina vermelha que substitui o banner quando o modo é ativado. Ativar o Modo Pânico troca automaticamente o tema para `dark-vinganca`.

#### `GlobalSearch` (`components/GlobalSearch.tsx`)

Busca universal ativada com `⌘K` ou botão na sidebar:

- Pesquisa em tempo real em: disciplinas, cards Kanban, eventos, entidades, docentes, páginas de navegação, notas e flashcards.
- Resultados categorizados com ícone, label e cor por tipo.
- Navegação por teclado (setas + Enter).
- Suporte a easter egg: digitar "NERV", "matrix" etc. pode ativar temas ou easter eggs.

#### `NotesEditor` (`components/NotesEditor.tsx`)

Editor de notas com suporte Markdown-lite:

- Criação, edição e exclusão de notas vinculadas a disciplinas.
- Preview de Markdown em tempo real via `MiniMarkdown`.
- Compartilhamento via link público (toggle `is_public` → gera `share_token`).
- Notas sincronizadas com o backend via `/social/notes`.

#### `MiniMarkdown` (`components/MiniMarkdown.tsx`)

Renderizador leve de Markdown sem dependências externas:

- Suporte a: **negrito**, *itálico*, `código inline`, blocos de código com destaque, headings H1–H4, listas (`-` e `*`), links e separadores `---`.

#### `ReviewMode` (`components/ReviewMode.tsx`)

Interface de revisão por flashcards:

- Exibe card (frente) e permite revelar o verso.
- Botões "Acertei" / "Errei" com tracking de acertos.
- Ao final, exibe percentual de acerto e salva high score no `useStudyStats`.

#### `ColorBlindMode` (`components/ColorBlindMode.tsx`)

Filtros de acessibilidade para daltonismo:

- **`ColorBlindFilters`**: injeta filtros SVG no DOM (`protanopia`, `deuteranopia`, `tritanopia`, `achromatopsia`).
- **`ColorBlindButton`**: botão de toggle na barra de configurações.
- **`useColorBlindMode`**: hook que persiste a preferência no `localStorage`.

#### `LiteMode` (`components/LiteMode.tsx`)

Modo leve que desativa animações e efeitos visuais pesados:

- Remove transições CSS, partículas, blur e outros efeitos via `data-lite` no `<html>`.
- **`useLiteMode`**: hook com persistência em `localStorage`.
- **`LiteModeButton`**: botão de toggle.

#### `OfflineBanner` e `PWAInstallBanner` (`components/OfflineBanner.tsx`)

- **`OfflineBanner`**: detecta perda de conexão via `navigator.onLine` e exibe banner amarelo de aviso.
- **`PWAInstallBanner`**: captura o evento `beforeinstallprompt` e oferece instalação como PWA com botão de aceite/dispensa.

#### `PresentationMode` (`components/PresentationMode.tsx`)

Modo de apresentação para usar o DaSIboard em projetores/slides:

- **`usePresentationMode`**: hook que ativa fullscreen via Fullscreen API.
- **`PresentationButton`**: botão flutuante de toggle.
- **`PresentationControls`**: setas de navegação entre páginas em fullscreen.

#### `FocusMode` (`components/FocusMode.tsx`)

Modo de foco que oculta a sidebar e elementos secundários para maximizar o conteúdo.

#### `LofiPlayer` (`components/LofiPlayer.tsx`)

Player de música lofi integrado à sidebar em temas compatíveis, com controles de play/pause e volume.

#### `DLCCanvas` e `DLCLofiPlayer` (`components/DLCCanvas.tsx`)

Widgets exclusivos do tema **dark-dlc** (RGB Gaming):

- **`DLCCanvas`**: canvas animado com efeitos de partículas coloridas no background.
- **`DLCLofiPlayer`**: player de lofi estilizado com visual RGB.

#### `BlueprintRuler` (`components/BlueprintRuler.tsx`)

Régua técnica decorativa ativada no tema **light-blueprint**, simulando plantas técnicas de engenharia.

#### `ShellPrompt` (`components/ShellPrompt.tsx`)

Prompt de terminal decorativo para o tema **dark-shell**, exibindo uma linha de comando estilizada.

#### `EvaSync` (`components/EvaSync.tsx`)

Barra de sincronização estilizada exclusiva do tema **dark-eva**, simulando o progresso de sincronização dos EVAs de Evangelion.

#### `PortatilSaveState` (`components/PortatilSaveState.tsx`)

Indicador de save state estilizado como Game Boy para o tema **light-portatil**, com animação de salvar ao persistir dados.

#### `ThemeCursor` (`components/ThemeCursor.tsx`)

- **`ThemeCursorStyle`**: injeta estilos de cursor personalizados por tema (crosshair no Blueprint, cursor de terminal no Shell, etc.).
- **`GlowCursor`**: cursor com efeito de glow que segue o mouse em temas especiais.

#### `DasiLogo` (`components/DasiLogo.tsx`)

SVG do logotipo do DaSIboard, utilizado no header e splash screen.

#### `Onboarding` (`components/onboarding/Onboarding.tsx`)

Fluxo de boas-vindas para novos usuários:

- Apresenta os módulos principais (Kanban, Disciplinas, Calendário).
- Marcado como concluído no `localStorage` após a primeira vez.
- Ativado via hook `useOnboarding`.

#### `StudyMode` (`components/study/StudyMode.tsx`)

Overlay de modo de estudo acessível pela sidebar, com Pomodoro compacto e lista de notas recentes.

---

### Hooks e Utilitários

#### `useAuthStore` (`store/authStore.ts`)

Store Zustand com persistência (`localStorage`) para autenticação:

- **Estado**: `accessToken`, `refreshToken`, `user`
- **Ações**: `setTokens(access, refresh)`, `setUser(user)`, `logout()`

#### `api` (`utils/api.ts`)

Cliente Axios pré-configurado:

- Base URL: `/api` em produção (proxy Nginx); `VITE_API_URL` em desenvolvimento.
- **Interceptor de request**: injeta `Authorization: Bearer <token>` automaticamente.
- **Interceptor de response 401**: tenta refresh token silencioso; em caso de falha, desloga o usuário e redireciona para `/login`.

#### `useTheme` / `ThemeProvider` (`context/ThemeContext.tsx`)

Contexto global de temas:

- **`setTheme(id)`**: altera o tema ativo, aplica `data-theme` no `<html>` e persiste em `localStorage`.
- **`cycleTheme()`**: cicla pelo próximo tema da mesma categoria (claro/escuro).
- **`toggleDarkLight()`**: alterna entre os temas base claro e escuro.
- **Chrono Trigger**: o tema `dark-chrono` possui sub-eras (Pré-história, Era das Trevas, Era Média, Futuro Sombrio, Fim dos Tempos) que rotacionam automaticamente a cada navegação de página, disparando o evento customizado `chrono:era-change`.

#### `useEasterEggs` (`hooks/useEasterEggs.tsx`)

Sistema de easter eggs ativados por sequências de teclado:

- **Konami Code** (`↑↑↓↓←→←→BA`): exibe tela animada estilo SNES no tema Pixel; play de jingle de 8-bit.
- **`triggerEasterEgg(id)`**: aciona um easter egg específico programaticamente.
- **`useExternalEasterEgg`**: permite ativar easter eggs a partir de componentes externos (ex.: GlobalSearch).
- **`useClockEasterEggs`**: ativa easter eggs baseados em horários especiais do relógio.
- **`EasterEggRenderer`**: renderiza o overlay do easter egg ativo.

#### `useAudioEasterEggs` (`hooks/useAudioEasterEggs.ts`)

Sons de easter eggs gerados via Web Audio API:

- **`playKonamiJingle()`**: jingle de 8-bit ao ativar o Konami Code.
- **`playModemNoise()`**: som de modem discado para easter eggs retrô.

#### `useChronoPortal` (`hooks/useChronoPortal.ts`)

Escuta o evento `chrono:era-change` e reproduz o som de portal do Chrono Trigger via Web Audio API ao mudar de era no tema `dark-chrono`.

#### `useStudyStats` (`hooks/useStudyStats.ts`)

Rastreamento de estatísticas de estudo persistidas em `localStorage`:

- **`recordStudyEvent(event)`**: registra `note_created`, `flashcard_answered`, `pomodoro_completed` e `high_score`.
- **`useStudyStats()`**: hook React que retorna as stats e atualiza o streak de dias consecutivos ao montar.
- Campos: `notesCreated`, `flashcardsAnswered`, `flashcardsCorrect`, `pomodoroMinutes`, `streak`, `sessionDates`.

#### `useNotes` (`hooks/useNotes.ts`)

Gerenciamento de notas em `localStorage` com geração de flashcards:

- **`useNotes()`**: CRUD de notas por disciplina ou evento.
- **`generateFlashcards(note)`**: extrai pares pergunta/resposta de notas em Markdown-lite:
  - Padrão `Q: ... A: ...`
  - Padrão `## Heading` → heading como frente, próximo parágrafo como verso
  - Padrão `**termo** — definição`
- **`createReviewSession(flashcards)`**: embaralha os flashcards para sessão de revisão.

#### `useNotifications` (`hooks/useNotifications.ts`)

Sistema de notificações in-app com suporte a modo "Não Perturbe":

- **`emitNotification(message)`**: dispara uma notificação na interface.
- **`setDnd(until)`** e **`getDndUntil()`**: configuram o período de silêncio.

#### `usePushNotifications` (`hooks/usePushNotifications.tsx`)

Integração com a Web Push API do navegador:

- **`requestPushPermission()`**: solicita permissão ao usuário.
- **`useEventReminders(events)`**: agenda notificações push 24h e 1h antes de provas.
- **`NotificationBanner`**: banner que oferece ativar notificações push.

#### `useSettings` (`hooks/useSettings.ts`)

Gerenciamento de preferências globais com aplicação imediata de CSS:

- Controla `fontSize` (CSS var `--app-font-size`), `density` (`data-density` no `<html>`) e `reducedMotion`.
- **`update(key, value)`**: persiste e aplica imediatamente.
- **`setPending(key, value)` + `commit()`**: padrão em dois passos para sliders (evita re-renders a cada tick).

#### `useStudyRoom` (`hooks/useStudyRoom.ts`)

Estado da sala de estudo ativa: código da sala, usuários online (polling), sessão atual.

#### `useInteractions` (`hooks/useInteractions.tsx`)

- **`useSwipeNavigation()`**: detecta swipe horizontal em dispositivos touch e navega para a página anterior/próxima.
- **`useKeyboardShortcuts()`**: registra atalhos globais de teclado (ex.: `K` para busca, `T` para trocar tema).

#### `useDashboardWidgets` (`hooks/useDashboardWidgets.ts`)

Gerencia a ordem e visibilidade dos widgets do Dashboard, com suporte a fixar/desafixar e reordenar.

#### `useI18n` (`hooks/useI18n.ts`)

Internacionalização da interface com suporte a múltiplos idiomas. Persiste a preferência em `localStorage`.

#### `entityData` e `entityIcons` (`utils/entityData.ts`, `utils/entityIcons.ts`)

Dados estáticos e mapeamento de ícones das entidades acadêmicas usados nos componentes de listagem.

---

### Sistema de Temas

O DaSIboard possui **34 temas visuais** organizados em 8 grupos, aplicados via atributo `data-theme` no elemento `<html>`:

| Grupo | Temas |
|---|---|
| **Essenciais** | Dark (roxo profundo), Light (roxo suave) |
| **Atmosfera** | Hypado (Vaporwave), Minas (Dinos), K7 (Cassette 80s), Café (Livraria), Sakura (Primavera japonesa) |
| **Tech** | Shell (CLI/Matrix), Blueprint (Plantas técnicas), Laboratório (Y2K Pink), Papiro (Caderno milimetrado) |
| **Games** | DLC (RGB Gaming), Pixel (SNES/NES), 720 (Xbox 360), Ilha (Kingdom Hearts), Portátil (Game Boy), Stardew, Cubo (Minecraft) |
| **Super-heróis** | Aranha (Spider-Man), Punkrock (Superman), Vingança (Batman TAS) |
| **Anime** | Eva (Evangelion/NERV), Memento (Persona), Chrono (Chrono Trigger com 5 eras) |
| **Especial** | Holográfico (Iridescente), Vidro (Glassmorphism), Aqua (Windows XP Luna), USP Oficial, Colina (Silent Hill) |
| **Neon & CRT** | 2077 (Cyberpunk), Matrix (Terminal verde), CRT (Monitor âmbar IBM 70s) |

Cada tema altera variáveis CSS (`--bg-primary`, `--accent-3`, `--text-primary`, etc.), pode ativar widgets exclusivos e possui cursores e efeitos sonoros próprios.

---

### Gamificação

#### Sistema de EXP e Níveis

O DaSIboard gamifica o uso acadêmico com um sistema de XP inspirado em RPGs:

| Ação | EXP |
|---|---|
| Visitar uma página | +3 |
| Criar um card Kanban | +20 |
| Mover um card | +8 |
| Adicionar uma nota (avaliação) | +15 |
| Cadastrar uma disciplina | +25 |
| Aprovação em disciplina | +80 |
| Criar evento | +20 |
| Criar evento global | +40 |
| Sessão Pomodoro completa | +12 |
| Criar nota escrita | +10 |
| Entrar em entidade | +30 |
| Definir avatar | +25 |
| Login do dia (bônus diário) | +50 |
| Desbloquear conquista | +35 |
| Ativar easter egg | +150 |
| Streak de 7 dias | +100 |

Há 20 níveis com thresholds progressivos (80 EXP no nível 1 → 44.000 EXP no nível 20). A barra de EXP é visível nos temas **Pixel**, **720** e **Portátil**.

#### Conquistas

Sistema de conquistas persistidas no backend (`user_achievements`) com 4 raridades:

| Raridade | Cor |
|---|---|
| Comum | Cinza |
| Raro | Azul |
| Épico | Roxo |
| Lendário | Dourado |

Categorias: Perfil, Acadêmico, Organização, Comunidade, Secretas e Sistema.

---

### Easter Eggs

- **Konami Code** (`↑↑↓↓←→←→BA`): ativa tela animada retro com jingle de 8-bit.
- **Easter eggs de horário**: efeitos especiais em horários específicos do dia.
- **Easter eggs via busca global**: digitar certas palavras na busca aciona easter eggs ou troca de tema.
- **Chrono Portal**: ao navegar entre páginas no tema Chrono Trigger, um som de portal é reproduzido.
- **Sons de modem**: easter egg retrô inspirado nos modems dial-up.

---

## API Backend

Toda a API é servida em `/api`. Em `APP_ENV=development`, a documentação interativa Swagger está disponível em `/api/docs`.

### Autenticação (`/auth`)

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/auth/register` | Cadastro. Requer e-mail `@usp.br` e senha ≥ 8 chars. Retorna `UserOut`. |
| `POST` | `/auth/login` | Login via OAuth2 Password Flow. Retorna `access_token` + `refresh_token`. |
| `POST` | `/auth/refresh` | Troca `refresh_token` por novo par de tokens. |
| `GET` | `/auth/me` | Retorna dados do usuário autenticado. |

**`get_current_user(token, db)`** — dependency injetável em todas as rotas protegidas: decodifica o JWT, valida o tipo `access` e busca o usuário no banco. Retorna HTTP 401 em caso de token inválido ou usuário inativo.

### Usuários (`/users`)

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/users/me` | Retorna o perfil do usuário autenticado. |
| `PATCH` | `/users/me/avatar` | Atualiza o avatar (base64, máx. 2 MB). |
| `GET` | `/users/me/achievements` | Lista todas as conquistas desbloqueadas. |
| `POST` | `/users/me/achievements` | Desbloqueia uma ou mais conquistas (idempotente). |

### Kanban (`/kanban`)

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/kanban/boards` | Lista todos os boards do usuário com colunas e cards aninhados. |
| `POST` | `/kanban/boards` | Cria board com título e cor. Gera automaticamente 3 colunas padrão. |
| `DELETE` | `/kanban/boards/{board_id}` | Remove board e todo seu conteúdo (CASCADE). |
| `POST` | `/kanban/boards/{board_id}/columns` | Adiciona coluna a um board. |
| `POST` | `/kanban/columns/{column_id}/cards` | Cria card em uma coluna. |
| `PATCH` | `/kanban/cards/{card_id}` | Atualiza card (inclui mover para outra coluna via `column_id`). |
| `DELETE` | `/kanban/cards/{card_id}` | Remove card. |

**`_board_with_cols(db, board_id)`** — helper interno que monta o objeto board com colunas e cards aninhados em uma única operação.

### Disciplinas e Notas (`/grades`)

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/grades/subjects` | Lista disciplinas com notas aninhadas. |
| `POST` | `/grades/subjects` | Cadastra disciplina (rate-limitado: 60/min). |
| `PATCH` | `/grades/subjects/{id}` | Atualiza frequência, professor ou cor. |
| `DELETE` | `/grades/subjects/{id}` | Remove disciplina e notas (CASCADE). |
| `POST` | `/grades/subjects/{id}/grades` | Adiciona avaliação com valor, peso e valor máximo. |
| `DELETE` | `/grades/grades/{grade_id}` | Remove avaliação. |

### Eventos (`/events`)

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/events/` | Lista eventos pessoais + eventos das entidades do usuário + eventos globais, com filtros de data, tipo e código de disciplina. |
| `POST` | `/events/` | Cria evento pessoal ou global (requer header `X-Global-Key`). |
| `PATCH` | `/events/{id}` | Atualiza evento pessoal ou global. |
| `DELETE` | `/events/{id}` | Remove evento pessoal ou global. |

Eventos globais ficam em tabela separada (`global_events`) e são visíveis para todos. Eventos de entidade podem ter `members_only: true`.

### Entidades (`/entities`)

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/entities/` | Lista todas as entidades com contagem de membros e flag `is_member`. |
| `GET` | `/entities/{slug}` | Detalhes de uma entidade. |
| `POST` | `/entities/{slug}/join` | Entra na entidade. Requer `key` se a entidade for privada. |
| `POST` | `/entities/{slug}/leave` | Sai da entidade. |
| `GET` | `/entities/{slug}/events` | Lista eventos da entidade (filtra `members_only` para não-membros). |
| `POST` | `/entities/{slug}/events` | Cria evento da entidade (apenas membros). Rate-limitado: 10/10 min. |
| `GET` | `/entities/{slug}/members` | Lista membros da entidade. |

### Social (`/social`)

#### Perfil público

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/social/profile/settings` | Retorna configurações de perfil público do usuário. |
| `PATCH` | `/social/profile/settings` | Atualiza bio, ano de entrada e preferências de privacidade. |
| `GET` | `/social/u/{nusp}` | Perfil público por nº USP (sem auth). Inclui disciplinas e conquistas opcionais. |

#### Turma

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/social/turma` | Lista todas as turmas com perfis públicos. |
| `GET` | `/social/turma/{year}` | Membros e eventos de uma turma por ano. |

#### Notas

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/social/notes` | Lista notas do usuário com preview (200 chars). |
| `POST` | `/social/notes` | Cria nota. Se `is_public=true`, gera `share_token`. |
| `GET` | `/social/notes/{id}` | Retorna nota completa do usuário. |
| `PATCH` | `/social/notes/{id}` | Atualiza nota. |
| `DELETE` | `/social/notes/{id}` | Remove nota. |
| `GET` | `/social/shared-note/{token}` | Retorna nota pública por token (sem auth). |

#### Salas de Estudo

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/social/rooms` | Lista salas criadas ou com convite para o usuário. |
| `POST` | `/social/rooms` | Cria sala com código gerado automaticamente. |
| `GET` | `/social/rooms/{code}` | Detalhes da sala com sessões e convites. |
| `POST` | `/social/rooms/{code}/join` | Entra na sala (cria sessão). |
| `POST` | `/social/rooms/{code}/leave` | Sai da sala (fecha sessão, calcula duração). |
| `POST` | `/social/rooms/{code}/invite` | Convida usuário por nº USP. |
| `GET` | `/social/rooms/{code}/online` | Lista usuários online na sala agora. |

#### Follows e Feed

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/social/follow/{nusp}` | Segue um usuário. |
| `DELETE` | `/social/follow/{nusp}` | Para de seguir. |
| `GET` | `/social/feed` | Feed de atividades recentes dos usuários da comunidade. |

---

## Segurança

### Autenticação JWT

- **Access token**: expiração de 30 minutos (configurável via `ACCESS_TOKEN_EXPIRE_MINUTES`).
- **Refresh token**: expiração de 7 dias (configurável via `REFRESH_TOKEN_EXPIRE_DAYS`).
- Ambos usam `type: "access"` / `type: "refresh"` no payload para impedir uso cruzado.
- Algoritmo: HS256. Segredo configurável via `JWT_SECRET_KEY`.
- Senhas hasheadas com bcrypt (via `passlib`).

### Rate Limiting

Rate limiting in-memory por usuário com janela deslizante. Para ambientes multi-processo, substituir por Redis.

| Ação | Limite |
|---|---|
| Criação de evento pessoal | 20 / 5 minutos |
| Criação de evento global | 5 / hora |
| Criação de evento de entidade | 10 / 10 minutos |
| Mutações de notas/disciplinas | 60 / minuto |
| Newsletter | 3 / hora |

### Restrição de domínio

Apenas e-mails `@usp.br` são aceitos no cadastro (validado no schema Pydantic `RegisterRequest`).

### Chaves de entidade e eventos globais

- A criação/edição de eventos globais requer o header `X-Global-Key` com o valor de `GLOBAL_EVENTS_KEY`.
- Entidades privadas requerem chave de acesso via variável de ambiente `ENTITY_KEY_<SLUG>`.

---

## Banco de Dados

O schema é criado automaticamente na primeira inicialização via `database/init.sql`. Para deployments existentes, aplicar as migrações:

```bash
docker compose exec db psql -U dasiboard dasiboard < database/migrate_v2.sql
docker compose exec db psql -U dasiboard dasiboard < database/migrate_social.sql
```

### Tabelas principais

| Tabela | Descrição |
|---|---|
| `users` | Usuários. UUID PK. Campos de perfil público, bio, ano de entrada. |
| `kanban_boards` | Quadros Kanban por usuário. |
| `kanban_columns` | Colunas dos boards, ordenadas por `position`. |
| `kanban_cards` | Cards com prioridade, deadline e `updated_at` atualizado por trigger. |
| `subjects` | Disciplinas por usuário com frequência (`total_classes` / `attended`). |
| `grades` | Avaliações com valor, peso e valor máximo. |
| `entities` | Entidades acadêmicas seedadas no `init.sql`. |
| `entity_members` | Relação N:N usuário↔entidade com `UNIQUE(entity_id, user_id)`. |
| `events` | Eventos pessoais e de entidade, com `members_only`. |
| `global_events` | Eventos visíveis para todos os usuários. |
| `notes` | Notas escritas com `share_token` para compartilhamento público. |
| `study_rooms` | Salas de estudo com código gerado. |
| `study_room_sessions` | Sessões por sala com `duration_min` calculado como coluna gerada. |
| `study_room_invites` | Convites por nº USP. |
| `user_achievements` | Conquistas desbloqueadas por usuário (idempotente). |
| `user_follows` | Relação de follows entre usuários. |

**Triggers:**

- `trg_users_updated_at`: atualiza `users.updated_at` a cada `UPDATE`.
- `trg_kanban_cards_updated_at`: atualiza `kanban_cards.updated_at` a cada `UPDATE`.

Para inspecionar o banco manualmente:

```bash
docker compose exec db psql -U dasiboard dasiboard
```

---

## Deploy no DigitalOcean

### 1. Crie o Droplet

- OS: **Ubuntu 22.04 LTS**
- Plano: **Basic — 2 vCPU / 4 GB RAM** (mínimo recomendado)
- Adicione sua chave SSH pública

### 2. Configure o servidor (uma única vez)

```bash
# Conecte via SSH
ssh root@SEU_IP_DO_DROPLET

# Instale Docker e Docker Compose
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin

# Crie o diretório do projeto
mkdir -p /opt/dasiboard
```

### 3. Clone o repositório no servidor

```bash
cd /opt/dasiboard
git clone https://github.com/alexzjss/dasiboard-omg.git .
```

### 4. Crie o arquivo `.env`

```bash
cp .env.example .env
nano .env
```

Preencha todos os campos. Para gerar segredos criptograficamente seguros:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 5. Suba a aplicação

```bash
docker compose up -d --build
```

O PostgreSQL criará o schema automaticamente via `database/init.sql`.

Verifique:

```bash
docker compose ps                  # todos os containers devem estar "Up"
curl http://localhost/health       # deve retornar {"status":"ok"}
```

Acesse: **http://SEU_IP_DO_DROPLET**

### 6. Configure o CI/CD (opcional — deploy automático)

No GitHub: **Settings → Secrets → Actions → New repository secret**

| Secret | Valor |
|---|---|
| `DO_HOST` | IP do Droplet |
| `DO_USER` | `root` |
| `DO_SSH_KEY` | Conteúdo da chave privada SSH |

Todo `git push origin main` realizará o deploy automaticamente.

---

## Desenvolvimento Local

```bash
# 1. Clone o repositório
git clone https://github.com/alexzjss/dasiboard-omg.git
cd dasiboard-omg

# 2. Crie o .env
cp .env.example .env
# Edite: APP_ENV=development, ALLOWED_ORIGINS=http://localhost

# 3. Suba tudo com Docker Compose
docker compose up --build

# Acesse: http://localhost
# Docs Swagger: http://localhost/docs  (apenas APP_ENV=development)
```

Para desenvolvimento do frontend com hot-reload:

```bash
cd frontend
npm install
npm run dev
# Acesse: http://localhost:5173
# Configure VITE_API_URL=http://localhost/api no .env.local
```

---

## Variáveis de Ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `APP_ENV` | `development` | `development` habilita `/docs` (Swagger). Use `production` em produção. |
| `APP_SECRET_KEY` | `changeme` | Segredo geral da aplicação. |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Origins permitidas pelo CORS (JSON array ou lista separada por vírgula). |
| `POSTGRES_HOST` | `db` | Host do PostgreSQL (nome do serviço Docker). |
| `POSTGRES_PORT` | `5432` | Porta do PostgreSQL. |
| `POSTGRES_DB` | `dasiboard` | Nome do banco de dados. |
| `POSTGRES_USER` | `dasiboard` | Usuário do banco. |
| `POSTGRES_PASSWORD` | `changeme` | Senha do banco. |
| `JWT_SECRET_KEY` | — | Segredo para assinar tokens JWT (mín. 32 chars). Em `production` é obrigatório e não pode ser valor inseguro. |
| `JWT_ALGORITHM` | `HS256` | Algoritmo JWT. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Expiração do access token em minutos. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Expiração do refresh token em dias. |
| `GLOBAL_EVENTS_KEY` | `changeme-global-key` | Chave para criar/editar eventos globais via `X-Global-Key`. |
| `ENTITY_KEY_DASI` | — | Chave de acesso para a entidade `dasi` (deixar vazio = aberta). |
| `ENTITY_KEY_EACH_IN_SHELL` | — | Chave para `each-in-shell`. |
| `ENTITY_KEY_HYPE` | — | Chave para `hype`. |
| `ENTITY_KEY_CONWAY` | — | Chave para `conway`. |
| `ENTITY_KEY_CODELAB` | — | Chave para `codelab`. |
| `ENTITY_KEY_SINTESE` | — | Chave para `sintese`. |
| `ENTITY_KEY_SEMANA_SI` | — | Chave para `semana-si`. |
| `ENTITY_KEY_LAB_MINAS` | — | Chave para `lab-minas`. |
| `ENTITY_KEY_PET_SI` | — | Chave para `pet-si`. |
| `ENTITY_KEY_GRACE` | — | Chave para `grace`. |

---

## Licença

MIT © EACH USP — Sistemas de Informação
