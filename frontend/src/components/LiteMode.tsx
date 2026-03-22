// ── Lite Mode — reduz efeitos e animações mantendo o tema atual ───────────────
// Aplica data-lite="1" no <html>, que é usado pelo CSS para desativar
// decorações pesadas enquanto preserva identidade visual do tema.
import { useState, useEffect, useCallback } from 'react'
import { Zap } from 'lucide-react'

const STORAGE_KEY = 'dasiboard-lite-mode'

export function useLiteMode() {
  const [active, setActive] = useState(() =>
    localStorage.getItem(STORAGE_KEY) === '1'
  )

  const toggle = useCallback(() => {
    setActive(v => {
      const next = !v
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      if (next) document.documentElement.setAttribute('data-lite', '1')
      else      document.documentElement.removeAttribute('data-lite')
      return next
    })
  }, [])

  // Apply on mount
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      document.documentElement.setAttribute('data-lite', '1')
    }
  }, [])

  return { active, toggle }
}

// ── Compact icon button for the 3-button tool strip ───────────────────────────
export function LiteModeButton({
  active,
  onToggle,
}: {
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-medium transition-colors active:scale-[0.97]"
      style={{
        background: active ? 'var(--accent-soft)' : 'var(--bg-elevated)',
        border: `1px solid ${active ? 'var(--accent-1)' : 'var(--border)'}`,
        color: active ? 'var(--accent-3)' : 'var(--text-muted)',
      }}
      title={active ? 'Modo Lite ativo — clique para desativar' : 'Modo Lite — reduz efeitos para melhor desempenho'}
      aria-pressed={active}
      aria-label={active ? 'Desativar modo lite' : 'Ativar modo lite'}
    >
      <Zap size={14} style={{ fill: active ? 'currentColor' : 'none' }} />
      <span>Lite</span>
    </button>
  )
}
