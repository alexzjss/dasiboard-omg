# Plano de melhorias: login persistente, identidade visual e responsividade

**Data:** 2026-10-19
**Decisões tomadas:** sessão deslizante · direção "Espacial refinado" · sidebar no PC / bottom nav no celular · dividir `App.tsx` + rotas reais · modo claro · endurecer segurança.

---

## 1. Diagnóstico da revisão

### Bloqueador imediato
- **O app não compila no estado atual.** `src/assets/logo.png` foi apagado (mudança não commitada), mas `src/App.tsx:5` ainda faz `import appLogo from './assets/logo.png'`. O Vite falha com "Failed to resolve import". Existe uma cópia em `public/logo.png`.

### Login / sessão
- O servidor já usa cookie httpOnly com JWT (`server/index.ts`), mas o token tem **validade fixa de 7 dias** e nunca é renovado: quem usa o app todo dia é deslogado no 8º dia.
- O front mostra o usuário em cache (`localStorage orbe_user`) e depois chama `/api/auth/me`. Se a sessão expirou, o dashboard aparece e **logo some para a tela de login** (piscada).
- Uma falha de rede no `/api/auth/me` mantém o usuário em cache, mas qualquer chamada seguinte retorna 401 sem tratamento: a tela fica "logada" porém quebrada.
- `logout()` não limpa `orbe_schedule_<email>` nem o onboarding; não trata erro do fetch.
- `/api/schedule/jupiter` não exige sessão fora de produção (`requireSessionInProduction`), e não há limite de tentativas no login nem no Jupiter (que recebe senha).

### Código
- `src/App.tsx` tem 1910 linhas: dados (disciplinas, docentes, entidades), componentes, canvas e roteamento por `useState('Início')`. Sem URLs: o botão voltar do navegador sai do app, e não dá para compartilhar `/disciplinas`.
- Prop drilling: `activeTab`/`onSelectTab` passam por todas as views só para renderizar a `BottomNav` dentro de cada uma.
- Mudança pendente em `App.css`: `z-index: 9999 !important` na bottom nav. É um sintoma de falta de escala de z-index.

### Design / consistência
- **Sem design tokens:** 167 cores hexadecimais soltas em `App.css`, 10+ valores de `border-radius` (2, 8, 10, 12, 14, 16, 22, 28, 999px), 8 intensidades diferentes de `backdrop-filter: blur`, 27 `box-shadow` distintos.
- **Cara de "feito por IA":** cartões de vidro com blur em tudo, pontinho colorido no fim dos títulos (`Bom dia, Alex.`, `Grade horária.`), eyebrow em caixa alta acima de todo título, pílulas de status genéricas, roxo `#b3a0ff` como único acento. É o mesmo vocabulário de qualquer template de dashboard.
- `index.css` e `App.css` redefinem as mesmas regras globais (`box-sizing`, `html/body`, `button`); `index.css` define a cor de texto `#26202f` (escura) em um app escuro.
- Breakpoints inconsistentes: 480, 520, 600, 840 e 1024px, cada seção com o seu.
- No desktop, o conteúdo se estica até 1500px+ (cartões de aula com uma linha vazia enorme) e a bottom nav flutua no meio da tela.
- Botão de notificação sem função; botão de data ("23 set") sem ação.

---

## 2. Fase 0: Restaurar o build (≈15 min)

1. Trocar o import em `src/App.tsx:5` para usar `public/logo.png` (`const appLogo = '/logo.png'`) **ou** restaurar o arquivo com `git checkout -- src/assets/logo.png`. Preferência: usar `public/`, já que o arquivo foi apagado de propósito.
2. Remover o `!important` e o `z-index: 9999` da bottom nav (será resolvido pela escala de z-index na Fase 4).
3. Rodar `npm run build` e `npm run lint` e commitar.

**Pronto quando:** `npm run build` passa e `/dev/home` abre no navegador.

---

## 3. Fase 1: Login persistente com sessão deslizante

### Servidor (`server/index.ts`)
1. Validade do JWT: `7d` → `30d`; `maxAge` do cookie igual.
2. Renovação deslizante em `requireSession`: se o token tiver mais de 24h de emitido (`iat`), assinar um novo e regravar o cookie. Toda requisição autenticada empurra a expiração para +30 dias.
3. Incluir no payload `sid` (id aleatório) e `v: 1` (versão do formato) para invalidar todos os tokens no futuro trocando a versão, sem precisar trocar o `SESSION_SECRET`.
4. `/api/auth/me` passa a responder `{ user, expiresAt }`.
5. Marcar cookie `secure` sempre que `req.secure` (não só `NODE_ENV === 'production'`), para que deploys de preview na Vercel funcionem igual.

