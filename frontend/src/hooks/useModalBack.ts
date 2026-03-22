// ── Modal Back Button — intercepts Android/browser back to close modals ───────
import { useEffect } from 'react'

/**
 * Call this hook in any modal/overlay component.
 * When the modal opens it pushes a history state.
 * Pressing Back (Android/browser) fires popstate → closes the modal.
 */
export function useModalBack(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return

    // Push a dummy history state so Back has something to pop
    const id = Math.random().toString(36).slice(2)
    window.history.pushState({ modalId: id }, '')

    const handler = (e: PopStateEvent) => {
      // If user pressed Back (not Forward), close the modal
      if (!e.state?.modalId || e.state.modalId === id) {
        onClose()
      }
    }

    window.addEventListener('popstate', handler)

    return () => {
      window.removeEventListener('popstate', handler)
      // If the modal closed programmatically (not via Back), pop our state
      if (window.history.state?.modalId === id) {
        window.history.back()
      }
    }
  }, [isOpen, onClose])
}
