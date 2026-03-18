// ===== APP MAIN — DaSIboard TypeScript =====

import type { Theme, DashboardEvent, ScheduleData, Quote, PageKey } from './types';
import {
  fetchJSON, parseDate, formatDate, parseTimeRange, getGreeting,
  escQ, svgIcon, typeToLabel, showToast,
  DAY_NAMES_FULL, MONTH_NAMES_SHORT,
} from './utils';
import { initCalendar, calEvents, calYear, calMonth, calSelectedDate, renderCalendar, renderCalendarSidebar, getFilteredEvents } from './calendar';
import { initSchedule, getScheduleData } from './schedule';
import { initNewsletter, renderHomeNewsletter, openNewsletterModal, closeNewsletterModal } from './newsletter';
import { initKanban, updateHomeKanbanPeek, updateStatTasks, closeKanbanModal } from './kanban';
import { initGPA } from './gpa';
import { openSearch, closeSearch } from './search';
import { authManager, handleProfileClick, toggleProfileMenu, closeProfileMenu, confirmLogout, closeLogoutModal, doLogout } from './auth';

// ── Expor funções globais necessárias para o HTML inline ─────────────────────
declare global {
  interface Window {
    navigateTo: (page: PageKey) => void;
    navigateWithFeedback: (page: PageKey) => void;
    cycleTheme: () => void;
    setThemeMode: (mode: 'dark' | 'light') => void;
    toggleMobileNav: () => void;
    loadQuoteWidget: () => void;
    openDevCard: () => void;
    closeDevCard: () => void;
    toggleLiteMode: () => void;
    handleProfileClick: typeof handleProfileClick;
    toggleProfileMenu: typeof toggleProfileMenu;
    closeProfileMenu: typeof closeProfileMenu;
    confirmLogout: typeof confirmLogout;
    closeLogoutModal: typeof closeLogoutModal;
    doLogout: typeof doLogout;
    openSearch: typeof openSearch;
    closeSearch: typeof closeSearch;
    openNewsletterModal: typeof openNewsletterModal;
    closeNewsletterModal: typeof closeNewsletterModal;
    // calendar
    calYear: number; calMonth: number; calSelectedDate: string | null;
    renderCalendar: typeof renderCalendar;
    renderCalendarSidebar: typeof renderCalendarSidebar;
    getFilteredEvents: typeof getFilteredEvents;
    calSelectDate: (date: string) => void;
    calPrevMonth: () => void; calNextMonth: () => void;
    // kanban
    kanbanDragStart: (e: DragEvent, id: string) => void;
    kanbanDragEnd: (e: DragEvent) => void;
    kanbanDrop: (e: DragEvent, col: string) => void;
    kanbanAddCard: () => void;
    kanbanDelete: (id: string) => void;
    openKanbanEdit: (id: string) => void;
    saveKanbanEdit: () => void;
    closeKanbanModal: typeof closeKanbanModal;
    kanbanClearDone: () => void;
    // schedule
    selectSemester: (id: string) => void;
    selectTurma: (id: string) => void;
    // gpa
    gpaToggleSem: (id: string) => void;
    gpaSetGrade: (semId: string, discId: string, val: string) => void;
    gpaReset: () => void;
    // search
    runGlobalSearch: (q: string) => void;
    closeSearchIfOutside: (e: MouseEvent) => void;
  }
}

