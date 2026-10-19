import { createContext, useContext } from 'react'

export type LayoutContextValue = { openUserMenu: (trigger?: HTMLElement | null) => void }

export const LayoutContext = createContext<LayoutContextValue>({ openUserMenu: () => undefined })

export function useLayout(): LayoutContextValue {
  return useContext(LayoutContext)
}
