# Dasiboard 🚀

![Dasiboard Home](./home.png)

O **Dasiboard** é uma aplicação web full-stack desenvolvida para facilitar a visualização e o gerenciamento de dados e horários acadêmicos. Com uma arquitetura moderna, o projeto oferece um painel interativo (dashboard) com autenticação segura e integração automatizada para extração e organização de grades horárias (incluindo suporte integrado para sistemas como o Júpiter).

## 🛠 Tecnologias Utilizadas

Este projeto foi construído utilizando as seguintes tecnologias:

### Frontend
*   **[React](https://reactjs.org/)**: Biblioteca JavaScript para construção da interface de usuário.
*   **[TypeScript](https://www.typescriptlang.org/)**: Superset do JavaScript que adiciona tipagem estática.
*   **[Vite](https://vitejs.dev/)**: Bundler ultrarrápido utilizado para o ambiente de desenvolvimento e build de produção.

### Backend & API
*   **Vercel Serverless Functions**: A pasta `/api` concentra as rotas do backend (`/api/auth`, `/api/schedule`), rodando de forma serverless na Vercel.
*   **Autenticação**: Integração com Google OAuth (`api/auth/google.ts`).
*   **Node.js / TypeScript**: Lógica de servidor, extração e tratamento de dados.

### Banco de Dados
*   **[Supabase](https://supabase.com/)**: Plataforma open-source baseada em PostgreSQL utilizada para armazenamento de dados e gerenciamento de esquemas (configurado via `supabase/schema.sql`).

### Ferramentas de Qualidade
*   **[Oxlint](https://oxc-project.github.io/docs/guide/usage/linter.html)**: Linter rápido escrito em Rust para manter a qualidade e padronização do código (`.oxlintrc.json`).

## 📁 Estrutura do Projeto

A estrutura de diretórios foi pensada para separar claramente o frontend do backend:

```text
dasiboard-omg-main/
├── api/                  # Vercel Serverless Functions (Rotas da API)
│   ├── auth/             # Rotas de autenticação (Google, Logout, Me)
│   └── schedule/         # Rotas de grade horária (ex: jupiter.ts)
├── public/               # Assets públicos estáticos (ícones, favicons)
├── server/               # Lógica interna do servidor e conexão com DB
├── src/                  # Código fonte do Frontend (React)
│   ├── assets/           # Imagens e SVGs utilizados na interface
│   ├── App.tsx           # Componente raiz da aplicação
│   └── main.tsx          # Ponto de entrada do React
├── supabase/             # Configurações e Migrations do banco de dados
│   └── schema.sql        # Estrutura de tabelas do PostgreSQL
├── .oxlintrc.json        # Configuração do linter Oxlint
├── vercel.json           # Configurações de deploy na Vercel
├── vite.config.ts        # Configurações do Vite
└── package.json          # Dependências e scripts do projeto
```

## ✨ Principais Funcionalidades

*   **Autenticação Google**: Login seguro e simplificado utilizando contas do Google.
*   **Grade horária (Jupiter)**: o aluno informa os códigos das disciplinas e escolhe as turmas; os horários vêm da consulta pública do JupiterWeb (`obterTurma`), sem pedir número USP nem senha.
*   **Dashboard Interativo**: Interface responsiva e em tempo real servida pelo React.
*   **Sessões Persistentes**: Gerenciamento de estado de usuário integrado com o backend Supabase.

## 🔐 Configuração do login Google

O botão de login usa o Google Identity Services no navegador. O valor de
`VITE_GOOGLE_CLIENT_ID` precisa ser um cliente OAuth do tipo **Aplicativo da Web**
e cada origem usada para abrir o app deve estar cadastrada no Google Cloud:

1. Acesse **Google Cloud Console → APIs e serviços → Credenciais**.
2. Abra o cliente OAuth correspondente ao `VITE_GOOGLE_CLIENT_ID`.
3. Em **Origens JavaScript autorizadas**, adicione as origens exatas, sem caminho
   ou barra final. Por exemplo:
   - `http://localhost:5173`
   - `http://127.0.0.1:5173` (se usado localmente)
   - `https://dasiboard.vercel.app`
   - `https://sieach.vercel.app`
   - `https://<seu-dominio.com>` (se houver outro domínio personalizado)
4. Salve, aguarde a propagação e faça um novo deploy/recarregamento.

O erro `400: origin_mismatch` ocorre antes de o pedido chegar ao servidor e
significa que a origem mostrada na barra do navegador não está nessa lista.
Não adicione caminhos como `/login`, nem use `*`. No Vercel, configure
`VITE_GOOGLE_CLIENT_ID` como variável de ambiente de **Build** e
`GOOGLE_CLIENT_ID`, `SESSION_SECRET`, `FRONTEND_URL` e as variáveis do Supabase
como variáveis de **Runtime**, usando `FRONTEND_URL` igual ao domínio público
principal (por exemplo, `https://dasiboard.vercel.app`). O backend já reconhece
`https://dasiboard.vercel.app` e `https://sieach.vercel.app`, além de reconhecer
automaticamente `VERCEL_URL` e `VERCEL_PROJECT_PRODUCTION_URL`. Se o projeto
usar mais de um domínio próprio, informe-os em `ALLOWED_ORIGINS`, separados por
vírgulas, por exemplo:

```text
ALLOWED_ORIGINS=https://app.exemplo.com,https://www.exemplo.com
```

Esses valores são normalizados para a origem (protocolo + host + porta), então
uma barra final em `FRONTEND_URL` não causa diferença.

Para o banco funcionar no deploy, configure no projeto da Vercel (em **Settings
→ Environment Variables**, para **Production** e **Preview**, se ambos forem
usados):

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-do-Supabase>
```

`SUPABASE_SERVICE_ROLE_KEY` é uma variável somente de servidor: não use o
prefixo `VITE_` e não a exponha no frontend. Depois de salvar as variáveis, faça
um novo deploy. O esquema em [supabase/schema.sql](./supabase/schema.sql) também
precisa ter sido executado no projeto Supabase.

### Sistema social (Comunidade): variáveis de ambiente

As rotas sociais (`/api/me/*`, `/api/people`, `/api/connections`, `/api/feed`,
`/api/entities/*`, `/api/admin/*`) usam as variáveis abaixo, todas **somente de
servidor** (Runtime na Vercel, sem prefixo `VITE_`):

```text
INVITE_CODE_PEPPER=<texto aleatório com 32+ caracteres>
SUPERADMIN_EMAILS=voce@usp.br,outra.pessoa@usp.br
```

*   `INVITE_CODE_PEPPER` (**obrigatória em produção**, mínimo de 32 caracteres):
    segredo usado no HMAC-SHA256 dos códigos de convite das entidades. O banco
    guarda só o hash; o código em texto aparece uma única vez, para quem o gera.
    **Não troque depois de gerar códigos**: todos os códigos existentes deixariam de
    valer (basta gerar novos). Gere um valor com
    `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
    Fora de produção, se ausente, é derivada de `SESSION_SECRET` com um aviso.
    Sem ela em produção o servidor **não inicia**: configure antes do deploy.
*   `SUPERADMIN_EMAILS` (opcional): e-mails (separados por vírgula, sem distinção de
    maiúsculas) que podem gerar códigos e promover admins em qualquer entidade.
*   `DEV_FAKE_SESSION=1` (**apenas desenvolvimento**, veja abaixo). O servidor
    lança erro no boot se esta variável estiver ativa com `NODE_ENV=production` ou
    na Vercel. Nunca a configure na Vercel.

Roteamento na Vercel: `vercel.json` reescreve toda rota `/api/*` sem arquivo
próprio para a função `api/index.ts` (que importa `server/index.ts`), e o Express
roteia pelo caminho original. Só `/api/auth/*` e `/api/schedule` têm arquivos próprios. Não use `api/[...path].ts`: na
Vercel, fora do Next.js, ele só atende caminhos de um nível (`/api/people`, mas
não `/api/people/:handle`).
Antes do deploy, aplique `supabase/migrations/2026-10-20-social.sql` (veja
`supabase/README.md`).

### Dados de demonstração para desenvolvimento local

Sem uma sessão real do Google, as telas sociais ficariam vazias. Com um Supabase
**de desenvolvimento** configurado em `.env`:

```bash
npm run seed:dev                 # cria ~15 alunos fictícios @usp.br, conexões, pedidos e membros
DEV_FAKE_SESSION=1 npm run dev:server   # as requisições sem cookie viram o usuário estudante@usp.br
```

O script recusa rodar se `SUPABASE_URL` não parecer de desenvolvimento (aceita
`localhost` e hosts com rótulo `dev`, `staging`, `test`, `sandbox`, `local` ou
`preview`); para confirmar que o banco é de desenvolvimento, use
`SEED_DEV_CONFIRM=1 npm run seed:dev`. Ele também se recusa a rodar com
`NODE_ENV=production`. É idempotente e mexe só nos usuários fictícios e no usuário
de desenvolvimento. Ao final, imprime um código de convite de demonstração da
entidade Síntese Jr.

### Push no navegador

O push é opcional e fica desligado sem as chaves VAPID. Para ligar:

```bash
npx web-push generate-vapid-keys
```

Cadastre `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` (e, se quiser, `VAPID_SUBJECT`, por
padrão `mailto:` + o primeiro e-mail de `SUPERADMIN_EMAILS`) no `.env` e na Vercel. O
service worker (`public/sw.js`) só é registrado em produção ou com `VITE_ENABLE_SW=1`.

### Testes

`npm test` (ou `npx vitest run`) roda os testes do front-end (jsdom) e do servidor
(`server/**/*.test.ts`, ambiente node, Supabase substituído por uma camada de dados
em memória).

## 📜 Licença