// ===== THEME SYSTEM =====
const THEMES: Theme[] = [
  { key: 'padrao',      label: 'Padrão',           dark: true  },
  { key: 'super',       label: 'Super',             dark: true  },
  { key: 'hackerman',   label: 'Hackerman',         dark: true  },
  { key: 'sith',        label: 'Sith',              dark: true  },
  { key: 'gatilho',     label: 'Gatilho do Tempo',  dark: true  },
  { key: 'hypado',      label: 'Hypado',            dark: true  },
  { key: 'omni',        label: 'Omni',              dark: true  },
  { key: 'minas',       label: 'Minas',             dark: true  },
  { key: 'd20',         label: 'D20',               dark: true  },
  { key: 'grifinho',    label: 'Grifinho',           dark: false },
  { key: 'bidu',        label: 'Bidu',              dark: false },
  { key: 'mamaco',      label: 'Mamaco',            dark: false },
  { key: 'jedi',        label: 'Jedi',              dark: false },
  { key: 'ocean',       label: 'Ocean Breeze',      dark: false },
  { key: 'laboratorio', label: 'Laboratório',       dark: false },
  { key: 'sintetizado', label: 'Sintetizado',       dark: false },
  { key: 'masacote',    label: 'Masacote',          dark: false },
  { key: 'grace',       label: 'Grace',             dark: false },
];

let currentThemeIndex = 0;
let themeFullRotations = 0;

function getThemePool(): Theme[] {
  const isDark = THEMES[currentThemeIndex]?.dark !== false;
  return THEMES.filter((t) => t.dark === isDark);
}

export function cycleTheme(): void {
  const isDark = THEMES[currentThemeIndex]?.dark !== false;
  const pool = THEMES.map((t, i) => ({ ...t, idx: i })).filter((t) => t.dark === isDark);
  const posInPool = pool.findIndex((t) => t.idx === currentThemeIndex);
  const nextInPool = pool[(posInPool + 1) % pool.length];
  currentThemeIndex = nextInPool.idx;

  if (posInPool + 1 >= pool.length) {
    themeFullRotations++;
    if (themeFullRotations >= 2) {
      triggerMoonEasterEgg();
      themeFullRotations = 0;
    }
  }
  applyTheme(THEMES[currentThemeIndex]);
  renderThemeSwitch();
}

const BG_MAP: Record<string, string> = {
  padrao: '#07070c', super: '#020c1a', hackerman: '#010a01', sith: '#0a0002',
  gatilho: '#050210', hypado: '#080600', omni: '#060606', minas: '#060908',
  d20: '#020614', grifinho: '#f4f0ff', bidu: '#fff8f0', mamaco: '#f5f0e0',
  jedi: '#f0f8f2', ocean: '#f0f8ff', laboratorio: '#fff0f7', sintetizado: '#f0f6ff',
  masacote: '#fffce8', grace: '#fff4eb',
};

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme.key);
  const dot = document.getElementById('theme-dot');
  const label = document.getElementById('theme-label');
  if (label) label.textContent = theme.label;
  if (dot) { dot.style.animation = 'none'; void dot.offsetWidth; dot.style.animation = ''; }
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', BG_MAP[theme.key] ?? '#07070c');
  localStorage.setItem('dasitheme', theme.key);
  const modeKey = theme.dark !== false ? 'dasitheme_dark' : 'dasitheme_light';
  localStorage.setItem(modeKey, theme.key);

  if (theme.key === 'd20') applyD20GameFlavor();
  else removeD20GameFlavor();
}

export function setThemeMode(mode: 'dark' | 'light'): void {
  const current = THEMES[currentThemeIndex];
  const wantDark = mode === 'dark';
  if (wantDark === (current.dark !== false)) return;
  const lastKey = localStorage.getItem(`dasitheme_${mode}`);
  const pool = THEMES.map((t, i) => ({ ...t, idx: i })).filter((t) => t.dark === wantDark);
  const restored = lastKey ? pool.find((t) => t.key === lastKey) ?? null : null;
  const target = restored ?? pool[0];
  currentThemeIndex = target.idx;
  applyTheme(THEMES[currentThemeIndex]);
  renderThemeSwitch();
}

