import { useLayoutEffect, useRef, useState } from 'react'

// A página nova renderiza na hora; ao trocar de seção só toca a animação de entrada
// (sem animação sob prefers-reduced-motion, via layout.css).
export function PageTransition({ children, pageKey }: { children: React.ReactNode; pageKey: string }) {
  const [animClass, setAnimClass] = useState('page-enter-active')
  const prevKey = useRef(pageKey)

  useLayoutEffect(() => {
    if (prevKey.current === pageKey) return
    prevKey.current = pageKey
    setAnimClass('page-enter')
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setAnimClass('page-enter-active')) })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
  }, [pageKey])

  return <div className={`page-transition ${animClass}`}>{children}</div>
}
