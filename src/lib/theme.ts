import { useSyncExternalStore } from 'react'
import { loadThemePref, saveThemePref } from './storage'

export type ThemePref = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const LIGHT_QUERY = '(prefers-color-scheme: light)'

export function isThemePref(v: unknown): v is ThemePref {
  return v === 'system' || v === 'light' || v === 'dark'
}

export function getThemePref(): ThemePref {
  return loadThemePref() ?? 'system'
}

/** Aplica a preferência em <html>. "system" remove o atributo e deixa o CSS seguir o SO. */
export function applyTheme(pref: ThemePref) {
  const root = document.documentElement
  if (pref === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', pref)
}

export function setThemePref(pref: ThemePref) {
  saveThemePref(pref)
  applyTheme(pref)
}

/** Tema efetivo, já resolvendo "system" pelo prefers-color-scheme. */
export function getResolvedTheme(): ResolvedTheme {
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'light' || attr === 'dark') return attr
  try { return window.matchMedia(LIGHT_QUERY).matches ? 'light' : 'dark' } catch { return 'dark' }
}

/** Chama `cb` quando o tema efetivo pode ter mudado (atributo data-theme ou preferência do SO). */
export function subscribeTheme(cb: () => void): () => void {
  const observer = new MutationObserver(cb)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  let mq: MediaQueryList | null = null
  try { mq = window.matchMedia(LIGHT_QUERY); mq.addEventListener('change', cb) } catch { /* sem matchMedia */ }
  return () => { observer.disconnect(); mq?.removeEventListener('change', cb) }
}

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribeTheme, getResolvedTheme, () => 'dark')
}