function renderThemeSwitch(): void {
  const sw = document.getElementById('theme-mode-switch');
  if (!sw) return;
  const theme = THEMES[currentThemeIndex];
  const isDark = theme?.dark !== false;
  sw.setAttribute('data-mode', isDark ? 'dark' : 'light');
  const knob = sw.querySelector('.tsw-knob');
  const swLabel = sw.querySelector('.tsw-label');
  if (knob) knob.textContent = isDark ? '🌙' : '☀️';
  if (swLabel) swLabel.textContent = theme?.label ?? '—';
  const pool = THEMES.filter((t) => t.dark === isDark);
  const posInPool = pool.findIndex((t) => t.key === theme?.key);
  const dot = document.getElementById('theme-dot');
  const cycleLabel = document.getElementById('theme-label');
  if (dot) { dot.style.animation = 'none'; void dot.offsetWidth; dot.style.animation = ''; }
  if (cycleLabel) cycleLabel.textContent = `${posInPool + 1}/${pool.length}`;
}

function loadSavedTheme(): void {
  const saved = localStorage.getItem('dasitheme');
  if (saved) {
    const idx = THEMES.findIndex((t) => t.key === saved);
    if (idx >= 0) { currentThemeIndex = idx; applyTheme(THEMES[idx]); renderThemeSwitch(); return; }
  }
  applyTheme(THEMES[0]);
  renderThemeSwitch();
}

// ── Easter egg lua ────────────────────────────────────────────────────────────
function triggerMoonEasterEgg(): void {
  const moon = document.getElementById('moon-egg');
  const text = document.getElementById('moon-to-the-moon-text');
  if (!moon) return;
  moon.classList.remove('flying'); void moon.offsetWidth; moon.classList.add('flying');
  if (text) {
    text.classList.remove('show'); void text.offsetWidth;
    setTimeout(() => {
      text.classList.add('show');
      setTimeout(() => text.classList.remove('show'), 2700);
    }, 200);
  }
  setTimeout(() => moon.classList.remove('flying'), 2600);
}

// ── D20 Theme flavor ──────────────────────────────────────────────────────────
const D20_GAME_LABELS: Record<string, [string, string]> = {
  'Próxima aula':        ['🎮', 'NEXT STAGE'],
  'Próximos eventos':    ['📅', 'QUEST LOG'],
  'Reflexão do dia':     ['💬', 'NPC DIALOG'],
  'Contagem regressiva': ['⏱️', 'TIME ATTACK'],
  'Tarefas pendentes':   ['⚔️', 'SIDE QUESTS'],
  'Última newsletter':   ['📜', 'LORE ENTRY'],
  'Filtros':             ['🎛️', 'SELECT CHAR'],
  'Evolução de médias':  ['📈', 'LEVEL UP'],
  'Minhas turmas':       ['🎓', 'GUILD HALL'],
  'Disciplinas':         ['📖', 'SKILL TREE'],
};

function applyD20GameFlavor(): void {
  document.querySelectorAll<HTMLElement>('.section-title').forEach((el) => {
    const text = el.textContent?.trim() ?? '';
    const match = Object.keys(D20_GAME_LABELS).find((k) => text.includes(k));
    if (match) {
      const [emoji, tag] = D20_GAME_LABELS[match];
      el.setAttribute('data-d20-orig', el.textContent ?? '');
      el.setAttribute('data-d20', emoji);
      if (!el.querySelector('.d20-game-tag')) {
        const badge = document.createElement('span');
        badge.className = 'd20-game-tag';
        badge.textContent = tag;
        el.appendChild(badge);
      }
    }
  });

  const greeting = document.getElementById('hero-greeting');
  if (greeting && !document.getElementById('d20-p1-badge')) {
    const p1 = document.createElement('span');
    p1.id = 'd20-p1-badge';
    p1.className = 'd20-p1-badge';
    p1.textContent = 'P1';
    greeting.parentElement?.appendChild(p1);
  }

  if (!document.getElementById('d20-pixel-layer')) {
    const layer = document.createElement('div');
    layer.id = 'd20-pixel-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = [
      '<span class="d20-pixel" style="top:8vh;left:3%;font-size:18px;animation-delay:0s">⭐</span>',
      '<span class="d20-pixel" style="top:20vh;right:4%;font-size:14px;animation-delay:.8s">👾</span>',
      '<span class="d20-pixel" style="top:35vh;left:2%;font-size:16px;animation-delay:1.5s">🎮</span>',
      '<span class="d20-pixel" style="top:55vh;right:3%;font-size:13px;animation-delay:.4s">🍄</span>',
      '<span class="d20-pixel" style="top:70vh;left:4%;font-size:15px;animation-delay:2s">⚔️</span>',
      '<span class="d20-pixel" style="top:85vh;right:5%;font-size:12px;animation-delay:1.2s">💎</span>',
    ].join('');
    document.body.appendChild(layer);
  }
}

