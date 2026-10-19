import { useEffect, useState } from 'react'

// Keeps the previous page on screen while it fades out, then swaps to the new one.
// While pageKey is unchanged the children are rendered live, so in-page navigation
// (e.g. /entidades -> /entidades/dasi) and state updates are never frozen.
export function PageTransition({ children, pageKey }: { children: React.ReactNode; pageKey: string }) {
  const [shownKey, setShownKey] = useState(pageKey)
  const [snapshot, setSnapshot] = useState(children)
  const [animClass, setAnimClass] = useState('page-enter-active')

  // Remember the last live content so it can stay visible while fading out.
  if (pageKey === shownKey && snapshot !== children) setSnapshot(children)

  useEffect(() => {
    if (pageKey === shownKey) return
    setAnimClass('page-exit')
    const t = setTimeout(() => {
      setShownKey(pageKey)
      setAnimClass('page-enter')
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimClass('page-enter-active')))
    }, 200)
    return () => clearTimeout(t)
  }, [pageKey, shownKey])

  return <div className={`page-transition ${animClass}`}>{pageKey === shownKey ? children : snapshot}</div>
}