### Cliente
1. Criar `src/auth/AuthProvider.tsx` com contexto `{ status: 'checking' | 'authenticated' | 'anonymous', user, login, logout }`.
2. Boot sem piscada: com usuário em cache, renderizar o dashboard **em modo otimista**, mas só trocar para login se `/me` responder 401 explicitamente. Em erro de rede, manter o cache e mostrar um aviso discreto "offline".
3. Criar `src/lib/api.ts` (`apiFetch`) com `credentials: 'include'` e tratamento central de 401: limpa o cache e leva para o login com a mensagem "Sua sessão expirou, entre novamente".
4. Revalidar a sessão quando a aba volta ao foco (`visibilitychange`), no máximo uma vez a cada 10 min. Isso também dispara a renovação deslizante.
5. Substituir a tela vazia `auth-loading` por um splash com o logo (só aparece no primeiro acesso, sem cache).

**Pronto quando:** fazer login, fechar o navegador, reabrir dias depois → entra direto. Token adulterado/expirado → login com mensagem, sem piscar o dashboard.

---

## 4. Fase 2: Endurecer segurança

1. `/api/schedule/jupiter`: trocar `requireSessionInProduction` por `requireSession`. Para dev, a rota `/dev/home` continua funcionando com dados de exemplo.
2. Rate limit em memória por IP + usuário: `POST /api/auth/google` (10/min) e `POST /api/schedule/jupiter` (5/10 min). Na Vercel o limite é por instância; documentar isso no README.
3. `logout`: limpar `orbe_user`, `orbe_schedule_*` e estado em memória; tratar falha do fetch (desloga localmente mesmo assim).
4. Garantir que a senha do Jupiter nunca vai para logs (`console.error(error)` hoje pode imprimir a mensagem de erro do Jupiter; registrar só o tipo do erro).
5. Cabeçalhos básicos no Express: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` (sem dependência nova).

---

## 5. Fase 3: Dividir `App.tsx` e adicionar rotas

### Estrutura alvo
```
src/
  main.tsx
  app/            App.tsx, routes.tsx, AppLayout.tsx (sidebar/bottom nav + <Outlet/>)
  auth/           AuthProvider.tsx, LoginScreen.tsx
  lib/            api.ts, storage.ts, date.ts
  components/     Icon.tsx, Avatar.tsx, UserMenu.tsx, SpaceCanvas.tsx, Onboarding.tsx, PageTransition.tsx
  features/
    home/         HomePage.tsx, ScheduleBoard.tsx, JupiterImportForm.tsx, useSchedule.ts
    disciplinas/  DisciplinasPage.tsx, DisciplinasGraph.tsx, data.ts
    docentes/     DocentesPage.tsx, data.ts
    entidades/    EntidadesPage.tsx, InstagramEmbed.tsx, data.ts
    perfil/       PerfilPage.tsx
  styles/         tokens.css, base.css, + um .css por feature
```

### Passos
1. Mover sem mudar comportamento, um arquivo por commit, começando pelos dados (maior volume, risco zero).
2. Adicionar `react-router-dom` (v7, modo biblioteca). Rotas: `/`, `/disciplinas`, `/docentes`, `/entidades`, `/entidades/:slug`, `/perfil`, `/entrar`. `/dev/home` vira um flag que injeta o usuário de dev.
3. `AppLayout` renderiza a navegação **uma vez**; as views deixam de receber `activeTab`/`onSelectTab`.
4. `vercel.json`: adicionar rewrite de SPA para tudo que não começa com `/api`.
5. `useSchedule(user)` concentra cache local + `/api/schedule` + importação do Jupiter (hoje espalhado no `Dashboard`).

**Pronto quando:** nenhum arquivo passa de ~400 linhas, voltar/avançar do navegador funciona, recarregar em `/docentes` abre `/docentes`.

---

## 6. Fase 4: Design tokens e modo claro

1. Criar `src/styles/tokens.css` com variáveis CSS e substituir os valores soltos:
   - **Cor:** `--bg`, `--surface-1/2/3`, `--line`, `--text`, `--text-muted`, `--accent`, `--accent-2`, `--danger`, `--ok`. Uma cor de acento por área (Início, Disciplinas, Docentes, Entidades) que já existe no `SpaceCanvas`, agora em token.
   - **Raio:** só 3 valores, `--r-sm 6px`, `--r-md 12px`, `--r-pill 999px`.
   - **Espaço:** escala de 4px (`--s-1` … `--s-8`).
   - **Sombra/blur:** 2 níveis de elevação; blur só na navegação e em modais.
   - **Z-index:** `--z-canvas 0`, `--z-content 1`, `--z-nav 30`, `--z-menu 40`, `--z-modal 50`.
   - **Breakpoints** (documentados, usados em todo lugar): `640px` (celular → tablet) e `1024px` (tablet → desktop).
2. Modo claro: tokens redefinidos em `[data-theme="light"]` e em `@media (prefers-color-scheme: light)` quando o usuário não escolheu. Seletor Sistema / Claro / Escuro no Perfil, salvo em `localStorage`. No claro, o `SpaceCanvas` vira um "céu diurno": partículas escuras e muito sutis, sem nebulosa.
3. Unificar `index.css` e o bloco global de `App.css` em `base.css`; corrigir a cor de texto do `:root`.
4. Contraste AA nos dois temas (o `--text-muted` atual `#7e899d` sobre `#080b12` passa, mas os textos em `#9a91a5` sobre cartões não).

