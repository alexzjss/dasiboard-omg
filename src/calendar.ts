// ===== CALENDAR MODULE — DaSIboard TypeScript =====

import type { DashboardEvent, EventType } from './types';
import { fetchJSON, parseDate, formatDate, MONTH_NAMES, DAY_NAMES_SHORT, el, typeToLabel } from './utils';

// ── Constantes ────────────────────────────────────────────────────────────────
export const TYPE_LABELS: Record<EventType, string> = {
  prova: 'Prova',
  entrega: 'Entrega',
  evento: 'Evento',
  apresentacao: 'Apresentação',
  deadline: 'Deadline',
};

export const TYPE_DOT_COLORS: Record<EventType, string> = {
  prova: 'var(--danger)',
  entrega: 'var(--warning)',
  evento: 'var(--success)',
  apresentacao: 'var(--info)',
  deadline: '#fb923c',
};

// ── Estado do módulo ──────────────────────────────────────────────────────────
export let calEvents: DashboardEvent[] = [];
export let calYear = new Date().getFullYear();
export let calMonth = new Date().getMonth();
export let calSelectedDate: string | null = null;

let calActiveTypes = new Set<EventType>([
  'prova', 'entrega', 'evento', 'apresentacao', 'deadline',
]);
let calActiveTurmas = new Set<string>();
let calAvailableTurmas: string[] = [];

// ── Inicialização ─────────────────────────────────────────────────────────────
export async function initCalendar(): Promise<void> {
  if (calEvents.length === 0) {
    try {
      const res = await fetch('./data/events.json', { cache: 'no-cache' });
      calEvents = res.ok ? (await res.json()) as DashboardEvent[] : [];
    } catch (e) {
      console.warn('[DaSIboard] Falha ao carregar events.json:', (e as Error).message);
      calEvents = [];
    }

    const turmaSet = new Set<string>();
    calEvents.forEach((ev) => {
      if (Array.isArray(ev.turmas)) ev.turmas.forEach((t) => turmaSet.add(t));
    });
    calAvailableTurmas = [...turmaSet].sort();
  }

  renderCalendarFilters();
  renderCalendar();
  renderCalendarSidebar(null);
}

// ── Filtragem ─────────────────────────────────────────────────────────────────
export function getFilteredEvents(dateKey: string): DashboardEvent[] {
  return calEvents.filter((ev) => {
    if (ev.date !== dateKey) return false;
    if (!calActiveTypes.has(ev.type)) return false;
    if (
      calActiveTurmas.size > 0 &&
      Array.isArray(ev.turmas) &&
      ev.turmas.length > 0
    ) {
      if (!ev.turmas.some((t) => calActiveTurmas.has(t))) return false;
    }
    return true;
  });
}

function buildFilteredEventMap(): Record<string, DashboardEvent[]> {
  const map: Record<string, DashboardEvent[]> = {};
  calEvents.forEach((ev) => {
    if (!calActiveTypes.has(ev.type)) return;
    if (
      calActiveTurmas.size > 0 &&
      Array.isArray(ev.turmas) &&
      ev.turmas.length > 0
    ) {
      if (!ev.turmas.some((t) => calActiveTurmas.has(t))) return;
    }
    if (!map[ev.date]) map[ev.date] = [];
    map[ev.date].push(ev);
  });
  return map;
}

// ── Filtros visuais ───────────────────────────────────────────────────────────
function renderCalendarFilters(): void {
  const typesContainer = document.getElementById('cal-filter-types');
  if (typesContainer) {
    typesContainer.innerHTML = (Object.keys(TYPE_LABELS) as EventType[])
      .map((type) => {
        const isActive = calActiveTypes.has(type);
        const color = TYPE_DOT_COLORS[type];
        return `
          <button class="cal-filter-btn ${isActive ? 'active' : ''}"
            style="--dot-color:${color}"
            onclick="toggleCalTypeFilter('${type}')">
            <span class="filter-dot" style="background:${color}"></span>
            ${TYPE_LABELS[type]}
          </button>`;
      })
      .join('');
  }

  const turmasContainer = document.getElementById('cal-filter-turmas');
  if (turmasContainer) {
    if (calAvailableTurmas.length === 0) {
      turmasContainer.innerHTML = '';
      return;
    }
    turmasContainer.innerHTML = calAvailableTurmas
      .map((t) => {
        const isActive = calActiveTurmas.has(t);
        return `<button class="cal-filter-btn ${isActive ? 'active' : ''}" onclick="toggleCalTurmaFilter('${t}')">${t}</button>`;
      })
      .join('');
  }
}

