/** iPhone/iPad (inclui iPadOS que se anuncia como Mac). Lá a barra de navegação não esconde ao rolar. */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1
}