function removeD20GameFlavor(): void {
  document.querySelectorAll('.d20-game-tag').forEach((el) => el.remove());
  document.querySelectorAll('[data-d20]').forEach((el) => el.removeAttribute('data-d20'));
  document.getElementById('d20-p1-badge')?.remove();
  document.getElementById('d20-pixel-layer')?.remove();
}

// ===== ROUTING =====
let eventsData: DashboardEvent[] = [];
let scheduleDataAll: ScheduleData | null = null;
let estudosClickCount = 0;
let estudosClickTimer: ReturnType<typeof setTimeout> | null = null;

export function navigateTo(page: PageKey): void {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach((l) => l.classList.remove('active'));
  const pageEl = document.getElementById(`${page}-page`);
  const navEl = document.querySelector(`[data-page="${page}"]`);
  pageEl?.classList.add('active');
  navEl?.classList.add('active');

  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.getElementById('hamburger')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (document.documentElement.getAttribute('data-theme') === 'd20') {
    setTimeout(applyD20GameFlavor, 120);
  }

  if (page === 'calendar') initCalendar();
  if (page === 'schedule') initSchedule();
  if (page === 'newsletter') initNewsletter();
  if (page === 'kanban') initKanban();
  if (page === 'notas-gpa') initGPA();
  if (page === 'estudos') {
    estudosClickCount++;
    if (estudosClickTimer) clearTimeout(estudosClickTimer);
    estudosClickTimer = setTimeout(() => { estudosClickCount = 0; }, 2000);
    if (estudosClickCount >= 6) {
      estudosClickCount = 0;
      triggerCaligrafiaEasterEgg();
    }
  }

  history.pushState(null, '', `#${page}`);
}

export function navigateWithFeedback(page: PageKey): void {
  document.querySelectorAll<HTMLElement>('.page.active').forEach((p) => {
    p.style.opacity = '0.6';
    p.style.transform = 'scale(0.99)';
    p.style.transition = 'opacity .15s, transform .15s';
  });
  setTimeout(() => {
    navigateTo(page);
    document.querySelectorAll<HTMLElement>('.page.active').forEach((p) => {
      p.style.opacity = '';
      p.style.transform = '';
    });
  }, 120);
}

// ===== MOBILE SIDEBAR =====
export function toggleMobileNav(): void {
  document.getElementById('sidebar')?.classList.toggle('mobile-open');
  document.getElementById('hamburger')?.classList.toggle('open');
  document.getElementById('sidebar-overlay')?.classList.toggle('show');
}