export function toggleCalTypeFilter(type: EventType): void {
  if (calActiveTypes.has(type)) {
    calActiveTypes.delete(type);
  } else {
    calActiveTypes.add(type);
  }
  renderCalendarFilters();
  renderCalendar();
  if (calSelectedDate) {
    renderCalendarSidebar(calSelectedDate, getFilteredEvents(calSelectedDate));
  }
}

export function toggleCalTurmaFilter(turma: string): void {
  if (calActiveTurmas.has(turma)) {
    calActiveTurmas.delete(turma);
  } else {
    calActiveTurmas.add(turma);
  }
  renderCalendarFilters();
  renderCalendar();
  if (calSelectedDate) {
    renderCalendarSidebar(calSelectedDate, getFilteredEvents(calSelectedDate));
  }
}

// ── Grid do calendário ────────────────────────────────────────────────────────
export function renderCalendar(): void {
  const grid = el<HTMLDivElement>('#cal-grid');
  const monthLabel = el<HTMLDivElement>('#cal-month-year');
  if (!grid || !monthLabel) return;

  monthLabel.textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;

  const eventMap = buildFilteredEventMap();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  let html = DAY_NAMES_SHORT.map((d) => `<div class="cal-weekday">${d}</div>`).join('');

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const events = eventMap[dateKey] ?? [];
    const isToday = dateKey === todayKey;
    const isSelected = dateKey === calSelectedDate;
    const hasEvents = events.length > 0;

    const dots = events
      .slice(0, 3)
      .map(
        (ev) =>
          `<span class="cal-dot" style="background:${TYPE_DOT_COLORS[ev.type] ?? 'var(--primary)'}"></span>`,
      )
      .join('');

    html += `
      <div class="cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasEvents ? 'has-events' : ''}"
        onclick="calSelectDate('${dateKey}')">
        <span class="cal-day-num">${day}</span>
        ${hasEvents ? `<div class="cal-dots">${dots}</div>` : ''}
      </div>`;
  }

  grid.innerHTML = html;
}

export function calSelectDate(dateKey: string): void {
  calSelectedDate = dateKey;
  renderCalendar();
  renderCalendarSidebar(dateKey, getFilteredEvents(dateKey));
}

export function calPrevMonth(): void {
  calMonth--;
  if (calMonth < 0) {
    calMonth = 11;
    calYear--;
  }
  renderCalendar();
  renderCalendarSidebar(null);
}

export function calNextMonth(): void {
  calMonth++;
  if (calMonth > 11) {
    calMonth = 0;
    calYear++;
  }
  renderCalendar();
  renderCalendarSidebar(null);
}

// ── Sidebar de detalhes ───────────────────────────────────────────────────────
export function renderCalendarSidebar(
  dateKey: string | null,
  events: DashboardEvent[] = [],
): void {
  const sidebar = document.getElementById('cal-sidebar');
  if (!sidebar) return;

  if (!dateKey) {
    sidebar.innerHTML = `<div class="cal-sidebar-hint">Selecione um dia para ver os eventos.</div>`;
    return;
  }

  const d = parseDate(dateKey);
  const dayLabel = d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  sidebar.innerHTML = `
    <div class="cal-sidebar-date">${dayLabel}</div>
    ${
      events.length === 0
        ? `<div class="no-events-msg">Nenhum evento neste dia.</div>`
        : events
            .map(
              (ev) => `
          <div class="cal-event-card">
            <div class="cal-event-title">${ev.title}</div>
            ${ev.description && ev.description !== 'NA' ? `<div class="cal-event-desc">${ev.description}</div>` : ''}
            <div class="cal-event-meta">
              ${typeToLabel(ev.type)}
              ${ev.local ? `<span class="cal-event-local">📍 ${ev.local}</span>` : ''}
            </div>
          </div>`,
            )
            .join('')
    }
  `;
}
