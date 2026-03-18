// ===== SEARCH MODULE — DaSIboard TypeScript =====

import type { SearchHit, PageKey } from './types';
import { escapeHTML, formatDate } from './utils';

// ── Referências a dados de outros módulos (injetados via importação) ───────────
// Importações lazy para evitar dependências circulares
let _eventsData: () => import('./types').DashboardEvent[] = () => [];
let _docentesData: () => import('./types').Docente[] = () => [];

export function injectSearchDeps(
  getEvents: () => import('./types').DashboardEvent[],
  getDocentes: () => import('./types').Docente[],
): void {
  _eventsData = getEvents;
  _docentesData = getDocentes;
}

// ── Abrir / Fechar ────────────────────────────────────────────────────────────
export function openSearch(): void {
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('global-search-input') as HTMLInputElement | null;
  if (!overlay) return;
  overlay.classList.remove('hidden');
  if (input) {
    input.value = '';
    input.focus();
  }
  renderSearchHint();
}

export function closeSearch(): void {
  document.getElementById('search-overlay')?.classList.add('hidden');
}

export function closeSearchIfOutside(event: MouseEvent): void {
  const box = document.querySelector('.search-box');
  if (box && !box.contains(event.target as Node)) closeSearch();
}

function renderSearchHint(): void {
  const results = document.getElementById('search-results');
  if (results) {
    results.innerHTML = '<div class="search-hint">Digite para buscar em todo o dashboard</div>';
  }
}

// ── Busca global ──────────────────────────────────────────────────────────────
export function runGlobalSearch(query: string): void {
  const results = document.getElementById('search-results');
  if (!results) return;

  const q = (query ?? '').trim().toLowerCase();
  if (q.length < 2) {
    renderSearchHint();
    return;
  }

  const hits: SearchHit[] = [];

  // ── Eventos ──────────────────────────────────────────────────────────────
  _eventsData().forEach((ev) => {
    if (
      (ev.title ?? '').toLowerCase().includes(q) ||
      (ev.description ?? '').toLowerCase().includes(q)
    ) {
      hits.push({
        icon: '📅',
        title: ev.title,
        sub: formatDate(ev.date),
        action: `navigateTo('calendar');setTimeout(()=>{if(typeof renderCalendar==='function'){calSelectedDate='${ev.date}';renderCalendar();renderCalendarSidebar('${ev.date}',getFilteredEvents('${ev.date}'));}},150)`,
      });
    }
  });

  // ── Docentes ─────────────────────────────────────────────────────────────
  _docentesData().forEach((d) => {
    if (
      (d.name ?? '').toLowerCase().includes(q) ||
      (d.areas ?? '').toLowerCase().includes(q)
    ) {
      hits.push({
        icon: '👩‍🏫',
        title: d.name,
        sub: d.areas ? d.areas.substring(0, 60) + '…' : 'Docente SI-USP',
        action: `navigateTo('docentes');setTimeout(()=>{const inp=document.getElementById('docentes-search');if(inp){inp.value='${escapeHTML(d.name)}';filterDocentes('${escapeHTML(d.name)}');}},150)`,
      });
    }
  });

  // ── Páginas / seções ─────────────────────────────────────────────────────
  const pages: Array<{ key: PageKey; label: string; icon: string }> = [
    { key: 'home',       label: 'Home',         icon: '🏠' },
    { key: 'calendar',   label: 'Calendário',   icon: '📅' },
    { key: 'schedule',   label: 'Horários',     icon: '🗓️' },
    { key: 'kanban',     label: 'Kanban',       icon: '📋' },
    { key: 'newsletter', label: 'Newsletter',   icon: '📰' },
    { key: 'docentes',   label: 'Docentes',     icon: '👩‍🏫' },
    { key: 'estudos',    label: 'Estudos',      icon: '📚' },
    { key: 'entidades',  label: 'Entidades',    icon: '🏛️' },
    { key: 'notas-gpa',  label: 'Notas & GPA',  icon: '📊' },
    { key: 'faltas',     label: 'Faltas',       icon: '📆' },
    { key: 'ferramentas',label: 'Ferramentas',  icon: '🛠️' },
    { key: 'leetcode',   label: 'Desafios',     icon: '💻' },
  ];

  pages.forEach((p) => {
    if (
      p.label.toLowerCase().includes(q) ||
      p.key.toLowerCase().includes(q)
    ) {
      hits.push({
        icon: p.icon,
        title: p.label,
        sub: 'Ir para a seção',
        action: `navigateTo('${p.key}')`,
      });
    }
  });

  if (hits.length === 0) {
    results.innerHTML = `<div class="search-hint">Nenhum resultado para "<strong>${escapeHTML(query)}</strong>"</div>`;
    return;
  }

  const limited = hits.slice(0, 8);
  results.innerHTML = limited
    .map(
      (h) => `
      <button class="search-result-item" onclick="closeSearch();${h.action}">
        <span class="search-result-icon">${h.icon}</span>
        <span class="search-result-text">
          <span class="search-result-title">${escapeHTML(h.title)}</span>
          <span class="search-result-sub">${escapeHTML(h.sub)}</span>
        </span>
      </button>`,
    )
    .join('');
}

// ── Atalhos de teclado ────────────────────────────────────────────────────────
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeSearch();
  if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    openSearch();
  }
});
