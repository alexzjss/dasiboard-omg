import { useState, useEffect, useRef, useCallback } from 'react'

/** Delays a value update — useful for search inputs */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/** Persists state to localStorage */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (v: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          console.warn('localStorage write failed:', key)
        }
        return next
      })
    },
    [key],
  )

  return [stored, setValue]
}

/** Calls handler when clicking outside the referenced element */
export function useClickOutside<T extends HTMLElement>(
  handler: () => void,
): React.RefObject<T> {
  const ref = useRef<T>(null)
  useEffect(() => {
    function listener(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler()
      }
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [handler])
  return ref
}

/** Current time string updated every second */
export function useCurrentTime(format: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }): string {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', format),
  )
  useEffect(() => {
    const id = setInterval(
      () => setTime(new Date().toLocaleTimeString('pt-BR', format)),
      1000,
    )
    return () => clearInterval(id)
  }, [format])
  return time
}
