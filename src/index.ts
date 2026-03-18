// ===== ENTRY POINT — DaSIboard TypeScript =====
// Este arquivo importa todos os módulos e expõe as funções necessárias
// globalmente para compatibilidade com eventos inline do HTML.

// ── Utilitários ───────────────────────────────────────────────────────────────
export * from './utils';

// ── Tipos ─────────────────────────────────────────────────────────────────────
export type * from './types';

// ── Módulos principais ────────────────────────────────────────────────────────
export * from './app';
export * from './auth';
export * from './calendar';
export * from './schedule';
export * from './kanban';
export * from './newsletter';
export * from './search';
export * from './gpa';
export * from './faltas';
export * from './docentes';
export * from './estudos';
export * from './entidades';
export * from './ferramentas';

// ── Expor tudo no window para compatibilidade com HTML inline ─────────────────
// (Vite com iife/umd, ou bundle manual via vite.config.ts)
import * as AppModule from './app';
import * as KanbanModule from './kanban';
import * as CalendarModule from './calendar';
import * as ScheduleModule from './schedule';
import * as NewsletterModule from './newsletter';
import * as SearchModule from './search';
import * as GPAModule from './gpa';
import * as FaltasModule from './faltas';
import * as DocentesModule from './docentes';
import * as EstudosModule from './estudos';
import * as EntidadesModule from './entidades';
import * as FerramentasModule from './ferramentas';
import * as AuthModule from './auth';

// Expor todos os módulos como propriedades do window
const globalExports: Record<string, unknown> = {
  ...AppModule,
  ...KanbanModule,
  ...CalendarModule,
  ...ScheduleModule,
  ...NewsletterModule,
  ...SearchModule,
  ...GPAModule,
  ...FaltasModule,
  ...DocentesModule,
  ...EstudosModule,
  ...EntidadesModule,
  ...FerramentasModule,
  ...AuthModule,
};

Object.entries(globalExports).forEach(([key, value]) => {
  if (typeof value === 'function') {
    (window as Record<string, unknown>)[key] = value;
  }
});
