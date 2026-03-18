// ===== ENTIDADES MODULE — DaSIboard TypeScript =====

import { fetchJSON, parseDate, formatDate, MONTH_NAMES_SHORT, escapeHTML } from './utils';

// ── Interfaces ────────────────────────────────────────────────────────────────
interface EntidadeEvento {
  titulo: string;
  data: string;
  tipo: string;
  descricao?: string;
  local?: string;
  link?: string;
}

interface EntidadeNewsletter {
  titulo: string;
  data: string;
  resumo?: string;
  conteudo?: string;
  link?: string;
}

interface EntidadeLink {
  tipo: string; // 'instagram' | 'linkedin' | 'github' | 'site' | etc
  url: string;
  label?: string;
}

interface Entidade {
  id: string;
  nome: string;
  emoji: string;
  tipo: string;
  cor: string;
  corSecundaria?: string;
  descricao: string;
  missao?: string;
  site?: string;
  destaques?: string[];
  links?: EntidadeLink[];
  eventos?: EntidadeEvento[];
  newsletters?: EntidadeNewsletter[];
}

interface EntidadesJSON {
  entidades: Entidade[];
}

// ── Estado do módulo ──────────────────────────────────────────────────────────
let entidadesData: Entidade[] = [];
let entidadeAtiva: Entidade | null = null;

// ── Inicialização ─────────────────────────────────────────────────────────────
export async function initEntidades(): Promise<void> {
  if (!entidadesData.length) {
    const data = await fetchJSON<EntidadesJSON>('./data/entidades.json');
    entidadesData = data?.entidades ?? [];
    (window as any)._entidadesData = entidadesData;
  }
  await mergeCalendarEventsIntoEntidades();
  renderEntidadesHub();
}

// ── HUB ───────────────────────────────────────────────────────────────────────
function renderEntidadesHub(): void {
  const hub = document.getElementById('entidades-hub');
  const detail = document.getElementById('entidade-detalhe');
  if (!hub) return;

  hub.style.display = 'block';
  if (detail) detail.style.display = 'none';
  entidadeAtiva = null;
  syncBackBtn();

  const cards = entidadesData
    .map((e, i) => buildHubCard(e, i))
    .join('');

  hub.innerHTML =
    '<p class="entidades-intro anim-fade-up stagger-1">Entidades estudantis, ligas, grupos e programas do curso de SI — USP/EACH.</p>' +
    '<div class="entidades-grid anim-fade-up stagger-2">' +
    cards +
    '</div>';
}

function buildHubCard(e: Entidade, i: number): string {
  const delay = `${i * 0.05}s`;
  const evCount = e.eventos?.length ?? 0;
  const evLabel = evCount === 1 ? '1 evento' : `${evCount} eventos`;

  return (
    `<button class="entidade-card anim-fade-up"` +
    ` style="animation-delay:${delay};--e-cor:${e.cor};--e-cor2:${e.corSecundaria ?? e.cor}"` +
    ` onclick="openEntidade('${e.id}')">` +
    `<div class="entidade-card-shine"></div>` +
    `<div class="entidade-card-glow"></div>` +
    `<div class="entidade-card-top">` +
      `<span class="entidade-emoji">${e.emoji}</span>` +
      `<span class="entidade-tipo-badge" style="background:${hexAlpha(e.cor, 0.13)};color:${e.cor};border-color:${hexAlpha(e.cor, 0.3)}">${esc(e.tipo)}</span>` +
    `</div>` +
    `<div class="entidade-card-nome">${esc(e.nome)}</div>` +
    `<div class="entidade-card-desc">${esc(e.descricao.slice(0, 115))}${e.descricao.length > 115 ? '…' : ''}</div>` +
    `<div class="entidade-card-footer">` +
      `<span class="entidade-eventos-count">` +
        `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` +
        evLabel +
      `</span>` +
      `<span class="entidade-card-arrow" style="color:${e.cor}">→</span>` +
    `</div>` +
    `</button>`
  );
}