function createSidebarOverlay(): void {
  if (document.getElementById('sidebar-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'sidebar-overlay';
  overlay.className = 'sidebar-mobile-overlay';
  overlay.onclick = toggleMobileNav;
  document.body.appendChild(overlay);
}

// ===== QUOTES =====
const FALLBACK_QUOTES: Quote[] = [
  { text: 'A vida não examinada não vale a pena ser vivida.', author: 'Sócrates', source: 'Filosofia' },
  { text: 'Eu penso, logo existo.', author: 'René Descartes', source: 'Filosofia' },
  { text: 'A imaginação é mais importante que o conhecimento.', author: 'Albert Einstein', source: 'Ciência' },
  { text: 'O código limpo é simples e direto. Parece prosa bem escrita.', author: 'Robert C. Martin', source: 'Clean Code' },
  { text: 'Qualquer tolo pode escrever código que um computador entenda.', author: 'Martin Fowler', source: 'Refactoring' },
  { text: 'Primeiro, resolva o problema. Depois, escreva o código.', author: 'John Johnson', source: 'Programação' },
  { text: 'Ser ou não ser, eis a questão.', author: 'William Shakespeare', source: 'Hamlet' },
  { text: 'Com grandes poderes vêm grandes responsabilidades.', author: 'Stan Lee', source: 'Marvel Comics' },
  { text: 'Que a Força esteja com você.', author: 'Yoda', source: 'Star Wars' },
  { text: 'Winter is coming.', author: 'Ned Stark', source: 'Game of Thrones' },
];

async function fetchExternalQuote(): Promise<Quote | null> {
  // APIs externas bloqueadas por CORS no GitHub Pages — usar fallback local
  return null;
}

export async function loadQuoteWidget(): Promise<void> {
  const card = document.getElementById('quote-card');
  if (!card) return;
  card.innerHTML = '<div class="quote-loading"><div class="spinner"></div></div>';

  const getFallback = (): Quote =>
    FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];

  const safetyTimer = setTimeout(() => {
    if (card.querySelector('.spinner')) renderQuote(card, getFallback());
  }, 2000);

  let quote: Quote | null = null;
  try { quote = await fetchExternalQuote(); } catch { /* fallback */ }
  clearTimeout(safetyTimer);

  renderQuote(card, quote ?? getFallback());
}

function renderQuote(card: HTMLElement, quote: Quote): void {
  card.innerHTML =
    `<div class="quote-mark">"</div>` +
    `<blockquote class="quote-text">${escQ(quote.text)}</blockquote>` +
    `<div class="quote-meta">` +
      `<span class="quote-author">— ${escQ(quote.author)}</span>` +
      (quote.source ? `<span class="quote-source">${escQ(quote.source)}</span>` : '') +
    `</div>` +
    `<button class="quote-refresh-btn" onclick="loadQuoteWidget()" title="Nova frase">` +
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>` +
      `Nova frase` +
    `</button>`;
}

// ===== HOME =====
async function initHome(): Promise<void> {
  renderHeroGreeting();
  try { eventsData = (await fetchJSON<DashboardEvent[]>('./data/events.json')) ?? []; } catch { eventsData = []; }
  try { scheduleDataAll = await fetchJSON<ScheduleData>('./data/schedule.json'); } catch { scheduleDataAll = null; }

  try { renderUpcomingEvents(); } catch {
    const c = document.getElementById('upcoming-events');
    if (c) c.innerHTML = '<div class="no-events-msg">Nenhum evento próximo.</div>';
  }
  try { await renderHomeNewsletter(); } catch {
    const c = document.getElementById('home-newsletter');
    if (c) c.innerHTML = '<div class="no-events-msg">Newsletter indisponível.</div>';
  }
  try { loadQuoteWidget(); } catch { /* fallback silencioso */ }
  try { renderNextClass(); } catch {
    const c = document.getElementById('next-class-info');
    if (c) c.innerHTML = '<div class="no-events-msg">Nenhuma aula cadastrada.</div>';
  }
  try { renderCountdown(); } catch {
    const c = document.getElementById('countdown-card');
    if (c) c.innerHTML = '<div class="countdown-past">Nenhum evento próximo.</div>';
  }
  try { updateStatEvents(); } catch { /* falha silenciosa */ }
  try { updateHomeKanbanPeek(); } catch { /* falha silenciosa */ }
  try { updateStatTasks(); } catch { /* falha silenciosa */ }
}

function renderHeroGreeting(): void {
  const greetEl = document.getElementById('hero-greeting');
  const dateEl = document.getElementById('hero-date-text');
  if (greetEl) greetEl.textContent = getGreeting();
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }
}

function updateStatEvents(): void {
  const el = document.getElementById('stat-events');
  const sbEl = document.getElementById('sb-events-count');
  if (!el) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = eventsData.filter((e) => parseDate(e.date) >= today);
  el.textContent = String(upcoming.length);
  if (sbEl) sbEl.textContent = upcoming.length > 0 ? String(upcoming.length) : '';
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = parseDate(dateStr);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function urgencyBadge(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days < 0)  return `<span class="badge badge-red" style="font-size:9px">Encerrado</span>`;
  if (days === 0) return `<span class="badge badge-red" style="font-size:9px">Hoje!</span>`;
  if (days <= 2) return `<span class="badge badge-yellow" style="font-size:9px">${days}d</span>`;
  if (days <= 7) return `<span class="badge badge-blue" style="font-size:9px">${days}d</span>`;
  return '';
}

function renderUpcomingEvents(): void {
  const container = document.getElementById('upcoming-events');
  if (!container) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = eventsData
    .filter((e) => parseDate(e.date) >= today)
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
    .slice(0, 6);

  if (!upcoming.length) {
    container.innerHTML = `<div class="no-events-msg">Nenhum evento próximo.</div>`;
    return;
  }

  container.innerHTML = upcoming
    .map((ev, i) => {
      const d = parseDate(ev.date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = MONTH_NAMES_SHORT[d.getMonth()];
      const urg = urgencyBadge(ev.date);
      return `
        <div class="event-item anim-fade-up" style="animation-delay:${i * 0.06}s;cursor:pointer"
          onclick="navigateTo('calendar');setTimeout(()=>{const y=${d.getFullYear()},m=${d.getMonth()};if(typeof calYear!=='undefined'){window.calYear=y;window.calMonth=m;window.calSelectedDate='${ev.date}';renderCalendar();renderCalendarSidebar('${ev.date}',getFilteredEvents('${ev.date}'));}},150)">
          <div class="event-date-badge"><span class="day">${day}</span><span class="month">${month}</span></div>
          <div class="event-info" style="flex:1;min-width:0">
            <div class="event-title">${ev.title}</div>
            <div class="event-desc">${ev.description && ev.description !== 'NA' ? `<span>${ev.description}</span>` : ''}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
            ${typeToLabel(ev.type)}
            ${urg}
          </div>
        </div>`;
    })
    .join('');
}

function renderNextClass(): void {
  const container = document.getElementById('next-class-info');
  if (!container || !scheduleDataAll) return;

  const now = new Date();
  const currentDayName = DAY_NAMES_FULL[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const sch = scheduleDataAll.schedule ?? {};
  const allClasses = Object.entries(sch).flatMap(([key, courses]) => {
    const semNum = key.split('_')[0];
    return courses.map((c) => ({ ...c, semester: semNum }));
  });

  const todayClasses = allClasses.filter((c) => c.day === currentDayName);
  const currentClass = todayClasses.find((c) => {
    const { start, end } = parseTimeRange(c.time);
    return nowMinutes >= start && nowMinutes <= end;
  });
  const nextToday = todayClasses
    .filter((c) => parseTimeRange(c.time).start > nowMinutes)
    .sort((a, b) => parseTimeRange(a.time).start - parseTimeRange(b.time).start)[0];

  const targetClass = currentClass ?? nextToday;

  if (targetClass) {
    const isNow = !!currentClass;
    container.innerHTML = `
      <div class="next-class-label">${isNow ? '🎓 Aula em andamento' : '⏰ Próxima aula hoje'}</div>
      <div class="next-class-name">${targetClass.course}</div>
      <div class="next-class-meta">
        <div class="next-class-meta-item">${svgIcon('clock')} ${targetClass.time}</div>
        <div class="next-class-meta-item">${svgIcon('calendar')} ${targetClass.day}</div>
        ${targetClass.professor !== '—' ? `<div class="next-class-meta-item">${svgIcon('user')} ${targetClass.professor}</div>` : ''}
        ${targetClass.room !== '—' ? `<div class="next-class-meta-item">${svgIcon('map-pin')} ${targetClass.room}</div>` : ''}
        <div class="next-class-meta-item">${svgIcon('layers')} ${targetClass.semester}º semestre</div>
      </div>`;
  } else {
    const daysOrder = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const todayIdx = daysOrder.indexOf(currentDayName);
    let found = null;
    let foundDay = '';
    for (let i = 1; i <= 7 && !found; i++) {
      const nextDayName = daysOrder[(todayIdx + i) % 7];
      const candidates = allClasses
        .filter((c) => c.day === nextDayName)
        .sort((a, b) => parseTimeRange(a.time).start - parseTimeRange(b.time).start);
      if (candidates.length) { found = candidates[0]; foundDay = nextDayName; }
    }
    if (found) {
      container.innerHTML = `
        <div class="next-class-label">📅 Próxima aula</div>
        <div class="next-class-name">${found.course}</div>
        <div class="next-class-meta">
          <div class="next-class-meta-item">${svgIcon('calendar')} ${foundDay}</div>
          <div class="next-class-meta-item">${svgIcon('clock')} ${found.time}</div>
          ${found.room !== '—' ? `<div class="next-class-meta-item">${svgIcon('map-pin')} ${found.room}</div>` : ''}
          <div class="next-class-meta-item">${svgIcon('layers')} ${found.semester}º semestre</div>
        </div>`;
    } else {
      container.innerHTML = `<div class="no-events-msg">Nenhuma aula cadastrada.</div>`;
    }
  }
}

function renderCountdown(): void {
  const container = document.getElementById('countdown-card');
  if (!container) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = eventsData
    .filter((e) => parseDate(e.date) >= today)
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

  if (!upcoming.length) {
    container.innerHTML = `<div class="countdown-past">Nenhum evento próximo.</div>`;
    return;
  }

  const next = upcoming[0];
  const nextDate = parseDate(next.date);
  const diffMs = nextDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);
  const moreEvents = upcoming.slice(1, 3);

  const moreHtml = moreEvents.length
    ? `<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--glass-border)">
        <div style="font-family:var(--font-mono);font-size:9.5px;color:var(--text-dim);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">Próximos</div>
        ${moreEvents
          .map((e) => {
            const d2 = daysUntil(e.date);
            return `<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted)">
              <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);min-width:28px">${d2}d</span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.title}</span>
              ${typeToLabel(e.type)}
            </div>`;
          })
          .join('')}
      </div>`
    : '';

  container.innerHTML = `
    <div style="position:relative;z-index:2">
      <div class="countdown-event-name" style="cursor:pointer"
        onclick="navigateTo('calendar')">${next.title}</div>
      <div class="countdown-units">
        <div class="countdown-unit">
          <div class="countdown-num">${String(diffDays).padStart(2, '0')}</div>
          <div class="countdown-lbl">${diffDays === 1 ? 'Dia' : 'Dias'}</div>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;align-items:center;justify-content:center;gap:8px">
        ${typeToLabel(next.type)}
        ${urgencyBadge(next.date)}
      </div>
      <div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text-dim);margin-top:8px">${formatDate(next.date)}</div>
    </div>
    ${moreHtml}
  `;
}

// ===== MODAIS =====
function initModals(): void {
  const overlay = document.getElementById('newsletter-modal');
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeNewsletterModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNewsletterModal();
      closeKanbanModal();
      closeSearch();
      closeDevCard();
    }
  });
}

// ===== DEV CARD =====
export function openDevCard(): void {
  document.getElementById('dev-card-overlay')?.classList.remove('hidden');
}
export function closeDevCard(): void {
  document.getElementById('dev-card-overlay')?.classList.add('hidden');
}

// ===== RELÓGIO =====
function updateTime(): void {
  const el = document.getElementById('current-time');
  if (el) {
    el.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
}

// ===== LITE MODE =====
export function toggleLiteMode(): void {
  const isLite = document.body.classList.toggle('lite-mode');
  localStorage.setItem('dasiLiteMode', isLite ? '1' : '0');
  renderLiteBtn();
}

function renderLiteBtn(): void {
  const btn = document.getElementById('lite-mode-btn');
  const status = document.getElementById('lite-status');
  if (!btn || !status) return;
  const isLite = document.body.classList.contains('lite-mode');
  btn.classList.toggle('active', isLite);
  status.textContent = isLite ? 'on' : 'off';
  btn.title = isLite
    ? 'Modo Leve ativado — clique para desativar'
    : 'Ativar Modo Leve (melhora performance em dispositivos lentos)';
}

function loadLiteMode(): void {
  if (localStorage.getItem('dasiLiteMode') === '1') {
    document.body.classList.add('lite-mode');
  }
  document.documentElement.removeAttribute('data-lite');
  renderLiteBtn();
}

// ===== EASTER EGG — CALIGRAFIA =====
function triggerCaligrafiaEasterEgg(): void {
  if (document.getElementById('caligrafia-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'caligrafia-overlay';
  overlay.className = 'caligrafia-overlay';
  overlay.innerHTML = `
    <div class="caligrafia-box">
      <button class="caligrafia-close" onclick="document.getElementById('caligrafia-overlay').remove()">×</button>
      <div class="caligrafia-emoji">✍️</div>
      <div class="caligrafia-secret">— Aula Secreta Desbloqueada —</div>
      <div class="caligrafia-title">Aula de Caligrafia</div>
      <div class="caligrafia-desc">
        Parabéns! Você encontrou uma aula especial.<br>
        A arte da caligrafia é fundamental para qualquer estudante de SI.
      </div>
      <a href="https://youtu.be/dQw4w9WgXcQ?si=b7kZlAuE7yX-D9lP" target="_blank" rel="noopener" class="caligrafia-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Assistir aula
      </a>
      <div class="caligrafia-fine-print">Clique 6x em Estudos para rever esta aula</div>
    </div>
  `;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); }
  });
  document.body.appendChild(overlay);
}

// ===== ATALHOS DE TECLADO =====
document.addEventListener('keydown', (e: KeyboardEvent) => {
  const target = e.target as HTMLElement;
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  ) return;

  if (e.key === 'h' || e.key === 'H') navigateTo('home');
  if (e.key === 'c' || e.key === 'C') navigateTo('calendar');
  if (e.key === 'k' || e.key === 'K') navigateTo('kanban');
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadSavedTheme();
  renderThemeSwitch();
  loadLiteMode();
  createSidebarOverlay();

  const hash = (window.location.hash.replace('#', '') || 'home') as PageKey;
  navigateTo(hash);
  initHome();
  initModals();
  updateTime();

  // PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        console.log('[DaSIboard] SW registrado:', reg.scope);
        if ('Notification' in window && Notification.permission === 'default') {
          setTimeout(() => {
            Notification.requestPermission().then((perm) => {
              if (perm === 'granted') {
                showToast('🔔 Notificações ativadas!', 3500);
              }
            });
          }, 4000);
        }
      })
      .catch((err) => console.warn('[DaSIboard] SW falhou:', err));
  }

  setInterval(updateTime, 1000);
  setInterval(renderHeroGreeting, 60_000);

  window.addEventListener('popstate', () => {
    const page = (window.location.hash.replace('#', '') || 'home') as PageKey;
    navigateTo(page);
  });

  // Expor funções globais necessárias para eventos inline do HTML
  window.navigateTo = navigateTo;
  window.navigateWithFeedback = navigateWithFeedback;
  window.cycleTheme = cycleTheme;
  window.setThemeMode = setThemeMode;
  window.toggleMobileNav = toggleMobileNav;
  window.loadQuoteWidget = loadQuoteWidget;
  window.openDevCard = openDevCard;
  window.closeDevCard = closeDevCard;
  window.toggleLiteMode = toggleLiteMode;
  window.handleProfileClick = handleProfileClick;
  window.toggleProfileMenu = toggleProfileMenu;
  window.closeProfileMenu = closeProfileMenu;
  window.confirmLogout = confirmLogout;
  window.closeLogoutModal = closeLogoutModal;
  window.doLogout = doLogout;
  window.openSearch = openSearch;
  window.closeSearch = closeSearch;
  window.openNewsletterModal = openNewsletterModal;
  window.closeNewsletterModal = closeNewsletterModal;
});
