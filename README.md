# DaSIboard v2 — TypeScript

Dashboard para estudantes de Sistemas de Informação — USP/EACH.  
Esta é a versão reescrita em **TypeScript** da base original em JavaScript.

---

## 🏗️ Estrutura do projeto

```
dashboard-ts/
├── tsconfig.json          # Configuração TypeScript (strict mode, ES2020, DOM)
├── vite.config.ts         # Build com Vite + suporte a múltiplos HTML
├── package.json           # Dependências e scripts
└── src/
    ├── index.ts           # Entry point — importa e expõe tudo globalmente
    ├── types/
    │   └── index.ts       # Todas as interfaces e tipos do projeto
    ├── utils.ts           # Funções utilitárias tipadas (fetchJSON<T>, parseDate…)
    ├── firebase-config.ts # Inicialização Firebase
    ├── auth.ts            # Classe AuthManager com tipagem completa
    ├── app.ts             # Tema, roteamento, home, contagem regressiva
    ├── calendar.ts        # Calendário com filtros por tipo e turma
    ├── schedule.ts        # Grade horária com seleção de semestre/turma
    ├── kanban.ts          # Drag & drop, CRUD, persistência tipada
    ├── newsletter.ts      # Modal, lista, preview home
    ├── search.ts          # Busca global com injeção de dependências
    ├── gpa.ts             # Cálculo de médias ponderadas por créditos
    ├── faltas.ts          # Controle de frequência com notificações push
    ├── docentes.ts        # Grid de docentes com filtro e avatar gerado por hash
    ├── estudos.ts         # Biblioteca de estudos com filtros e modal
    ├── entidades.ts       # Hub de entidades estudantis + merge de eventos
    └── ferramentas.ts     # 10 ferramentas: Pomodoro, Notas, Checklist, Sorteio,
                           #   Calculadora, Cronômetro, Conversor, ABNT, Anti-plágio,
                           #   Flashcards
```

---

## 🚀 Como rodar

### Pré-requisitos
- Node.js ≥ 18
- npm ≥ 9

### Instalação

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Verificar tipos sem compilar
npm run typecheck

# Build de produção
npm run build

# Preview do build
npm run preview
```

---

## 🔑 Principais mudanças do JS para TS

### 1. Tipagem estrita em todo o projeto
```typescript
// Antes (JS)
async function fetchJSON(url) { ... }

// Depois (TS)
async function fetchJSON<T = unknown>(url: string): Promise<T | null> { ... }
```

### 2. Interfaces explícitas para todos os dados
```typescript
interface DashboardEvent {
  id?: string;
  title: string;
  date: string;          // "YYYY-MM-DD"
  type: EventType;       // 'prova' | 'entrega' | 'evento' | 'apresentacao' | 'deadline'
  description?: string;
  entidade?: string;
  turmas?: string[];
}
```

### 3. Classe AuthManager tipada
```typescript
class AuthManager {
  private currentUser: firebase.User | null = null;
  public initialized = false;

  async login(email: string, password: string): Promise<AuthResult> { ... }
  async signup(email: string, password: string, displayName: string): Promise<AuthResult> { ... }
  async logout(): Promise<AuthResult> { ... }
}
```

### 4. Union types para enumerados
```typescript
type EventType    = 'prova' | 'entrega' | 'evento' | 'apresentacao' | 'deadline';
type KanbanColumn = 'todo' | 'doing' | 'done';
type KanbanTag    = 'prova' | 'entrega' | 'leitura' | 'projeto' | 'pessoal';
type PageKey      = 'home' | 'calendar' | 'schedule' | 'kanban' | ...;
```

### 5. Exports nomeados em vez de globais
```typescript
// Módulos exportam explicitamente
export function initKanban(): void { ... }
export function kanbanAdd(): void { ... }

// index.ts reexporta tudo e expõe no window
(window as Record<string, unknown>)[key] = value;
```

### 6. Null safety em toda parte
```typescript
// Antes (JS) — silenciosamente undefined
const el = document.getElementById('foo');
el.innerHTML = 'texto'; // ❌ pode crashar

// Depois (TS) — forçado a tratar null
const el = document.getElementById('foo');
if (el) el.innerHTML = 'texto'; // ✅ seguro
// ou
el?.innerHTML = 'texto'; // ✅ operador optional chaining
```

---

## ⚙️ Firebase

Edite `src/firebase-config.ts` com suas credenciais:

```typescript
const firebaseConfig = {
  apiKey: 'SUA_API_KEY',
  authDomain: 'seu-projeto.firebaseapp.com',
  projectId: 'seu-projeto',
  // ...
};
```

---

## 📋 tsconfig.json — opções principais

| Opção | Valor | Motivo |
|-------|-------|--------|
| `strict` | `true` | Ativa todas as checagens de tipo |
| `strictNullChecks` | `true` | `null`/`undefined` devem ser tratados |
| `noImplicitAny` | `true` | Sem `any` implícito |
| `target` | `ES2020` | Suporte a `??`, `?.`, `async/await` nativos |
| `lib` | `["ES2020","DOM","DOM.Iterable"]` | APIs do browser + iterables |
| `moduleResolution` | `bundler` | Compatível com Vite |

---

## 🧩 Arquitetura de módulos

Cada módulo `.ts` segue o padrão:
1. **Imports** — apenas do que precisa (sem circulares)
2. **Interfaces locais** — tipos específicos do módulo
3. **Estado encapsulado** — variáveis `let` no topo do módulo
4. **Funções `export`** — API pública do módulo
5. **Funções privadas** — auxiliares sem `export`

---

_Gerado a partir do DaSIboard v2 original (JavaScript)._