// ── Detalhe ───────────────────────────────────────────────────────────────────
export function openEntidade(id: string): void {
  const e = entidadesData.find((x) => x.id === id);
  if (!e) return;

  entidadeAtiva = e;
  syncBackBtn();

  const hub = document.getElementById('entidades-hub');
  const detail = document.getElementById('entidade-detalhe');
  if (!detail) return;

  if (hub) hub.style.display = 'none';
  detail.style.display = 'block';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const proximos: EntidadeEvento[] = [];
  const passados: EntidadeEvento[] = [];
  (e.eventos ?? []).forEach((ev) => {
    if (parseDate(ev.data) >= today) proximos.push(ev);
    else passados.push(ev);
  });
  proximos.sort((a, b) => parseDate(a.data).getTime() - parseDate(b.data).getTime());
  passados.sort((a, b) => parseDate(b.data).getTime() - parseDate(a.data).getTime());

  detail.innerHTML =
    buildHero(e) +
    buildDestaques(e) +
    buildBodyGrid(e, proximos, passados, today);
}

function buildHero(e: Entidade): string {
  const linksHTML = (e.links ?? [])
    .map(
      (l) =>
        `<a href="${l.url}" target="_blank" rel="noopener" class="entidade-link-btn" style="--lc:${e.cor}">` +
        linkIcon(l.tipo) +
        (l.label ?? l.tipo) +
        `</a>`,
    )
    .join('');

  return `
    <div class="entidade-hero" style="--e-cor:${e.cor};--e-cor2:${e.corSecundaria ?? e.cor}">
      <div class="entidade-hero-content">
        <div class="entidade-hero-emoji">${e.emoji}</div>
        <div>
          <div class="entidade-hero-tipo" style="color:${e.cor}">${esc(e.tipo)}</div>
          <h1 class="entidade-hero-nome">${esc(e.nome)}</h1>
          <p class="entidade-hero-desc">${esc(e.descricao)}</p>
          ${linksHTML ? `<div class="entidade-links-row">${linksHTML}</div>` : ''}
        </div>
      </div>
    </div>`;
}

function buildDestaques(e: Entidade): string {
  if (!e.destaques?.length) return '';
  return `
    <div class="entidade-destaques-row">
      ${e.destaques.map((d) => `<div class="entidade-destaque-pill" style="border-color:${hexAlpha(e.cor, 0.3)};color:${e.cor}">${esc(d)}</div>`).join('')}
    </div>`;
}

function buildBodyGrid(
  e: Entidade,
  proximos: EntidadeEvento[],
  passados: EntidadeEvento[],
  today: Date,
): string {
  return `
    <div class="entidade-body-grid">
      ${buildEventosCol(e, proximos, passados, today)}
      ${buildNewsletterCol(e)}
    </div>`;
}

