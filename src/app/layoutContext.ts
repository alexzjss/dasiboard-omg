import { createContext, useContext } from 'react'

export type LayoutContextValue = {
  openUserMenu: (trigger?: HTMLElement | null) => void
  /** Revalida o contador de pedidos pendentes da navegação. */
  refreshNotifications: () => void
}

export const LayoutContext = createContext<LayoutContextValue>({ openUserMenu: () => undefined, refreshNotifications: () => undefined })

export function useLayout(): LayoutContextValue {
  return useContext(LayoutContext)
}
