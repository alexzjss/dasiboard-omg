import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Pilha de diálogos abertos: só o do topo reage a Esc e Tab.
const openDialogs: HTMLElement[] = []

/**
 * Gerencia o foco de um diálogo/popover: foca o primeiro controle ao abrir (ou o marcado com
 * data-autofocus), prende Tab dentro dele, fecha com Esc e devolve o foco a `restoreTo`
 * (ou a quem tinha o foco antes) ao fechar.
 */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, onClose: () => void, restoreTo?: HTMLElement | null) {
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const previous = restoreTo ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    openDialogs.push(root)
    const items = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    const first = root.querySelector<HTMLElement>('[data-autofocus]') ?? items()[0] ?? root
    first.focus({ preventScroll: true })

    function onKey(e: KeyboardEvent) {
      if (openDialogs[openDialogs.length - 1] !== root) return
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current(); return }
      if (e.key !== 'Tab') return
      const list = items()
      if (list.length === 0) { e.preventDefault(); return }
      const active = document.activeElement
      if (e.shiftKey && (active === list[0] || !root.contains(active))) { e.preventDefault(); list[list.length - 1].focus() }
      else if (!e.shiftKey && (active === list[list.length - 1] || !root.contains(active))) { e.preventDefault(); list[0].focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const i = openDialogs.indexOf(root)
      if (i >= 0) openDialogs.splice(i, 1)
      const active = document.activeElement
      // Só devolve o foco se ele se perdeu junto com o diálogo (não rouba de quem clicou noutro lugar).
      if ((!active || active === document.body || root.contains(active)) && previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [ref, restoreTo])
}