function buildEventosCol(
  e: Entidade,
  proximos: EntidadeEvento[],
  passados: EntidadeEvento[],
  today: Date,
): string {
  const renderEvent = (ev: EntidadeEvento, isPast: boolean): string => {
    const pd = parseDate(ev.data);
    const day = String(pd.getDate()).padStart(2, '0');
    const month = MONTH_NAMES_SHORT[pd.getMonth()];
    return `
      <div class="entidade-evento-item ${isPast ? 'passado' : ''}">
        <div class="event-date-badge" style="${isPast ? 'opacity:.5' : ''}">
          <span class="day">${day}</span><span class="month">${month}</span>
        </div>
        <div class="entidade-evento-info">
          <div class="entidade-evento-titulo">${esc(ev.titulo)}</div>
          <div class="entidade-evento-meta">
            ${eventBadge(ev.tipo)}
            ${ev.local ? `<span style="font-size:11px;color:var(--text-dim)">📍 ${esc(ev.local)}</span>` : ''}
          </div>
          ${ev.descricao ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${esc(ev.descricao)}</div>` : ''}
          ${ev.link ? `<a href="${ev.link}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" style="margin-top:6px;font-size:11px">Ver evento →</a>` : ''}
        </div>
      </div>`;
  };

  return `
    <div class="entidade-col">
      <div class="section-title">Próximos eventos</div>
      ${proximos.length > 0
        ? proximos.map((ev) => renderEvent(ev, false)).join('')
        : `<div class="no-events-msg">Nenhum evento próximo.</div>`}
      ${passados.length > 0
        ? `<div class="section-title" style="margin-top:18px">Eventos passados</div>` +
          passados.slice(0, 5).map((ev) => renderEvent(ev, true)).join('')
        : ''}
    </div>`;
}

function buildNewsletterCol(e: Entidade): string {
  const nls = e.newsletters ?? [];
  if (!nls.length) return '<div class="entidade-col"></div>';

  return `
    <div class="entidade-col">
      <div class="section-title">Newsletters</div>
      ${nls
        .map(
          (nl, idx) => `
        <div class="newsletter-item" onclick="abrirEntidadeNL('${e.id}', ${idx})" style="cursor:pointer">
          <span class="newsletter-item-date">${formatDate(nl.data)}</span>
          <span class="newsletter-item-title">${esc(nl.titulo)}</span>
          <span class="newsletter-item-arrow">→</span>
        </div>`,
        )
        .join('')}
    </div>`;
}

export function abrirEntidadeNL(entidadeId: string, nlIndex: number): void {
  const e = entidadesData.find((x) => x.id === entidadeId);
  const nl = e?.newsletters?.[nlIndex];
  if (!nl) return;

  const overlay = document.getElementById('newsletter-modal');
  const dateEl = document.getElementById('modal-date');
  const titleEl = document.getElementById('modal-title');
  const contentEl = document.getElementById('modal-content');

  if (dateEl) dateEl.textContent = formatDate(nl.data);
  if (titleEl) titleEl.textContent = nl.titulo;
  if (contentEl) contentEl.textContent = nl.conteudo ?? nl.resumo ?? '';

  overlay?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// ── Botão voltar ──────────────────────────────────────────────────────────────
function syncBackBtn(): void {
  const btn = document.getElementById('entidades-back-btn');
  if (!btn) return;
  btn.style.display = entidadeAtiva ? 'flex' : 'none';
  btn.onclick = () => renderEntidadesHub();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(s: unknown): string {
  return escapeHTML(s);
}

function hexAlpha(hex: string, alpha: number): string {
  if (hex.startsWith('hsl')) return hex.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

function eventBadge(tipo: string): string {
  const map: Record<string, string> = {
    prova: `<span class="badge badge-red">Prova</span>`,
    palestra: `<span class="badge badge-blue">Palestra</span>`,
    workshop: `<span class="badge badge-purple">Workshop</span>`,
    hackathon: `<span class="badge badge-green">Hackathon</span>`,
    reuniao: `<span class="badge">Reunião</span>`,
  };
  return map[tipo?.toLowerCase()] ?? `<span class="badge">${esc(tipo)}</span>`;
}

function linkIcon(tipo: string): string {
  const icons: Record<string, string> = {
    instagram: '📷 ',
    linkedin: '💼 ',
    github: '🐙 ',
    site: '🌐 ',
    discord: '💬 ',
    email: '✉️ ',
  };
  return icons[tipo?.toLowerCase()] ?? '🔗 ';
}

// ── Mesclar eventos do calendário nas entidades ───────────────────────────────
async function mergeCalendarEventsIntoEntidades(): Promise<void> {
  try {
    const data = await fetchJSON<Array<{ entidade?: string; title: string; date: string; type: string; description?: string }>>(
      './data/events.json',
    );
    if (!data) return;

    data.forEach((ev) => {
      if (!ev.entidade) return;
      const e = entidadesData.find((x) => x.id === ev.entidade);
      if (!e) return;
      e.eventos ??= [];
      const alreadyExists = e.eventos.some(
        (x) => x.titulo === ev.title && x.data === ev.date,
      );
      if (!alreadyExists) {
        e.eventos.push({
          titulo: ev.title,
          data: ev.date,
          tipo: ev.type,
          descricao: ev.description,
        });
      }
    });
  } catch {
    // falha silenciosa
  }
}