---

## 7. Fase 5: Identidade "Espacial refinado"

Objetivo: manter o universo cósmico, mas com elementos que só o daSIboard tem, e cortar os clichês de template.

### Remover
- Glassmorphism em todos os cartões: cartões passam a ser superfícies sólidas `--surface-1` com borda de 1px. O blur fica só na nav.
- O ponto colorido no fim de todo título, e o eyebrow em caixa alta acima de todo título (manter só na saudação).
- Pílulas de status genéricas ("Agora", "Próxima", "Depois").
- Botões sem função (sino, data). Voltam só quando tiverem ação.

### Criar
- **Grade como órbita do dia (Início):** em vez de cartões em lista, uma linha do tempo horizontal de 07h a 23h com um marcador "agora" que se move. As aulas são segmentos sobre a linha; a aula atual "brilha". No celular a linha fica vertical. A grade semanal vira um mapa compacto 5 colunas × horários.
- **Constelação de disciplinas:** o `DisciplinasGraph` já liga pré-requisitos. Desenhar as disciplinas como estrelas (tamanho = créditos) e os pré-requisitos como linhas de constelação, por semestre, no lugar de caixas com setas.
- **Coordenadas como tipografia:** códigos (ACH2023), horários e salas em fonte mono (JetBrains Mono ou IBM Plex Mono), como coordenadas de um mapa estelar. Títulos continuam em Manrope e corpo em DM Sans.
- **Cor por área:** cada aba tem a sua "nebulosa" (já existe no canvas); o mesmo acento passa a marcar o item ativo da navegação, links e foco dessa área.
- **Ícone de navegação próprio:** o item ativo ganha um pequeno anel orbital em vez do fundo de pílula.
- **Login:** tirar o efeito parallax do painel; logo grande, um planeta/órbita desenhado em SVG com o canvas, e o botão Google. Mensagem curta e específica da EACH.
- **Microcopy:** revisar os textos para a voz do DASI (informal, direta, sem "Seu campus, mais perto").

### Movimento
- Manter transições de página, reduzir para 150 a 200ms, e respeitar `prefers-reduced-motion` também no `SpaceCanvas` (hoje só o CSS respeita).

---

## 8. Fase 6: Layout responsivo (celular e PC)

| Largura | Navegação | Conteúdo |
|---|---|---|
| < 640px | Bottom nav fixa (sem esconder ao rolar no iOS, onde atrapalha); alvos de toque ≥ 44px | 1 coluna, margem 16px |
| 640 a 1023px | Bottom nav | 2 colunas onde fizer sentido (grade + próximas aulas) |
| ≥ 1024px | **Sidebar fixa** de 240px à esquerda: logo, 4 seções, perfil e tema no rodapé. Recolhível para 72px (só ícones) | Largura máxima de leitura de 1200px, centralizada na área restante |

Detalhes:
- Topbar só no celular/tablet; no desktop o perfil fica na sidebar.
- `UserMenu` vira bottom sheet no celular e popover ancorado no desktop.
- Docentes: tabela no desktop, lista de cartões no celular (hoje é a mesma estrutura apertada).
- Entidades: grade de logos com 2/3/4 colunas por breakpoint; o detalhe abre em `/entidades/:slug` (sheet no celular, painel lateral no desktop).
- Testar em 375, 768, 1280 e 1920px.

---

## 9. Ordem, dependências e verificação

```
Fase 0 (build) → Fase 1 (sessão) → Fase 2 (segurança)
              ↘ Fase 3 (dividir + rotas) → Fase 4 (tokens + tema) → Fase 5 (identidade) → Fase 6 (responsivo)
```
Fases 1–2 (servidor/auth) e Fase 3 (estrutura do front) podem andar em paralelo, mas o `AuthProvider` da Fase 1 deve entrar na estrutura nova; fazer a Fase 1 do cliente depois da Fase 3 evita retrabalho.

### Testes a adicionar (vitest + testing-library, já instalados)
- Servidor: `requireSession` renova o cookie quando `iat` > 24h e não renova antes; token inválido → 401; Jupiter sem sessão → 401; rate limit responde 429.
- Cliente: boot com cache + `/me` 401 → tela de login sem renderizar o dashboard antes; boot com cache + erro de rede → dashboard + aviso offline; `logout` limpa o storage; rotas renderizam a página certa.

### Checklist por fase
`npm run build` · `npm run lint` · `npx vitest run` · conferência visual em `/dev/home` nos 4 tamanhos e nos 2 temas.

---

## 10. Fora do escopo (por enquanto)
- Refresh token com tabela de sessões e "sair de todos os dispositivos".
- Google One Tap / reentrada automática.
- Notificações (o sino sai até existir funcionalidade).
- Tabelas `enrollments`/`class_schedules` do `schema.sql`, que estão criadas mas não são usadas pelo servidor.
