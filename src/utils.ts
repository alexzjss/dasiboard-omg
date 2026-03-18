// ===== UTILS — DaSIboard TypeScript =====

import type { TimeRange } from '../types';

// ── Seletor de elemento ──────────────────────────────────────────────────────
export function el<T extends HTMLElement = HTMLElement>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

export function elById<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

// ── Fetch JSON com cache e fallback ─────────────────────────────────────────
export async function fetchJSON<T = unknown>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as T;
  } catch (e) {
    console.warn('[DaSIboard] fetchJSON falhou:', url, (e as Error).message);
    return null;
  }
}

// ── Nomes de dias da semana ──────────────────────────────────────────────────
export const DAY_NAMES_FULL: string[] = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
];

export const DAY_NAMES_SHORT: string[] = [
  'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'
];

export const MONTH_NAMES: string[] = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MONTH_NAMES_SHORT: string[] = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez'
];

// ── Parsear data "YYYY-MM-DD" como local (sem fuso) ──────────────────────────
export function parseDate(str: string | undefined | null): Date {
  if (!str) return new Date(NaN);
  const parts = String(str).split('-').map(Number);
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

// ── Formatar data por extenso: "12 de março de 2026" ────────────────────────
export function formatDate(str: string | undefined | null): string {
  if (!str) return '';
  const d = parseDate(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Formatar data curta: "12 mar" ────────────────────────────────────────────
export function formatDateShort(str: string | undefined | null): string {
  if (!str) return '';
  const d = parseDate(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
}

// ── Data de hoje como "YYYY-MM-DD" ────────────────────────────────────────────
export function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Parsear intervalo de horário "HH:MM-HH:MM" → { start, end } em minutos ──
export function parseTimeRange(timeStr: string | undefined | null): TimeRange {
  if (!timeStr) return { start: 0, end: 0 };
  const parts = String(timeStr).split('-');
  const toMin = (t: string): number => {
    const [h, m] = t.trim().split(':').map(Number);
    return ((h || 0) * 60) + (m || 0);
  };
  return { start: toMin(parts[0] || '0:0'), end: toMin(parts[1] || '0:0') };
}

// ── Saudação por hora do dia ─────────────────────────────────────────────────
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ── Escapar HTML ─────────────────────────────────────────────────────────────
export function escapeHTML(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Alias curto para escapeHTML (compatibilidade) ────────────────────────────
export const escapeHtml = escapeHTML;

// ── Escapar para queries inline em atributos HTML ────────────────────────────
export function escQ(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Ícones SVG inline ─────────────────────────────────────────────────────────
type IconName = 'clock' | 'calendar' | 'user' | 'map-pin' | 'layers';

export function svgIcon(name: IconName): string {
  const icons: Record<IconName, string> = {
    clock: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    calendar: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    user: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    'map-pin': `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    layers: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  };
  return icons[name] ?? '';
}

// ── Badge de tipo de evento ───────────────────────────────────────────────────
export function typeToLabel(type: string | undefined): string {
  const map: Record<string, string> = {
    prova:        `<span class="badge badge-danger">Prova</span>`,
    entrega:      `<span class="badge badge-warning">Entrega</span>`,
    evento:       `<span class="badge badge-success">Evento</span>`,
    apresentacao: `<span class="badge badge-info">Apresentação</span>`,
    deadline:     `<span class="badge badge-orange">Deadline</span>`,
  };
  return map[type ?? ''] ?? `<span class="badge">${escapeHTML(type)}</span>`;
}

// ── Hash string → cor hexadecimal determinística ─────────────────────────────
export function hashStringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 55%)`;
}

// ── Hex com canal alpha → rgba ────────────────────────────────────────────────
export function hexToRgba(hex: string, alpha: number): string {
  // Suporta hsl(...) também
  if (hex.startsWith('hsl')) {
    return hex.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
  }
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── hexAlpha: como hexToRgba mas aceita formato alternativo ─────────────────
export function hexAlpha(hex: string, alpha: number): string {
  return hexToRgba(hex, alpha);
}

// ── Stagger children animation ────────────────────────────────────────────────
export function staggerChildren(container: Element): void {
  Array.from(container.children).forEach((child, i) => {
    (child as HTMLElement).style.animationDelay = `${i * 0.06}s`;
  });
}

// ── Toast global ─────────────────────────────────────────────────────────────
export function showToast(msg: string, duration = 2500): void {
  let toast = document.querySelector<HTMLDivElement>('.dasi-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'dasi-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  const t = toast as HTMLDivElement & { _timeout?: ReturnType<typeof setTimeout> };
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => toast!.classList.remove('show'), duration);
}
