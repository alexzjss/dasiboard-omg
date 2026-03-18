// ===== NEWSLETTER MODULE — DaSIboard TypeScript =====

import type { NewsletterItem } from './types';
import { fetchJSON, formatDate, formatDateShort, el, staggerChildren } from './utils';

// ── Estado do módulo ──────────────────────────────────────────────────────────
let newsletterData: NewsletterItem[] = [];

// ── Inicialização ─────────────────────────────────────────────────────────────
export async function initNewsletter(): Promise<void> {
  const data = await fetchJSON<NewsletterItem[]>('./data/newsletter.json');
  newsletterData = data ? [...data].sort((a, b) => b.id - a.id) : [];
  renderNewsletterFeatured();
  renderNewsletterList();
}

// ── Destaque (primeiro item) ──────────────────────────────────────────────────
function renderNewsletterFeatured(): void {
  const container = el<HTMLDivElement>('#newsletter-featured');
  if (!container || !newsletterData.length) return;

  const featured = newsletterData[0];
  container.innerHTML = `
    <div class="newsletter-date">${formatDate(featured.date)}</div>
    <h2 class="newsletter-title">${featured.title}</h2>
    <p class="newsletter-summary">${featured.summary}</p>
    <button class="btn btn-primary" onclick="openNewsletterModal(${featured.id})">
      ${iconRead()}
      Ler artigo completo
    </button>
  `;
}

// ── Lista de edições anteriores ───────────────────────────────────────────────
function renderNewsletterList(): void {
  const container = el<HTMLDivElement>('#newsletter-list');
  if (!container) return;

  const older = newsletterData.slice(1);

  if (!older.length) {
    container.innerHTML = `<div class="empty-state"><p>Nenhuma newsletter anterior.</p></div>`;
    return;
  }

  container.innerHTML = older
    .map(
      (item) => `
      <div class="newsletter-item anim-fade-up" onclick="openNewsletterModal(${item.id})">
        <span class="newsletter-item-date">${formatDateShort(item.date)}</span>
        <span class="newsletter-item-title">${item.title}</span>
        <span class="newsletter-item-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </span>
      </div>`,
    )
    .join('');

  staggerChildren(container);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function openNewsletterModal(id: number): void {
  const item = newsletterData.find((n) => n.id === id);
  if (!item) return;

  const dateEl = el('#modal-date');
  const titleEl = el('#modal-title');
  const contentEl = el('#modal-content');

  if (dateEl) dateEl.textContent = formatDate(item.date);
  if (titleEl) titleEl.textContent = item.title;
  if (contentEl) contentEl.textContent = item.content;

  el('#newsletter-modal')?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

export function closeNewsletterModal(): void {
  el('#newsletter-modal')?.classList.add('hidden');
  document.body.style.overflow = '';
}

// ── Preview na Home ───────────────────────────────────────────────────────────
export async function renderHomeNewsletter(): Promise<void> {
  const container = el<HTMLDivElement>('#home-newsletter');
  if (!container) return;

  if (!newsletterData.length) {
    const data = await fetchJSON<NewsletterItem[]>('./data/newsletter.json');
    newsletterData = data ? [...data].sort((a, b) => b.id - a.id) : [];
  }

  if (!newsletterData.length) {
    container.innerHTML = `<div class="no-events-msg">Nenhuma newsletter disponível.</div>`;
    return;
  }

  const latest = newsletterData[0];
  container.innerHTML = `
    <div class="newsletter-date">${formatDate(latest.date)}</div>
    <div style="font-family:var(--font-display);font-size:16px;font-weight:700;margin-bottom:8px;color:var(--text)">${latest.title}</div>
    <p style="font-size:13px;color:var(--text-muted);line-height:1.6;margin-bottom:16px">${latest.summary}</p>
    <button class="btn btn-ghost" style="font-size:12px" onclick="navigateTo('newsletter');openNewsletterModal(${latest.id})">
      Ler mais →
    </button>
  `;
}

// ── Ícone SVG "ler" ───────────────────────────────────────────────────────────
function iconRead(): string {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`;
}
