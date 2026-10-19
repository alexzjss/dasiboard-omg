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
*   **Integração de Horários (Jupiter)**: Sistema para buscar, processar e exibir rotinas e grades horárias automaticamente.
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

## 📜 Licença
