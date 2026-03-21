// ── Offline Mode — Service Worker registration + offline banner ───────────────
import { useState, useEffect } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export function useOfflineDetection() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const on  = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  return offline
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('SW registration failed:', err)
      })
    })
  }
}

export function OfflineBanner() {
  const offline = useOfflineDetection()
  const [justCameBack, setJustCameBack] = useState(false)
  const [prevOffline, setPrevOffline] = useState(offline)

  useEffect(() => {
    if (prevOffline && !offline) {
      setJustCameBack(true)
      setTimeout(() => setJustCameBack(false), 3000)
    }
    setPrevOffline(offline)
  }, [offline, prevOffline])

  if (!offline && !justCameBack) return null

  return (
    <div
      className="fixed top-0 inset-x-0 z-[300] flex items-center justify-center py-2 px-4 animate-in"
      style={{
        background: offline
          ? 'linear-gradient(90deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95))'
          : 'linear-gradient(90deg, rgba(34,197,94,0.95), rgba(22,163,74,0.95))',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-center gap-2">
        {offline ? <WifiOff size={14} color="white" /> : <Wifi size={14} color="white" />}
        <span className="text-white text-xs font-semibold">
          {offline ? 'Você está offline — mostrando conteúdo em cache' : '✓ Conexão restaurada'}
        </span>
      </div>
    </div>
  )
}
