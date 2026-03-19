// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Formata data ISO "YYYY-MM-DD" para "01 jan" */
export function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short',
  })
}

/** Formata data ISO para "01 de janeiro de 2026" */
export function formatDateFull(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

/** Formata datetime ISO para data + hora */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/** Retorna diferença em dias entre hoje e uma data ISO */
export function daysUntil(iso: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(iso + 'T00:00:00')
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

/** Retorna ISO date de hoje "YYYY-MM-DD" */
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── String helpers ───────────────────────────────────────────────────────────

/** Escapa HTML para exibição segura */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Capitaliza primeira letra */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/** Trunca texto com reticências */
export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str
}

/** Gera iniciais de um nome completo */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ─── Color helpers ────────────────────────────────────────────────────────────

/** Adiciona opacidade a uma cor hex: hexAlpha('#ff0000', 0.2) → 'rgba(255,0,0,0.2)' */
export function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── Greeting ─────────────────────────────────────────────────────────────────

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

// ─── Percentage / GPA ─────────────────────────────────────────────────────────

export function absencePercent(absences: number, total: number): number {
  if (total === 0) return 0
  return Math.round((absences / total) * 1000) / 10 // 1 decimal
}

export function absenceStatus(pct: number): 'ok' | 'atencao' | 'perigo' | 'reprovado' {
  if (pct >= 30) return 'reprovado'
  if (pct >= 20) return 'perigo'
  if (pct >= 10) return 'atencao'
  return 'ok'
}

export const ABSENCE_STATUS_LABELS = {
  ok: '✓ Seguro', atencao: '! Atenção', perigo: '⚠ Perigo', reprovado: '✕ Reprovado',
} as const

export const ABSENCE_STATUS_COLORS = {
  ok: 'var(--success)', atencao: 'var(--warning)',
  perigo: '#f97316',    reprovado: 'var(--danger)',
} as const
