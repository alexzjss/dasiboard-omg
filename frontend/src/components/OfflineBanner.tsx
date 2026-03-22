// ── Offline Mode + PWA Install Prompt ─────────────────────────────────────────
import { useState, useEffect } from 'react'
import { WifiOff, Wifi, Download, X } from 'lucide-react'

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
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => {
          // Check for updates every 60s
          setInterval(() => reg.update(), 60_000)
          // Listen for new SW waiting
          reg.addEventListener('updatefound', () => {
            const newSW = reg.installing
            newSW?.addEventListener('statechange', () => {
              if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                newSW.postMessage({ type: 'SKIP_WAITING' })
              }
            })
          })
        })
        .catch(err => console.warn('SW registration failed:', err))
    })
  }
}

// ── PWA install prompt hook ────────────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWAInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('dasiboard-pwa-dismissed') === '1'
  )
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true); return
    }
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  const dismiss = () => {
    setDismissed(true)
    localStorage.setItem('dasiboard-pwa-dismissed', '1')
  }

  return { canInstall: !!prompt && !dismissed && !installed, install, dismiss }
}

// ── PWA Install Banner ─────────────────────────────────────────────────────────
export function PWAInstallBanner() {
  const { canInstall, install, dismiss } = usePWAInstall()
  if (!canInstall) return null

  return (
    <div className="fixed bottom-[72px] inset-x-3 md:bottom-6 md:left-auto md:right-6 md:w-80 z-[250] animate-in"
         style={{ borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--accent-1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      <div className="flex items-start gap-3 p-4">
        <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg,var(--accent-1),#7c3aed22)' }}>
          <img src="/logo192.png" alt="DaSIboard" className="w-7 h-7 object-contain" style={{ borderRadius: 6 }}/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Instalar DaSIboard</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Adicione à sua tela inicial para acesso rápido e uso offline</p>
          <div className="flex gap-2 mt-3">
            <button onClick={install}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
                    style={{ background: 'var(--gradient-btn)', color: 'white', boxShadow: '0 2px 8px var(--accent-glow)' }}>
              <Download size={11}/> Instalar
            </button>
            <button onClick={dismiss} className="px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-70"
                    style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              Agora não
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}>
          <X size={12}/>
        </button>
      </div>
    </div>
  )
}

// ── Offline / Back-online Banner ───────────────────────────────────────────────
export function OfflineBanner() {
  const offline = useOfflineDetection()
  const [justCameBack, setJustCameBack] = useState(false)
  const [prevOffline, setPrevOffline]   = useState(offline)

  useEffect(() => {
    if (prevOffline && !offline) {
      setJustCameBack(true)
      setTimeout(() => setJustCameBack(false), 3000)
      // Attempt to flush any queued writes via Background Sync if supported
      navigator.serviceWorker?.ready.then(reg => {
        type SyncReg = { sync?: { register(tag: string): Promise<void> } }
        const syncReg = reg as unknown as SyncReg
        syncReg.sync?.register('dasiboard-sync').catch(() => {})
      }).catch(() => {})
    }
    setPrevOffline(offline)
  }, [offline, prevOffline])

  if (!offline && !justCameBack) return null

  return (
    <div className="fixed top-0 inset-x-0 z-[300] flex items-center justify-center py-2 px-4 animate-in"
         style={{
           background: offline
             ? 'linear-gradient(90deg,rgba(239,68,68,0.95),rgba(220,38,38,0.95))'
             : 'linear-gradient(90deg,rgba(34,197,94,0.95),rgba(22,163,74,0.95))',
           backdropFilter: 'blur(8px)',
           boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
         }}>
      <div className="flex items-center gap-2">
        {offline ? <WifiOff size={14} color="white"/> : <Wifi size={14} color="white"/>}
        <span className="text-white text-xs font-semibold">
          {offline
            ? '📡 Offline — mostrando conteúdo em cache'
            : '✓ Conexão restaurada — sincronizando dados'}
        </span>
      </div>
    </div>
  )
}
