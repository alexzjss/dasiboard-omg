import { useEffect } from 'react'

export function useNebulaAccent(color: string | null) {
  useEffect(() => {
    const root = document.documentElement
    if (color) {
      root.style.setProperty('--nebula-accent', color)
      root.classList.add('nebula-tinted')
    } else {
      root.style.removeProperty('--nebula-accent')
      root.classList.remove('nebula-tinted')
    }
    return () => {
      root.style.removeProperty('--nebula-accent')
      root.classList.remove('nebula-tinted')
    }
  }, [color])
}
