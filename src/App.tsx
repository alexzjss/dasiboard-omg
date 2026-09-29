import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import './App.css'

import appLogo from './assets/logo.png'
import logoDAsi from './assets/dasi.jpg'
import logoSintese from './assets/sintesejr.jpg'
import logoPetsi from './assets/petsi.jpg'
import logoHype from './assets/hypeusp.jpg'
import logoCodelab from './assets/codelableste.jpg'
import logoEachInTheShell from './assets/eachintheshell.jpg'
import logoConway from './assets/conway.jpg'
import logoCossi from './assets/cossi.jpg'

type User = { name: string; email: string; picture?: string }
type ScheduleEntry = { weekday: number; startsAt: string; endsAt: string; title: string; code: string; room: string; building: string }
type IconName = 'home' | 'calendar' | 'book' | 'more' | 'bell' | 'arrow' | 'clock' | 'check' | 'shield' | 'trash' | 'people' | 'building'

const developmentHomePath = '/dev/home'
const developmentUser: User = { name: 'Estudante Local', email: 'estudante@usp.br' }

const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']

const STORAGE_USER_KEY = 'orbe_user'
const STORAGE_SCHEDULE_PREFIX = 'orbe_schedule_'

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch { return null }
}

function saveStoredUser(user: User | null) {
  try {
    if (user) localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_USER_KEY)
  } catch { /* storage unavailable */ }
}

function scheduleKey(email: string) { return `${STORAGE_SCHEDULE_PREFIX}${email}` }

function loadStoredSchedule(email: string): ScheduleEntry[] | null {
  try {
    const raw = localStorage.getItem(scheduleKey(email))
    if (!raw) return null
    return JSON.parse(raw) as ScheduleEntry[]
  } catch { return null }
}

function saveStoredSchedule(email: string, entries: ScheduleEntry[]) {
  try { localStorage.setItem(scheduleKey(email), JSON.stringify(entries)) }
  catch { /* storage unavailable */ }
}

function clearStoredSchedule(email: string) {
  try { localStorage.removeItem(scheduleKey(email)) }
  catch { /* storage unavailable */ }
}

function getCurrentWeekDays() {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return weekdayLabels.map((label, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return { label, date: String(date.getDate()).padStart(2, '0') }
  })
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    home: 'M3 10.5 12 3l9 7.5M5.5 9v10h13V9M9 19v-5h6v5', calendar: 'M5 4h14a2 2 0 0 1 2 2v13H3V6a2 2 0 0 1 2-2ZM8 2v4M16 2v4M3 9h18',
    book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM4 5.5v16M8 7h8M8 11h8', more: 'M5 12h.01M12 12h.01M19 12h.01',
    building: 'M3 21h18M3 7v14M21 7v14M6 3h12l3 4H3L6 3ZM9 21v-6h6v6',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4', arrow: 'M5 12h14M13 6l6 6-6 6', clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    check: 'm5 12 4 4L19 6', shield: 'M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z',
    trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
    people: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  }
  const fillIcons: IconName[] = ['people']
  const isFill = fillIcons.includes(name)
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" style={isFill ? { fill: 'currentColor', stroke: 'none' } : undefined}><path d={paths[name]} /></svg>
}

export function BottomNav({ activeTab, onSelectTab, className = '', items = [['Início', 'home'], ['Disciplinas', 'book'], ['Docentes', 'people'], ['Entidades', 'building']] as [string, IconName][] }: {
  activeTab: string
  onSelectTab: (tab: string) => void
  className?: string
  items?: [string, IconName][]
}) {
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollingDown = currentScrollY > lastScrollY.current
      const isAtTop = currentScrollY <= 0

      setIsVisible(isAtTop || !scrollingDown)
      lastScrollY.current = currentScrollY
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`bottom-nav ${className} ${isVisible ? 'is-visible' : 'is-hidden'}`.trim()} aria-label="Navegação principal">
      {items.map(([label, icon]) => (
        <button key={label} className={activeTab === label ? 'active' : ''} onClick={() => onSelectTab(label)}>
          <Icon name={icon} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

// ── Space background canvas ───────────────────────────────────────────────────
type SpaceTheme = { nebula: string; star: string; accent: string; glow: string }

const SPACE_THEMES: Record<string, SpaceTheme> = {
  home:       { nebula: '#6450b3', star: '#d8e8ff', accent: '#8b6eff', glow: '#7c5ce830' },
  calendar:   { nebula: '#1e4080', star: '#c8deff', accent: '#5588ff', glow: '#3355cc28' },
  disc:       { nebula: '#1e4040', star: '#c8f0ef', accent: '#3eb8b5', glow: '#2a8c8a28' },
  docentes:   { nebula: '#3a1e50', star: '#e8d8ff', accent: '#b86eff', glow: '#8844cc30' },
  entidades:  { nebula: '#5c2a14', star: '#ffe8cc', accent: '#ff9040', glow: '#cc5500' },
  login:      { nebula: '#1a0c2e', star: '#d8c8ff', accent: '#9060ff', glow: '#6030cc28' },
}

function SpaceCanvas({ theme, liveAccent }: { theme: string; liveAccent?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const frameRef = useRef(0)
  const prevTheme = useRef(theme)
  const blendRef = useRef(1)
  const themeFrom = useRef<SpaceTheme>(SPACE_THEMES[theme] ?? SPACE_THEMES.home)
  const themeTo = useRef<SpaceTheme>(SPACE_THEMES[theme] ?? SPACE_THEMES.home)
  const liveAccentRef = useRef(liveAccent)
  liveAccentRef.current = liveAccent

  const getTheme = useCallback(() => {
    const f = blendRef.current
    if (f >= 1) return themeTo.current
    const lerpStr = (a: string, b: string, t: number) => {
      const pc = (h: string) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)] as [number,number,number]
      const [ar,ag,ab] = pc(a), [br,bg,bb] = pc(b)
      const r = Math.round(ar + (br-ar)*t), g = Math.round(ag + (bg-ag)*t), bl = Math.round(ab + (bb-ab)*t)
      return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bl.toString(16).padStart(2,'0')}`
    }
    return {
      nebula: lerpStr(themeFrom.current.nebula, themeTo.current.nebula, f),
      star:   lerpStr(themeFrom.current.star,   themeTo.current.star,   f),
      accent: lerpStr(themeFrom.current.accent, themeTo.current.accent, f),
      glow:   themeTo.current.glow,
    }
  }, [])

  useEffect(() => {
    if (theme !== prevTheme.current) {
      themeFrom.current = getTheme()
      themeTo.current = SPACE_THEMES[theme] ?? SPACE_THEMES.home
      blendRef.current = 0
      prevTheme.current = theme
    }
  }, [theme, getTheme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    type Star = { x: number; y: number; r: number; speed: number; twinkle: number; phase: number; layer: number }
    type Nebula = { x: number; y: number; rx: number; ry: number; phase: number; speed: number }

    const stars: Star[] = []
    const nebulae: Nebula[] = []

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    function initParticles() {
      stars.length = 0
      nebulae.length = 0
      const count = Math.min(280, Math.floor((window.innerWidth * window.innerHeight) / 5000))
      for (let i = 0; i < count; i++) {
        const layer = Math.random() < 0.3 ? 0 : Math.random() < 0.5 ? 1 : 2
        stars.push({
          x: Math.random(),
          y: Math.random(),
          r: layer === 0 ? 0.4 + Math.random() * 0.5 : layer === 1 ? 0.7 + Math.random() * 0.8 : 1 + Math.random() * 1.2,
          speed: (0.003 + Math.random() * 0.006) * (layer + 1),
          twinkle: 0.3 + Math.random() * 0.7,
          phase: Math.random() * Math.PI * 2,
          layer,
        })
      }
      for (let i = 0; i < 6; i++) {
        nebulae.push({
          x: Math.random(),
          y: Math.random(),
          rx: 0.15 + Math.random() * 0.25,
          ry: 0.10 + Math.random() * 0.18,
          phase: Math.random() * Math.PI * 2,
          speed: 0.0002 + Math.random() * 0.0003,
        })
      }
    }

    function hexToRgb(hex: string) {
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
      return `${r},${g},${b}`
    }

    function draw(time: number) {
      if (!canvas || !ctx) return
      const W = canvas.width, H = canvas.height
      const t = time * 0.001
      const cur = getTheme()
      const live = liveAccentRef.current   // entity-specific accent override

      // Blend transition
      if (blendRef.current < 1) blendRef.current = Math.min(1, blendRef.current + 0.018)

      // Background — slightly tinted when live accent present
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#070a12')
      bg.addColorStop(1, live ? '#0e0a14' : '#0b0f1a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Large entity-accent glow when in entity detail (very dramatic, low alpha)
      if (live) {
        const rgb = hexToRgb(live.length === 7 ? live : '#ff9040')
        // Bottom-left bloom
        const bloom1 = ctx.createRadialGradient(W * 0.15, H * 0.75, 0, W * 0.15, H * 0.75, W * 0.65)
        bloom1.addColorStop(0, `rgba(${rgb},0.18)`)
        bloom1.addColorStop(0.5, `rgba(${rgb},0.07)`)
        bloom1.addColorStop(1, 'transparent')
        ctx.fillStyle = bloom1
        ctx.fillRect(0, 0, W, H)
        // Top-right bloom
        const bloom2 = ctx.createRadialGradient(W * 0.85, H * 0.18, 0, W * 0.85, H * 0.18, W * 0.55)
        bloom2.addColorStop(0, `rgba(${rgb},0.14)`)
        bloom2.addColorStop(0.6, `rgba(${rgb},0.04)`)
        bloom2.addColorStop(1, 'transparent')
        ctx.fillStyle = bloom2
        ctx.fillRect(0, 0, W, H)
      }

      // Nebula clouds (soft, blurred radial gradients)
      for (const neb of nebulae) {
        const nx = (neb.x + Math.sin(t * neb.speed + neb.phase) * 0.06) * W
        const ny = (neb.y + Math.cos(t * neb.speed * 0.7 + neb.phase) * 0.05) * H
        const rx = neb.rx * W, ry = neb.ry * H
        const nebulaColor = live ? live : cur.nebula
        const rad = ctx.createRadialGradient(nx, ny, 0, nx, ny, Math.max(rx, ry))
        rad.addColorStop(0, nebulaColor + '35')
        rad.addColorStop(0.4, nebulaColor + '18')
        rad.addColorStop(1, 'transparent')
        ctx.save()
        ctx.scale(1, ry / rx)
        ctx.beginPath()
        ctx.arc(nx, ny * (rx / ry), rx, 0, Math.PI * 2)
        ctx.fillStyle = rad
        ctx.fill()
        ctx.restore()
      }

      // Accent nebula (brighter center, slow drift)
      const acx = W * (0.5 + Math.sin(t * 0.07) * 0.18)
      const acy = H * (0.32 + Math.cos(t * 0.055) * 0.14)
      const acR = W * (live ? 0.45 : 0.38)
      const accentColor = live ?? cur.accent
      const accRad = ctx.createRadialGradient(acx, acy, 0, acx, acy, acR)
      accRad.addColorStop(0, accentColor + (live ? '22' : '1a'))
      accRad.addColorStop(0.45, accentColor + '0c')
      accRad.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(acx, acy, acR, 0, Math.PI * 2)
      ctx.fillStyle = accRad
      ctx.fill()

      // Secondary accent blob
      const ac2x = W * (0.72 + Math.sin(t * 0.04 + 1.2) * 0.12)
      const ac2y = H * (0.65 + Math.cos(t * 0.035 + 0.8) * 0.1)
      const acc2 = ctx.createRadialGradient(ac2x, ac2y, 0, ac2x, ac2y, W * 0.28)
      acc2.addColorStop(0, accentColor + '14')
      acc2.addColorStop(1, 'transparent')
      ctx.beginPath(); ctx.arc(ac2x, ac2y, W * 0.28, 0, Math.PI * 2)
      ctx.fillStyle = acc2; ctx.fill()

      // Stars with parallax
      for (const s of stars) {
        const parallax = (s.layer + 1) * 0.003
        const sx = ((s.x + t * s.speed * parallax) % 1) * W
        const sy = ((s.y + t * s.speed * 0.3 * parallax) % 1) * H
        const twinkleVal = s.twinkle * (0.5 + 0.5 * Math.sin(t * 1.5 + s.phase))
        const alpha = 0.35 + twinkleVal * 0.65
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2)
        ctx.fillStyle = s.layer === 2 ? accentColor + 'cc' : cur.star
        ctx.fill()
      }

      // Shooting star (occasional)
      const shootCycle = 16
      const shootT = t % shootCycle
      if (shootT < 1.4) {
        const seed = Math.floor(t / shootCycle)
        const sx0 = ((seed * 0.371 % 1)) * W * 0.8
        const sy0 = ((seed * 0.618 % 1)) * H * 0.45
        const progress = shootT / 1.4
        const sx1 = sx0 + W * 0.28 * progress
        const sy1 = sy0 + H * 0.14 * progress
        const trail = 90
        const sGrad = ctx.createLinearGradient(sx1 - trail, sy1 - trail * 0.45, sx1, sy1)
        sGrad.addColorStop(0, 'rgba(255,255,255,0)')
        sGrad.addColorStop(1, `rgba(255,255,255,${(0.85 * (1 - progress)).toFixed(2)})`)
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.moveTo(sx1 - trail, sy1 - trail * 0.45)
        ctx.lineTo(sx1, sy1)
        ctx.strokeStyle = sGrad
        ctx.lineWidth = 1.6
        ctx.stroke()
      }

      ctx.globalAlpha = 1
      frameRef.current++
      rafRef.current = requestAnimationFrame(draw)
    }

    resize()
    initParticles()
    window.addEventListener('resize', () => { resize(); initParticles() })
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [getTheme])

  return <canvas ref={canvasRef} className="space-canvas" aria-hidden="true" />
}

// ── Page transition wrapper ───────────────────────────────────────────────────
function PageTransition({ children, pageKey }: { children: React.ReactNode; pageKey: string }) {
  const [displayed, setDisplayed] = useState(children)
  const [key, setKey] = useState(pageKey)
  const [animClass, setAnimClass] = useState('page-enter-active')

  useEffect(() => {
    if (pageKey === key) return
    setAnimClass('page-exit')
    const t = setTimeout(() => {
      setDisplayed(children)
      setKey(pageKey)
      setAnimClass('page-enter')
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimClass('page-enter-active')))
    }, 200)
    return () => clearTimeout(t)
  }, [pageKey, children, key])

  return <div className={`page-transition ${animClass}`}>{displayed}</div>
}

// ── Onboarding overlay ────────────────────────────────────────────────────────
const ONBOARDING_KEY = 'orbe_onboarding_done'

const ONBOARDING_STEPS = [
  {
    icon: '🌌',
    title: 'Bem-vindo ao daSIboard',
    body: 'Seu painel acadêmico para o curso de Sistemas de Informação da EACH/USP. Tudo em um só lugar, no seu estilo.',
    cta: 'Próximo',
  },
  {
    icon: '📅',
    title: 'Sua grade, sempre à mão',
    body: 'Conecte seu JupiterWeb e veja sua grade horária automaticamente organizada por dia. Sem copiar, sem confusão.',
    cta: 'Próximo',
  },
  {
    icon: '📚',
    title: 'Explore o curso',
    body: 'Veja todas as disciplinas obrigatórias e optativas, pré-requisitos e materiais disponíveis no DriveEACH.',
    cta: 'Próximo',
  },
  {
    icon: '🏛️',
    title: 'Conheça as entidades',
    body: 'DASI, PET-SI, Síntese Jr., Hype USP e muito mais. Acompanhe as publicações e fique por dentro do que acontece.',
    cta: 'Começar',
  },
]

function OnboardingFlow({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [exiting, setExiting] = useState(false)
  const current = ONBOARDING_STEPS[step]
  const isLast = step === ONBOARDING_STEPS.length - 1

  function advance() {
    if (isLast) {
      setExiting(true)
      setTimeout(() => { localStorage.setItem(ONBOARDING_KEY, '1'); onDone() }, 350)
    } else {
      setStep(s => s + 1)
    }
  }

  function skip() {
    setExiting(true)
    setTimeout(() => { localStorage.setItem(ONBOARDING_KEY, '1'); onDone() }, 350)
  }

  return (
    <div className={`onboarding-overlay${exiting ? ' onboarding-exit' : ''}`} role="dialog" aria-modal="true" aria-label="Boas-vindas ao daSIboard">
      <div className="onboarding-panel">
        <div className="onboarding-icon" aria-hidden="true">{current.icon}</div>
        <div className="onboarding-dots" aria-hidden="true">
          {ONBOARDING_STEPS.map((_, i) => <span key={i} className={`onboarding-dot${i === step ? ' active' : ''}`} />)}
        </div>
        <h2 className="onboarding-title">{current.title}</h2>
        <p className="onboarding-body">{current.body}</p>
        <button className="onboarding-cta" onClick={advance}>{current.cta}</button>
        {!isLast && <button className="onboarding-skip" onClick={skip}>Pular introdução</button>}
      </div>
    </div>
  )
}

// ── User profile menu ─────────────────────────────────────────────────────────
function UserMenu({ user, onLogout, onClose, onOpenProfile }: { user: User; onLogout: () => void; onClose: () => void; onOpenProfile: () => void }) {
  const initials = user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <>
      <div className="user-menu-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="user-menu-sheet" role="dialog" aria-label="Menu do usuário">
        <div className="user-menu-handle" aria-hidden="true" />
        <div className="user-menu-header">
          <div className="user-menu-avatar">
            {user.picture ? <img src={user.picture} alt={user.name} /> : <span>{initials}</span>}
          </div>
          <div className="user-menu-info">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
        </div>
        <div className="user-menu-items">
          <button className="user-menu-item" onClick={() => { onOpenProfile(); onClose() }}>
            <svg className="icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            <span>Meu perfil</span>
          </button>
          <button className="user-menu-item user-menu-logout" onClick={() => { onLogout(); onClose() }}>
            <svg className="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            <span>Sair da conta</span>
          </button>
        </div>
      </div>
    </>
  )
}

// ── Profile page ──────────────────────────────────────────────────────────────
function ProfilePage({ user, onBack, onLogout }: { user: User; onBack: () => void; onLogout: () => void }) {
  const initials = user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <main className="app-shell profile-shell">
      <div className="profile-content">
        <button className="ent-back-btn" onClick={onBack} aria-label="Voltar">
          <Icon name="arrow" /><span>Voltar</span>
        </button>
        <div className="profile-hero">
          <div className="profile-avatar-lg">
            {user.picture ? <img src={user.picture} alt={user.name} /> : <span>{initials}</span>}
          </div>
          <div>
            <p className="eyebrow">ESTUDANTE · EACH/USP</p>
            <h1 className="profile-name">{user.name}<span>.</span></h1>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>
        <div className="profile-section">
          <p className="eyebrow">CONTA</p>
          <div className="profile-items">
            <div className="profile-item"><span className="profile-item-label">E-mail</span><span className="profile-item-value">{user.email}</span></div>
            <div className="profile-item"><span className="profile-item-label">Instituição</span><span className="profile-item-value">USP — EACH</span></div>
          </div>
        </div>
        <button className="profile-logout-btn" onClick={onLogout}>
          <svg className="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Sair da conta
        </button>
      </div>
    </main>
  )
}

function LoginScreen({ onLogin }: { onLogin: (credential: string) => Promise<void> }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const [error, setError] = useState('')
  const panelRef = useRef<HTMLElement>(null)

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    if (window.matchMedia('(pointer: coarse)').matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5
    panelRef.current?.style.setProperty('--panel-x', `${horizontal * 18}px`)
    panelRef.current?.style.setProperty('--panel-y', `${vertical * 14}px`)
  }

  async function handleSuccess(response: CredentialResponse) {
    if (!response.credential) return setError('Não foi possível concluir o login.')
    try { await onLogin(response.credential) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível concluir o login.') }
  }

  return <main className="login-shell" onPointerMove={handlePointerMove} onPointerLeave={() => { panelRef.current?.style.setProperty('--panel-x', '0px'); panelRef.current?.style.setProperty('--panel-y', '0px') }}>
    <SpaceCanvas theme="login" />
    <section className="login-panel" ref={panelRef}>
      <div className="login-brand"><img src={appLogo} alt="daSIboard" className="login-brand-logo" /></div>
      <div className="login-copy"><p className="eyebrow">SEU CAMPUS, MAIS PERTO</p><h1>Olá, estudante<span>.</span></h1><p>Entre para acessar sua rotina acadêmica na USP em um só lugar.</p></div>
      <div className="login-action">
        {clientId ? <div className="google-login-wrap"><GoogleLogin onSuccess={handleSuccess} onError={() => setError('O login foi cancelado. Tente novamente.')} useOneTap={false} theme="outline" shape="pill" size="large" text="signin_with" width="320" /></div> : <div className="setup-message"><Icon name="shield" /><span>Configure `VITE_GOOGLE_CLIENT_ID` para ativar o login Google.</span></div>}
        {error && <p className="login-error" role="alert">{error}</p>}
        <p className="login-note"><Icon name="shield" /> Acesso exclusivo para contas <strong>@usp.br</strong></p>
      </div>
      <p className="login-footer">Ao continuar, você concorda com o uso dos dados necessários para personalizar sua experiência acadêmica.</p>
    </section>
  </main>
}

// ── Disciplinas data ──────────────────────────────────────────────────────────

type Discipline = { code: string; name: string; credAula: number; credTrab: number; ch: number; ce?: number; cp?: number; atpa?: number; ext?: number; driveUrl?: string; prereqs?: { code: string; name: string; type: string }[] }
type Period = { label: string; disciplines: Discipline[] }

// GitHub DriveEACH/drivesi URLs — only disciplines that have a folder in the repo
const BASE = 'https://github.com/driveeach/drivesi/tree/master'
const OBR  = `${BASE}/Materias%20Obrigatorias`
const OPT  = `${BASE}/Materias%20Optativas`
const DRIVE_URLS: Record<string, string> = {
  // ── Obrigatórias ──
  // 1º Semestre
  'ACH2011': `${OBR}/1%C2%BA%20Semestre/Calc%20I%20-%20Ca%CC%81lculo%20I`,
  'ACH2014': `${OBR}/1%C2%BA%20Semestre/FSI%20-%20Fundamentos%20de%20Sistemas%20de%20Informac%CC%A7a%CC%83o`,
  'ACH2001': `${OBR}/1%C2%BA%20Semestre/IP%20-%20Introduc%CC%A7a%CC%83o%20a%20Programac%CC%A7a%CC%83o`,
  // 2º Semestre
  'ACH2023': `${OBR}/2%C2%BA%20Semestre/AED%20I%20-%20Algoritmos%20e%20Estruturas%20de%20Dados%20I`,
  'ACH2012': `${OBR}/2%C2%BA%20Semestre/Calc%20II%20-%20Ca%CC%81lculo%20II`,
  'ACH2002': `${OBR}/2%C2%BA%20Semestre/IAA%20-%20Introduc%CC%A7a%CC%83o%20a%CC%80%20Ana%CC%81lise%20de%20Algoritmos`,
  'ACH2013': `${OBR}/2%C2%BA%20Semestre/MD%20-%20Matema%CC%81tica%20Discreta%20I`,
  'ACH2033': `${OBR}/2%C2%BA%20Semestre/MVGA%20-%20Matrizes,%20Vetores%20e%20Geometria%20Anali%CC%81tica`,
  // 3º Semestre
  'ACH2024': `${OBR}/3%C2%BA%20Semestre/AED%20II%20-%20Algoritmos%20e%20Estruturas%20de%20Dados%20II`,
  'ACH2003': `${OBR}/3%C2%BA%20Semestre/COO%20-%20Computac%CC%A7a%CC%83o%20Orientada%20a%20Objetos`,
  'ACH2063': `${OBR}/3%C2%BA%20Semestre/IAC%20-%20Introduc%CC%A7a%CC%83o%20a%CC%80%20Administrac%CC%A7a%CC%83o%20para%20Computac%CC%A7a%CC%83o`,
  'ACH2053': `${OBR}/3%C2%BA%20Semestre/IE%20-%20Introduc%CC%A7a%CC%83o%20a%CC%80%20Estati%CC%81stica`,
  'ACH2034': `${OBR}/3%C2%BA%20Semestre/OAC%20I%20-%20Organizac%CC%A7a%CC%83o%20e%20Arquitetura%20de%20Computadores%20I`,
  // 4º Semestre
  'ACH2055': `${OBR}/4%C2%BA%20Semestre/AC%20-%20Arquitetura%20de%20Computadores`,
  'ACH2004': `${OBR}/4%C2%BA%20Semestre/BD%20-%20Banco%20de%20Dados`,
  'ACH2043': `${OBR}/4%C2%BA%20Semestre/ITC%20-%20Introduc%CC%A7a%CC%83o%20a%CC%80%20Teoria%20da%20Computac%CC%A7a%CC%83o`,
  'ACH2036': `${OBR}/4%C2%BA%20Semestre/MQAAE%20-%20Me%CC%81todos%20Quantitativos%20Aplicados%20a%CC%80%20Administrac%CC%A7a%CC%83o%20de%20Empresas%20I`,
  'ACH2026': `${OBR}/6%C2%BA%20Semestre/RC%20-%20Redes%20de%20Computadores`,
  'ACH2044': `${OBR}/4%C2%BA%20Semestre/SO%20-%20Sistemas%20Operacionais`,
  // 5º Semestre
  'ACH2005': `${OBR}/5%C2%BA%20Semestre/IHC%20-%20Ana%CC%81lise,%20Projeto%20e%20Interface%20Humano-Computador`,
  'ACH2016': `${OBR}/5%C2%BA%20Semestre/IA%20-%20Intelige%CC%82ncia%20Artificial`,
  'ACH2025': `${OBR}/5%C2%BA%20Semestre/LBD%20-%20Laborato%CC%81rio%20de%20Bancos%20de%20Dados`,
  'ACH2147': `${OBR}/5%C2%BA%20Semestre/DSID%20-%20Desenvolvimento%20de%20Sistemas%20de%20Informa%C3%A7%C3%A3o%20Distribu%C3%ADdos`,
  // 6º Semestre
  'ACH0042': `${OBR}/6%C2%BA%20Semestre/RP%20II%20-%20Resoluc%CC%A7a%CC%83o%20de%20Problemas%20II`,
  'ACH2006': `${OBR}/6%C2%BA%20Semestre/ESI%20I%20-%20Engenharia%20de%20Sistemas%20de%20Informac%CC%A7a%CC%83o%20I`,
  'ACH2027': `${OBR}/6%C2%BA%20Semestre/PGP%20-%20Pra%CC%81tica%20e%20Gerenciamento%20de%20Projetos`,
  // 7º Semestre
  'ACH2017': `${OBR}/7%C2%BA%20Semestre/PSG%20I%20-%20Projeto%20Supervisionado%20ou%20de%20Graduac%CC%A7a%CC%83o%20I`,
  // 8º Semestre
  'ACH2008': `${OBR}/8%C2%BA%20Semestre/EI%20-%20Empreendedores%20em%20Informatica`,
  'ACH2018': `${OBR}/8%C2%BA%20Semestre/PSG%20II%20-%20Projeto%20Supervisionado%20ou%20de%20Graduac%CC%A7a%CC%83o%20II`,
  'ACH2098': `${OBR}/8%C2%BA%20Semestre/Web%20Sem%C3%A2ntica`,
  // ── Optativas ──
  // 7º Semestre
  'ACH2117': `${OPT}/7%C2%BA%20Semestre/CG%20-%20Computac%CC%A7a%CC%83o%20Gra%CC%81fica`,
  'ACH2107': `${OPT}/7%C2%BA%20Semestre/DP%20I%20-Desafios%20de%20Programac%CC%A7a%CC%83o%20I`,
  'ACH2067': `${OPT}/7%C2%BA%20Semestre/GPN%20-%20Gesta%CC%83o%20de%20Processos%20de%20Nego%CC%81cios`,
  'ACH2076': `${OPT}/7%C2%BA%20Semestre/SI%20-%20Seguranc%CC%A7a%20da%20Informac%CC%A7a%CC%83o`,
  'ACH2077': `${OPT}/7%C2%BA%20Semestre/SWSL%20-%20Soluc%CC%A7o%CC%83es%20Web%20Baseadas%20em%20Software%20Livre`,
  // 8º Semestre
  'ACH2108': `${OPT}/8%C2%BA%20Semestre/DP%20II%20-%20Desafios%20de%20Programac%CC%A7a%CC%83o%20II`,
  'ACH2078': `${OPT}/8%C2%BA%20Semestre/GE%20-%20Gesta%CC%83o%20Empresarial`,
}

const obrigatoriasData: Period[] = [
  {
    label: '1º Período Ideal',
    disciplines: [
      { code: 'ACH0021', name: 'Tratamento e Análise de Dados / Informações', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0041', name: 'Resolução de Problemas I', credAula: 4, credTrab: 0, ch: 60, ext: 45 },
      { code: 'ACH2001', name: 'Introdução à Programação', credAula: 4, credTrab: 2, ch: 120 },
      { code: 'ACH2011', name: 'Cálculo I', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2014', name: 'Fundamentos de Sistemas de Informação', credAula: 4, credTrab: 2, ch: 120 },
    ],
  },
  {
    label: '2º Período Ideal',
    disciplines: [
      { code: 'ACH2002', name: 'Introdução à Análise de Algoritmos', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2001', name: 'Introdução à Programação', type: 'Requisito fraco' }] },
      { code: 'ACH2012', name: 'Cálculo II', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2011', name: 'Cálculo I', type: 'Requisito' }] },
      { code: 'ACH2013', name: 'Matemática Discreta I', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2023', name: 'Algoritmos e Estruturas de Dados I', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2002', name: 'Introdução à Análise de Algoritmos', type: 'Indicação de Conjunto' }, { code: 'ACH2001', name: 'Introdução à Programação', type: 'Requisito fraco' }] },
      { code: 'ACH2033', name: 'Matrizes, Vetores e Geometria Analítica', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2011', name: 'Cálculo I', type: 'Requisito fraco' }] },
    ],
  },
  {
    label: '3º Período Ideal',
    disciplines: [
      { code: 'ACH2003', name: 'Computação Orientada a Objetos', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2001', name: 'Introdução à Programação', type: 'Requisito fraco' }] },
      { code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2023', name: 'Algoritmos e Estruturas de Dados I', type: 'Requisito fraco' }] },
      { code: 'ACH2034', name: 'Organização e Arquitetura de Computadores I', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2013', name: 'Matemática Discreta I', type: 'Requisito fraco' }] },
      { code: 'ACH2053', name: 'Introdução à Estatística', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH0021', name: 'Tratamento e Análise de Dados / Informações', type: 'Requisito fraco' }, { code: 'ACH2012', name: 'Cálculo II', type: 'Requisito fraco' }] },
      { code: 'ACH2063', name: 'Introdução à Administração e Economia para Computação', credAula: 4, credTrab: 0, ch: 60 },
    ],
  },
  {
    label: '4º Período Ideal',
    disciplines: [
      { code: 'ACH2004', name: 'Bancos de Dados 1', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2003', name: 'Computação Orientada a Objetos', type: 'Requisito fraco' }] },
      { code: 'ACH2026', name: 'Redes de Computadores', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2034', name: 'Organização e Arquitetura de Computadores I', type: 'Requisito fraco' }] },
      { code: 'ACH2036', name: 'Métodos Quantitativos para Análise Multivariada', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2053', name: 'Introdução à Estatística', type: 'Requisito fraco' }] },
      { code: 'ACH2044', name: 'Sistemas Operacionais', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2034', name: 'Organização e Arquitetura de Computadores I', type: 'Requisito fraco' }] },
      { code: 'ACH2055', name: 'Organização e Arquitetura de Computadores II', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2034', name: 'Organização e Arquitetura de Computadores I', type: 'Requisito fraco' }] },
    ],
  },
  {
    label: '5º Período Ideal',
    disciplines: [
      { code: 'ACH2005', name: 'Análise, Projeto e Interface Humano-Computador', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2003', name: 'Computação Orientada a Objetos', type: 'Requisito fraco' }] },
      { code: 'ACH2016', name: 'Inteligência Artificial', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }] },
      { code: 'ACH2025', name: 'Bancos de Dados 2', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2004', name: 'Bancos de Dados 1', type: 'Requisito fraco' }] },
      { code: 'ACH2043', name: 'Introdução à Teoria da Computação', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2013', name: 'Matemática Discreta I', type: 'Requisito fraco' }] },
      { code: 'ACH2147', name: 'Desenvolvimento de Sistemas de Informação Distribuídos', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2004', name: 'Bancos de Dados 1', type: 'Requisito fraco' }, { code: 'ACH2044', name: 'Sistemas Operacionais', type: 'Requisito fraco' }] },
    ],
  },
  {
    label: '6º Período Ideal',
    disciplines: [
      { code: 'ACH0042', name: 'Resolução de Problemas II', credAula: 4, credTrab: 0, ch: 60, ext: 45, prereqs: [{ code: 'ACH2003', name: 'Computação Orientada a Objetos', type: 'Requisito fraco' }] },
      { code: 'ACH2006', name: 'Engenharia de Sistemas de Informação I', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2005', name: 'Análise, Projeto e Interface Humano-Computador', type: 'Requisito fraco' }] },
      { code: 'ACH2008', name: 'Empreendedorismo em Informática', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2003', name: 'Computação Orientada a Objetos', type: 'Requisito fraco' }] },
      { code: 'ACH2027', name: 'Gestão de Projetos de Tecnologia da Informação', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2005', name: 'Análise, Projeto e Interface Humano-Computador', type: 'Requisito fraco' }] },
    ],
  },
  {
    label: '7º Período Ideal',
    disciplines: [
      { code: 'ACH2017', name: 'Projeto Supervisionado ou de Graduação I', credAula: 0, credTrab: 8, ch: 240, ce: 240, ext: 72, prereqs: [{ code: 'ACH2004', name: 'Bancos de Dados 1', type: 'Requisito fraco' }] },
    ],
  },
  {
    label: '8º Período Ideal',
    disciplines: [
      { code: 'ACH2018', name: 'Projeto Supervisionado ou de Graduação II', credAula: 0, credTrab: 8, ch: 240, ce: 240, ext: 72, prereqs: [{ code: 'ACH2017', name: 'Projeto Supervisionado ou de Graduação I', type: 'Requisito fraco' }] },
    ],
  },
]

const optativasData: Period[] = [
  {
    label: '1º Período Ideal',
    disciplines: [
      { code: 'ACH0141', name: 'Sociedade, Multiculturalismo e Direitos – Estado e Sociedade', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0151', name: 'Sociedade, Multiculturalismo e Direitos - Cultura Digital', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0161', name: 'Sociedade, Multiculturalismo e Direitos – Direitos Humanos e Multiculturalismo', credAula: 2, credTrab: 0, ch: 30 },
    ],
  },
  {
    label: '3º Período Ideal',
    disciplines: [
      { code: 'ACH2107', name: 'Desafios de Programação I', credAula: 4, credTrab: 2, ch: 120, ext: 60, prereqs: [{ code: 'ACH2023', name: 'Algoritmos e Estruturas de Dados I', type: 'Requisito fraco' }] },
    ],
  },
  {
    label: '6º Período Ideal',
    disciplines: [
      { code: 'ACH0102', name: 'Psicologia, Educação e Temas Contemporâneos', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0112', name: 'Psicologia, Educação e Temas Contemporâneos - Uma Visão Psicanalítica', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0122', name: 'Psicologia, Educação e Temas Contemporâneos – Processos Sociais de Formação dos Indivíduos', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0132', name: 'Psicologia, Educação e Temas Contemporâneos - Uma Abordagem Crítica', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0162', name: 'Arte, Literatura e Cultura', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0172', name: 'Arte, Literatura e Cultura - Arte Contemporânea', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0182', name: 'Arte, Literatura e Cultura – Fantasia e Ficção Científica na Cultura Pop', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0192', name: 'Arte, Literatura e Cultura - Literatura Contemporânea', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'MAC0216', name: 'Técnicas de Programação I', credAula: 4, credTrab: 2, ch: 120 },
    ],
  },
  {
    label: '7º Período Ideal',
    disciplines: [
      { code: 'ACH0101', name: 'Ciências da Natureza - Ciências da Terra', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0111', name: 'Ciências da Natureza - Ciências da Vida', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0121', name: 'Ciências da Natureza - Ciências do Universo', credAula: 2, credTrab: 0, ch: 30, cp: 20 },
      { code: 'ACH0131', name: 'Ciências da Natureza - Ciência, Cultura e Sociedade', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH2007', name: 'Engenharia de Sistemas de Informação II', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2006', name: 'Engenharia de Sistemas de Informação I', type: 'Requisito fraco' }] },
      { code: 'ACH2015', name: 'Contabilidade para Computação', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2066', name: 'Tópicos Especiais em Bancos de Dados', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2025', name: 'Bancos de Dados 2', type: 'Requisito fraco' }] },
      { code: 'ACH2067', name: 'Gestão de Processos de Negócio', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2014', name: 'Fundamentos de Sistemas de Informação', type: 'Requisito fraco' }, { code: 'ACH2027', name: 'Gestão de Projetos de Tecnologia da Informação', type: 'Requisito fraco' }] },
      { code: 'ACH2076', name: 'Segurança da Informação', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2034', name: 'Organização e Arquitetura de Computadores I', type: 'Requisito fraco' }] },
      { code: 'ACH2077', name: 'Soluções Web Baseadas em Software Livre', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2004', name: 'Bancos de Dados 1', type: 'Requisito fraco' }] },
      { code: 'ACH2087', name: 'Construção de Compiladores', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }, { code: 'ACH2043', name: 'Introdução à Teoria da Computação', type: 'Requisito fraco' }] },
      { code: 'ACH2117', name: 'Computação Gráfica', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2023', name: 'Algoritmos e Estruturas de Dados I', type: 'Requisito fraco' }, { code: 'ACH2033', name: 'Matrizes, Vetores e Geometria Analítica', type: 'Requisito fraco' }] },
      { code: 'ACH2127', name: 'Governança de Tecnologia da Informação', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2014', name: 'Fundamentos de Sistemas de Informação', type: 'Requisito fraco' }, { code: 'ACH2027', name: 'Gestão de Projetos de Tecnologia da Informação', type: 'Requisito fraco' }] },
      { code: 'ACH2137', name: 'Tópicos em Planejamento em Inteligência Artificial', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }] },
      { code: 'ACH2157', name: 'Computação Física e Aplicações', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }] },
      { code: 'ACH2167', name: 'Computação Sônica', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2023', name: 'Algoritmos e Estruturas de Dados I', type: 'Requisito fraco' }] },
      { code: 'ACH2177', name: 'Introdução à Ciência de Dados', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2004', name: 'Bancos de Dados 1', type: 'Requisito fraco' }, { code: 'ACH2053', name: 'Introdução à Estatística', type: 'Requisito fraco' }] },
      { code: 'ACH2187', name: 'Mineração de Dados', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2016', name: 'Inteligência Artificial', type: 'Requisito fraco' }, { code: 'ACH2053', name: 'Introdução à Estatística', type: 'Requisito fraco' }] },
      { code: 'ACH2197', name: 'Análise de Redes Sociais', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }] },
      { code: 'ACH2207', name: 'Computação Sonora e Musical', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2011', name: 'Cálculo I', type: 'Requisito fraco' }, { code: 'ACH2023', name: 'Algoritmos e Estruturas de Dados I', type: 'Requisito fraco' }] },
      { code: 'ACH2217', name: 'Sistemas de Informação na Área Financeira', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2063', name: 'Introdução à Administração e Economia para Computação', type: 'Requisito fraco' }] },
      { code: 'ACH2221', name: 'Estudos Avançados em Sistemas de Informação 1', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2222', name: 'Estudos Avançados em Sistemas de Informação 2', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2223', name: 'Estudos Avançados em Sistemas de Informação 3', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH3778', name: 'Governo Aberto', credAula: 4, credTrab: 2, ch: 120 },
      { code: 'MAC0471', name: 'Desenvolvimento para Web', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2001', name: 'Introdução à Programação', type: 'Requisito' }] },
      { code: 'MAC0475', name: 'Laboratório de Sistemas Computacionais Complexos', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2006', name: 'Engenharia de Sistemas de Informação I', type: 'Requisito' }] },
      { code: 'MAC0546', name: 'Fundamentos da Internet das Coisas', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'MAC0216', name: 'Técnicas de Programação I', type: 'Requisito' }] },
    ],
  },
  {
    label: '8º Período Ideal',
    disciplines: [
      { code: 'ACH0142', name: 'Sociedade, Meio Ambiente e Cidadania – Desenvolvimento e Meio Ambiente', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0152', name: 'Sociedade, Meio Ambiente e Cidadania - Sociedade, Ambiente e Cidadania', credAula: 2, credTrab: 0, ch: 30 },
      { code: 'ACH0636', name: 'Realidade virtual, e-sports e inteligência artificial', credAula: 4, credTrab: 1, ch: 90 },
      { code: 'ACH2028', name: 'Qualidade de Software', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2005', name: 'Análise, Projeto e Interface Humano-Computador', type: 'Requisito fraco' }, { code: 'ACH2006', name: 'Engenharia de Sistemas de Informação I', type: 'Requisito fraco' }] },
      { code: 'ACH2037', name: 'Métodos Quantitativos Aplicados à Sistemas de Informação', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2036', name: 'Métodos Quantitativos para Análise Multivariada', type: 'Requisito fraco' }] },
      { code: 'ACH2038', name: 'Laboratório de Redes de Computadores', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2026', name: 'Redes de Computadores', type: 'Requisito fraco' }] },
      { code: 'ACH2048', name: 'Redes de Alto Desempenho', credAula: 4, credTrab: 1, ch: 90, prereqs: [{ code: 'ACH2026', name: 'Redes de Computadores', type: 'Requisito fraco' }] },
      { code: 'ACH2068', name: 'Avaliação de Desempenho de Sistemas Computacionais', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2005', name: 'Análise, Projeto e Interface Humano-Computador', type: 'Requisito fraco' }, { code: 'ACH2006', name: 'Engenharia de Sistemas de Informação I', type: 'Requisito fraco' }] },
      { code: 'ACH2078', name: 'Gestão Empresarial', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2086', name: 'Fundamentos de Sistemas Hipermídia e Web', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2005', name: 'Análise, Projeto e Interface Humano-Computador', type: 'Requisito fraco' }] },
      { code: 'ACH2096', name: 'Laboratório de Sistemas Operacionais', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }, { code: 'ACH2044', name: 'Sistemas Operacionais', type: 'Requisito fraco' }] },
      { code: 'ACH2098', name: 'Web Semântica', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2004', name: 'Bancos de Dados 1', type: 'Requisito fraco' }, { code: 'ACH2013', name: 'Matemática Discreta I', type: 'Requisito fraco' }] },
      { code: 'ACH2106', name: 'Projeto Integrado de Sistemas de Informação', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2003', name: 'Computação Orientada a Objetos', type: 'Requisito fraco' }, { code: 'ACH2005', name: 'Análise, Projeto e Interface Humano-Computador', type: 'Requisito fraco' }] },
      { code: 'ACH2108', name: 'Desafios de Programação II', credAula: 4, credTrab: 2, ch: 120, ext: 60, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }] },
      { code: 'ACH2118', name: 'Introdução ao Processamento de Língua Natural', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2016', name: 'Inteligência Artificial', type: 'Requisito fraco' }] },
      { code: 'ACH2128', name: 'Introdução às Redes Complexas', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }, { code: 'ACH2033', name: 'Matrizes, Vetores e Geometria Analítica', type: 'Requisito fraco' }, { code: 'ACH2053', name: 'Introdução à Estatística', type: 'Requisito fraco' }] },
      { code: 'ACH2138', name: 'Modelagem de Sistemas Complexos', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2053', name: 'Introdução à Estatística', type: 'Requisito fraco' }] },
      { code: 'ACH2148', name: 'Laboratório de Otimização Combinatória', credAula: 4, credTrab: 0, ch: 60, prereqs: [{ code: 'ACH2024', name: 'Algoritmos e Estruturas de Dados II', type: 'Requisito fraco' }] },
      { code: 'ACH2158', name: 'Simulação de Sistemas Complexos', credAula: 4, credTrab: 2, ch: 120, prereqs: [{ code: 'ACH2001', name: 'Introdução à Programação', type: 'Requisito fraco' }, { code: 'ACH2053', name: 'Introdução à Estatística', type: 'Requisito fraco' }] },
      { code: 'ACH2178', name: 'Tópicos em Privacidade Usável', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2188', name: 'Introdução à Pesquisa Operacional', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2198', name: 'Laboratório de Projetos de Software Livre/Aberto', credAula: 0, credTrab: 0, ch: 0, ext: 120 },
      { code: 'ACH2224', name: 'Estudos Avançados em Sistemas de Informação 4', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2225', name: 'Estudos Avançados em Sistemas de Informação 5', credAula: 4, credTrab: 0, ch: 60 },
      { code: 'ACH2226', name: 'Estudos Avançados em Sistemas de Informação 6', credAula: 4, credTrab: 0, ch: 60 },
    ],
  },
]

// ── Graph coloring ────────────────────────────────────────────────────────────
// Each "chain" is defined by a root discipline code and a colour palette.
// Colors propagate downstream through the prereq graph.
const GRAPH_CHAINS: { root: string; color: string; label: string }[] = [
  { root: 'ACH2001', color: '#7c5ce8', label: 'Programação' },        // purple
  { root: 'ACH2011', color: '#0ea5a0', label: 'Cálculo' },            // teal
  { root: 'ACH2013', color: '#e86c5c', label: 'Matemática Discreta' },// red-orange
  { root: 'ACH2014', color: '#d97c2e', label: 'Fund. SI' },           // amber
  { root: 'ACH0021', color: '#5b9bd5', label: 'Dados' },              // blue
  { root: 'ACH2063', color: '#7cad58', label: 'Adm/Econ' },           // green
]
const CHAIN_NEUTRAL = '#525a6e'

function computeNodeColors(periods: Period[]): Map<string, string> {
  // Build flat discipline map
  const discMap = new Map<string, Discipline>()
  for (const p of periods) for (const d of p.disciplines) discMap.set(d.code, d)

  // BFS propagation: assign color of the first chain that reaches each node
  const colors = new Map<string, string>()

  // Seed roots
  for (const chain of GRAPH_CHAINS) {
    if (discMap.has(chain.root)) colors.set(chain.root, chain.color)
  }

  // Multiple passes to propagate (max depth = 8 semesters)
  let changed = true
  while (changed) {
    changed = false
    for (const p of periods) {
      for (const d of p.disciplines) {
        if (colors.has(d.code)) continue
        if (!d.prereqs) continue
        // Find the first prereq that already has a color
        for (const req of d.prereqs) {
          if (colors.has(req.code)) {
            colors.set(d.code, colors.get(req.code)!)
            changed = true
            break
          }
        }
      }
    }
  }

  // Remaining uncolored nodes
  for (const p of periods) {
    for (const d of p.disciplines) {
      if (!colors.has(d.code)) colors.set(d.code, CHAIN_NEUTRAL)
    }
  }
  return colors
}

// ── Graph view component ──────────────────────────────────────────────────────
type EdgeInfo = { fromCode: string; toCode: string; color: string }
type NodeRect = { code: string; x: number; y: number; w: number; h: number }

function DisciplinasGraph({ periods }: { periods: Period[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState<EdgeInfo[]>([])
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 })
  const colors = useRef(computeNodeColors(periods)).current

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const rects = new Map<string, NodeRect>()

    container.querySelectorAll<HTMLElement>('[data-code]').forEach((el) => {
      const code = el.dataset.code!
      const r = el.getBoundingClientRect()
      rects.set(code, {
        code,
        x: r.left - containerRect.left,
        y: r.top - containerRect.top,
        w: r.width,
        h: r.height,
      })
    })

    const newEdges: EdgeInfo[] = []
    for (const p of periods) {
      for (const d of p.disciplines) {
        if (!d.prereqs) continue
        for (const req of d.prereqs) {
          if (rects.has(req.code) && rects.has(d.code)) {
            newEdges.push({ fromCode: req.code, toCode: d.code, color: colors.get(req.code) ?? CHAIN_NEUTRAL })
          }
        }
      }
    }

    setSvgSize({ w: container.scrollWidth, h: container.scrollHeight })
    setEdges(newEdges)
  }, [periods, colors])

  function buildPath(edge: EdgeInfo) {
    const container = containerRef.current
    if (!container) return ''
    const containerRect = container.getBoundingClientRect()
    const fromEl = container.querySelector<HTMLElement>(`[data-code="${edge.fromCode}"]`)
    const toEl = container.querySelector<HTMLElement>(`[data-code="${edge.toCode}"]`)
    if (!fromEl || !toEl) return ''
    const fr = fromEl.getBoundingClientRect()
    const tr = toEl.getBoundingClientRect()
    // Offset by container's viewport position AND add scroll to get content-space coords
    const ox = containerRect.left - container.scrollLeft
    const oy = containerRect.top - container.scrollTop

    const x1 = fr.right - ox
    const y1 = fr.top - oy + fr.height / 2
    const x2 = tr.left - ox
    const y2 = tr.top - oy + tr.height / 2
    const cx = (x1 + x2) / 2
    return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`
  }

  return (
    <div className="disc-graph-wrap" ref={containerRef}>
      <svg
        className="disc-graph-svg"
        width={svgSize.w}
        height={svgSize.h}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        {edges.map((e) => {
          const d = buildPath(e)
          if (!d) return null
          return (
            <path
              key={`${e.fromCode}-${e.toCode}`}
              d={d}
              stroke={e.color}
              strokeWidth="1.5"
              strokeOpacity="0.55"
              fill="none"
              strokeDasharray="none"
            />
          )
        })}
      </svg>

      <div className="disc-graph-grid">
        {periods.map((period, pIdx) => (
          <div key={period.label} className="disc-graph-col">
            <div className="disc-graph-col-header">
              <span className="disc-graph-sem-num">{pIdx + 1}º</span>
              <span className="disc-graph-sem-label">sem.</span>
            </div>
            <div className="disc-graph-col-nodes">
              {period.disciplines.map((disc) => {
                const color = colors.get(disc.code) ?? CHAIN_NEUTRAL
                const driveUrl = DRIVE_URLS[disc.code]
                return (
                  <div
                    key={disc.code}
                    data-code={disc.code}
                    className={`disc-graph-node${driveUrl ? ' disc-graph-node-linked' : ''}`}
                    style={{ '--node-color': color } as React.CSSProperties}
                    title={driveUrl ? `${disc.code} — ${disc.name}\nClique para abrir no DriveEACH` : `${disc.code} — ${disc.name}\n${disc.credAula}A ${disc.credTrab}T · ${disc.ch}h`}
                    onClick={driveUrl ? () => window.open(driveUrl, '_blank', 'noopener') : undefined}
                    role={driveUrl ? 'link' : undefined}
                    tabIndex={driveUrl ? 0 : undefined}
                    onKeyDown={driveUrl ? (e: React.KeyboardEvent) => e.key === 'Enter' && window.open(driveUrl, '_blank', 'noopener') : undefined}
                  >
                    <span className="disc-graph-node-code">{disc.code}</span>
                    <span className="disc-graph-node-name">{disc.name}</span>
                    {driveUrl && (
                      <span className="disc-graph-node-drive">
                        <svg viewBox="0 0 10 10" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 1.5H1.5a.5.5 0 0 0-.5.5v6a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5V6M6 1h3v3M9 1 4.5 5.5"/></svg>
                        Drive
                      </span>
                    )}
                    {(disc.ce != null && disc.ce > 0 || disc.ext != null && disc.ext! > 0) && (
                      <span className="disc-graph-node-ext">
                        {disc.ce && disc.ce > 0 ? `CE ${disc.ce}h` : ''}
                        {disc.ext && disc.ext > 0 ? ` EXT ${disc.ext}h` : ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="disc-graph-legend">
        {GRAPH_CHAINS.map((chain) => (
          <span key={chain.root} className="disc-graph-legend-item">
            <span className="disc-graph-legend-dot" style={{ background: chain.color }} />
            {chain.label}
          </span>
        ))}
        <span className="disc-graph-legend-item">
          <span className="disc-graph-legend-dot" style={{ background: CHAIN_NEUTRAL }} />
          Isoladas
        </span>
      </div>
    </div>
  )
}

function DisciplinasView({ activeTab, onSelectTab }: { activeTab: string; onSelectTab: (tab: string) => void }) {
  const [section, setSection] = useState<'obrigatorias' | 'optativas'>('obrigatorias')
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list')
  const periods = section === 'obrigatorias' ? obrigatoriasData : optativasData

  return <main className="app-shell disc-shell">
    <div className="disc-content">
      <section className="disc-heading">
        <div><p className="eyebrow">SISTEMAS DE INFORMAÇÃO · EACH/USP</p><h1>Disciplinas<span>.</span></h1><p className="disc-caption">Grade curricular do curso.</p></div>
      </section>
      <div className="disc-controls">
        <div className="disc-tabs">
          <button className={`disc-tab${section === 'obrigatorias' ? ' active' : ''}`} onClick={() => setSection('obrigatorias')}>Obrigatórias</button>
          <button className={`disc-tab${section === 'optativas' ? ' active' : ''}`} onClick={() => setSection('optativas')}>Optativas Eletivas</button>
        </div>
        <div className="disc-view-toggle">
          <button className={`disc-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')} title="Visualização em lista">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>
            Lista
          </button>
          <button
            className={`disc-view-btn${viewMode === 'graph' ? ' active' : ''}`}
            onClick={() => setViewMode('graph')}
            title="Visualização em grafo"
            disabled={section === 'optativas'}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="3" cy="8" r="1.8"/><circle cx="13" cy="4" r="1.8"/><circle cx="13" cy="12" r="1.8"/><line x1="4.8" y1="7.1" x2="11.2" y2="4.9"/><line x1="4.8" y1="8.9" x2="11.2" y2="11.1"/></svg>
            Grafo
          </button>
        </div>
      </div>

      {viewMode === 'graph' && section === 'obrigatorias'
        ? <DisciplinasGraph periods={periods} />
        : <div className="disc-periods">
            {periods.map((period) => (
              <section key={period.label} className="disc-period">
                <h2 className="disc-period-label">{period.label}</h2>
                <div className="disc-list">
                  {period.disciplines.map((disc) => {
                    const driveUrl = DRIVE_URLS[disc.code]
                    return (
                    <article
                      key={disc.code}
                      className={`disc-card${driveUrl ? ' disc-card-linked' : ''}`}
                      onClick={driveUrl ? () => window.open(driveUrl, '_blank', 'noopener') : undefined}
                      role={driveUrl ? 'link' : undefined}
                      tabIndex={driveUrl ? 0 : undefined}
                      onKeyDown={driveUrl ? (e) => e.key === 'Enter' && window.open(driveUrl, '_blank', 'noopener') : undefined}
                      title={driveUrl ? `Abrir ${disc.name} no DriveEACH` : undefined}
                    >
                      <div className="disc-card-main">
                        <span className="disc-code">{disc.code}</span>
                        <span className="disc-name">{disc.name}</span>
                        <div className="disc-badges">
                          {driveUrl && (
                            <span className="disc-badge disc-badge-drive" title="Material disponível no DriveEACH">
                              <svg viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7M7 1h4v4M11 1 5.5 6.5"/></svg>
                              Drive
                            </span>
                          )}
                          <span className="disc-badge disc-badge-aula" title="Créditos Aula">{disc.credAula}A</span>
                          <span className="disc-badge disc-badge-trab" title="Créditos Trabalho">{disc.credTrab}T</span>
                          <span className="disc-badge disc-badge-ch" title="Carga horária">{disc.ch}h</span>
                          {disc.ce != null && disc.ce > 0 && <span className="disc-badge disc-badge-ce" title="Carga horária de Estágio">CE {disc.ce}h</span>}
                          {disc.cp != null && disc.cp > 0 && <span className="disc-badge disc-badge-cp" title="Práticas como Componentes Curriculares">CP {disc.cp}h</span>}
                          {disc.ext != null && disc.ext > 0 && <span className="disc-badge disc-badge-ext" title="Atividades Extensionistas">EXT {disc.ext}h</span>}
                        </div>
                      </div>
                      {disc.prereqs && disc.prereqs.length > 0 && (
                        <div className="disc-prereqs">
                          {disc.prereqs.map((req) => (
                            <span key={req.code} className={`disc-prereq${req.type === 'Requisito' ? ' strong' : ''}`}>
                              {req.code} — {req.name} <em>{req.type}</em>
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
      }
    </div>
    <BottomNav activeTab={activeTab} onSelectTab={onSelectTab} />
  </main>
}

// ── Docentes data ─────────────────────────────────────────────────────────────
type Docente = { nome: string; curso: string; email: string; sala: string; lattes: string; orcid: string; telefone: string; pesquisa: string }

const docentesData: Docente[] = [
  { nome: 'Adriana Caroci Becker', curso: 'Obstetrícia', email: 'acaroci@usp.br', sala: '204 C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Assistência ao parto: modelos, agentes e práticas; A mulher no ciclo vital.' },
  { nome: 'Adriana Pedrosa Biscaia Tufaile', curso: 'Licenciatura em Ciências da Natureza', email: 'atufaile@usp.br', sala: '320 C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8167', pesquisa: 'Sistemas Dinâmicos; Caos Experimental; Fluidos Complexos; Caos Quântico.' },
  { nome: 'Adriana Schneider Dallolio', curso: 'Marketing', email: 'adriana.dallolio@usp.br', sala: 'I-1 202 C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Cultura de Consumo, Comportamento do Consumidor, Mídias Sociais' },
  { nome: 'Adriano Schwartz', curso: 'Têxtil e Moda', email: 'aschwart@usp.br', sala: '302 E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1048', pesquisa: 'Teoria literária e ficção contemporânea' },
  { nome: 'Agnaldo Valentin', curso: 'Gestão de Políticas Públicas', email: 'guiligui@usp.br', sala: 'A1-T04 C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Demografia da escravidão; Arquivos Públicos e políticas públicas; Políticas públicas e desenvolvimento econômico' },
  { nome: 'Alberto Tufaile', curso: 'Licenciatura em Ciências da Natureza', email: 'tufaile@usp.br', sala: '332 F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1049', pesquisa: 'Caos Experimental; Sistemas Dinâmicos; Materia Mole; Teoria da Complexidade' },
  { nome: 'Alessandro Hervaldo Nicolai Ré', curso: 'Educação Física e Saúde', email: 'alehnre@usp.br', sala: 'A1-104 J', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Esporte para crianças e adolescentes; Análise de jogo nas modalidades esportivas coletivas.' },
  { nome: 'Alessandro Soares da Silva', curso: 'Gestão de Políticas Públicas', email: 'alessoares@usp.br', sala: '320 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8877', pesquisa: 'Psicologia Política e Políticas Públicas; Ações Coletivas e Movimentos Sociais; Minorias e Processos de Inclusão' },
  { nome: 'Alex Antonio Florindo', curso: 'Educação Física e Saúde', email: 'aflorind@usp.br', sala: '251 F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8157', pesquisa: 'Epidemiologia da Atividade Física; Programas de Atividade Física na Comunidade' },
  { nome: 'Alexandre Ferreira Ramos', curso: 'Sistemas de Informação', email: 'alex.ramos@usp.br', sala: 'A1-104 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Modelagem matemática da expressão gênica; Biologia sistêmica.' },
  { nome: 'Alexandre Panosso Netto', curso: 'Lazer e Turismo', email: 'panosso@usp.br', sala: 'I1-337D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8848', pesquisa: 'Educação em Lazer e Turismo; Produção Científica em Turismo; Planejamento Turístico.' },
  { nome: 'Alexandre Ribeiro Leichsenring', curso: 'Gestão de Políticas Públicas', email: 'alexandre.leichsenring@usp.br', sala: '', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Alexandre Toshiro Igari', curso: 'Gestão Ambiental', email: 'alexandre.igari@usp.br', sala: 'A1-T04Q', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8862', pesquisa: 'Vetores socioeconômicos para conservação ambiental; Contabilidade e finanças aplicadas à gestão ambiental.' },
  { nome: 'Ana Amélia Benedito Silva', curso: 'Sistemas de Informação', email: 'aamelia@usp.br', sala: '301 G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1053', pesquisa: '' },
  { nome: 'Ana Carla Bliacheriene', curso: 'Gestão de Políticas Públicas', email: 'acb@usp.br', sala: 'I1 - 301C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8172', pesquisa: 'Eficiência e transparência da administração pública' },
  { nome: 'Ana Paula Fracalanza', curso: 'Gestão Ambiental', email: 'fracalan@usp.br', sala: '304 G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1056', pesquisa: '' },
  { nome: 'André Carlos Busanelli de Aquino', curso: 'EACH', email: 'aaquino@usp.br', sala: '', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Andre Cavalcanti Rocha Martins', curso: 'Sistemas de Informação', email: 'amartins@usp.br', sala: '319 F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1057', pesquisa: 'Sociofísica; Sistemas complexos; Modelos de agentes; Dinâmica de opiniões.' },
  { nome: 'André Felipe Simões', curso: 'Gestão Ambiental', email: 'afsimoes@usp.br', sala: 'A1-210 J', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8135', pesquisa: 'Planejamento Energético; Mitigação e Adaptação das Mudanças Climáticas.' },
  { nome: 'André Fontan Köhler', curso: 'Lazer e Turismo', email: 'afontan@usp.br', sala: '322 D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8158', pesquisa: 'Estratégia e teoria dos jogos em lazer e turismo; Turismo cultural.' },
  { nome: 'André Gal Mountian', curso: 'Gestão de Políticas Públicas', email: 'amountian@usp.br', sala: '104R-A1', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Desenvolvimento econômico e políticas públicas; envelhecimento populacional.' },
  { nome: 'Andrea Cavicchioli', curso: 'Gestão Ambiental', email: 'andrecav@usp.br', sala: '350 G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1058', pesquisa: 'Impactos ambientais sobre bens culturais; Impactos da poluição em ambientes fechados.' },
  { nome: 'Andrea Leite Rodrigues', curso: 'Marketing', email: 'andrealeiterodrigues@usp.br', sala: 'A1-204 F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Andrea Lopes', curso: 'Gerontologia', email: 'andrealopes@usp.br', sala: 'A1-T10M', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8878', pesquisa: 'Envelhecimento, Aparência e Significado' },
  { nome: 'Andrea Lucchesi', curso: 'Marketing', email: 'a.lucchesi.2107@gmail.com', sala: 'A1-104 R', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Angela Megumi Ochiai', curso: 'Obstetrícia', email: 'angelaochiai@usp.br', sala: 'A1-T04 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '2648-0076', pesquisa: '' },
  { nome: 'Anna Karenina Azevedo Martins', curso: 'Obstetrícia', email: 'karenina@usp.br', sala: '252/254', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8159', pesquisa: 'Efeitos dos ácidos graxos sobre o metabolismo de células beta pancreáticas.' },
  { nome: 'Antonio Calixto de Souza Filho', curso: 'Licenciatura em Ciências da Natureza', email: 'acsouzafilho@usp.br', sala: '', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Antonio Carlos Sarti', curso: 'Lazer e Turismo', email: 'asarti@usp.br', sala: 'A1-T10 N', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Antonio Takao Kanamaru', curso: 'Têxtil e Moda', email: 'kanamaru@usp.br', sala: 'A1-T04 A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8127', pesquisa: 'Função social e educacional da arte e do design na cultura brasileira e latino-americana' },
  { nome: 'Ariane Machado Lima', curso: 'Sistemas de Informação', email: 'ariane.machado@usp.br', sala: 'A1-210 N', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Beatriz Aparecida Ozello Gutierrez', curso: 'Gerontologia', email: 'biagutierrez@yahoo.com.br', sala: '251 G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8832', pesquisa: '' },
  { nome: 'Beatriz Cavalheiro Crittelli', curso: 'Licenciatura em Ciências da Natureza', email: 'beatriz.crittelli@usp.br', sala: 'A1-110J', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Inclusão; Ensino de surdos; Libras; Ensino de ciências e surdocegueira.' },
  { nome: 'Beatriz Helena Fonseca Ferreira Pires', curso: 'Têxtil e Moda', email: 'beatrizferreirapires@usp.br', sala: '338 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '2648-0136', pesquisa: 'Arte, mídia e sociedade; Moda; Movimentos sociais; Interferências e modificações corporais.' },
  { nome: 'Bianca Alves de Oliveira Zorzam', curso: 'Obstetrícia', email: 'bianca.zorzam@usp.br', sala: 'I1-303 E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Direitos sexuais e reprodutivos; Humanização do parto; Saberes decoloniais.' },
  { nome: 'Bibiana Graeff Chagas Pinto', curso: 'Gerontologia', email: 'bibiana.graeff@usp.br', sala: '252/254', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Gerontologia' },
  { nome: 'Caio Pompéia Ribeiro Neto', curso: 'Gestão Ambiental', email: 'cpompeia@usp.br', sala: 'I1-355 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Antropologia, meio ambiente e ruralidades; Direitos indígenas; Mudanças climáticas.' },
  { nome: 'Camilla Borelli', curso: 'Têxtil e Moda', email: 'cborelli@usp.br', sala: 'I1-339 C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Engenharia têxtil; Conforto termofisiológico; Wearables; Têxteis eletrônicos.' },
  { nome: 'Camilo Rodrigues Neto', curso: 'Sistemas de Informação', email: 'camiloneto@usp.br', sala: '322 O', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1063', pesquisa: 'Dinâmica de sistemas complexos; Caos e séries temporais.' },
  { nome: 'Carla Morsello', curso: 'Gestão Ambiental', email: 'morsello@usp.br', sala: '350 D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1064', pesquisa: 'Conservação Biológica; Desenvolvimento local e Meio Ambiente; Ecologia Humana' },
  { nome: 'Carlos Bandeira de Mello Monteiro', curso: 'Educação Física e Saúde', email: 'carlosmonteiro@usp.br', sala: 'A1-T04D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8141', pesquisa: 'Atividade Física por meio de jogos eletrônicos; Esporte adaptado' },
  { nome: 'Carlos de Brito Pereira', curso: 'Têxtil e Moda', email: 'carlosbp@usp.br', sala: '301 D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1065', pesquisa: 'Interface entre Economia e Marketing; Efeito Veblen; Difusão de Inovações' },
  { nome: 'Carlos Henrique Barbosa Gonçalves', curso: 'Licenciatura em Ciências da Natureza', email: 'bgcarlos@usp.br', sala: '319 E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1066', pesquisa: '' },
  { nome: 'Carlos Molina Mendes', curso: 'Licenciatura em Ciências da Natureza', email: 'cmolina@usp.br', sala: '322 I', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1067', pesquisa: 'Gravitação; Teoria de Campos; Física de Buracos Negros.' },
  { nome: 'Cassio de Miranda Meira Junior', curso: 'Educação Física e Saúde', email: 'cmj@usp.br', sala: '302 C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8836', pesquisa: 'Diferenças individuais motoras; Aprendizagem, avaliação e intervenção motora.' },
  { nome: 'Cecilia Olivieri', curso: 'Gestão de Políticas Públicas', email: 'cecilia.olivieri@usp.br', sala: 'A1-T04R', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8177', pesquisa: '' },
  { nome: 'Celi Rodrigues Chaves Dominguez', curso: 'Licenciatura em Ciências da Natureza', email: 'celi@usp.br', sala: '304F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8118', pesquisa: '' },
  { nome: 'Celia Regina Maganha e Melo', curso: 'Obstetrícia', email: 'celiamelo@usp.br', sala: 'A1-110Q', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'O cuidar em saúde da mulher e do recém-nascido: serviços, agentes, modelos.' },
  { nome: 'Christiane Borges do Nascimento Chofakian', curso: 'Obstetrícia', email: 'chris@usp.br', sala: 'I1-357 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8874', pesquisa: '' },
  { nome: 'Claudia Inés Garcia', curso: 'Sistemas de Informação', email: 'claudiag@ime.usp.br', sala: '202 G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8884', pesquisa: '' },
  { nome: 'Claudia Medeiros de Castro', curso: 'Obstetrícia', email: 'claudia.medeiros@usp.br', sala: '204 D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Claudia Regina Garcia Vicentini', curso: 'Têxtil e Moda', email: 'claudiagarcia@usp.br', sala: '357 G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8162', pesquisa: 'Processos criativos e metodologias de projeto em design de têxtil e moda' },
  { nome: 'Claudia Rosa Acevedo', curso: 'Marketing', email: 'acevedocampanario@usp.br', sala: 'A1-T10I', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Clodoaldo Aparecido de Moraes Lima', curso: 'Sistemas de Informação', email: 'cmoraeslima@gmail.com', sala: 'A1-104N', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Cristiane Kerches da Silva Leite', curso: 'Gestão de Políticas Públicas', email: 'crisk@usp.br', sala: 'I1-253C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Análise de políticas públicas; indicadores sociais e avaliação de políticas públicas.' },
  { nome: 'Cristiano Luis Lenzi', curso: 'Gestão Ambiental', email: 'clenzi@usp.br', sala: '304 E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1069', pesquisa: 'Sociologia Ambiental; Política Ambiental' },
  { nome: 'Cristiano Mazur Chiessi', curso: 'Gestão Ambiental', email: 'chiessi@usp.br', sala: 'A1-T04N', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '2648-0124', pesquisa: 'Late Quaternary paleoceanography and paleoclimatology; Millennial climate variability.' },
  { nome: 'Cristina Adams', curso: 'Gestão Ambiental', email: 'cadams@usp.br', sala: '334 D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1072', pesquisa: 'Ecologia Humana; Ecologia Nutricional; Ecologia Histórica' },
  { nome: 'Cristina Landgraf Lee', curso: 'Educação Física e Saúde', email: 'crislee@usp.br', sala: '334 F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1073', pesquisa: 'Interação social, emoções e comportamentos no esporte; Estresse e ansiedade.' },
  { nome: 'Cynthia Harumy Watanabe Correa', curso: 'Lazer e Turismo', email: 'cynthiacorrea@usp.br', sala: 'A1-210G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Daniel de Angelis Cordeiro', curso: 'Sistemas de Informação', email: 'daniel.cordeiro@usp.br', sala: 'I1 352D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '2648-0149', pesquisa: 'Computação Distribuída e de Alto Desempenho' },
  { nome: 'Dária Gorete Jaremtchuk', curso: 'Têxtil e Moda', email: 'dariaj@usp.br', sala: '302 F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1074', pesquisa: '' },
  { nome: 'David Diniz Dantas', curso: 'Gestão de Políticas Públicas', email: 'dddantas@usp.br', sala: 'A1-T04K', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Direito Constitucional; Interpretação Constitucional; Administração Pública.' },
  { nome: 'Delhi Teresa Paiva Salinas', curso: 'Gestão Ambiental', email: 'delhi@usp.br', sala: '322 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8163', pesquisa: '' },
  { nome: 'Deusivania Vieira da Silva Falcão', curso: 'Gerontologia', email: 'deusivania@usp.br', sala: 'A1-204R', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8892', pesquisa: 'Envelhecimento, Família, Relações Sociais e Promoção da Saúde.' },
  { nome: 'Dib Karam Junior', curso: 'Têxtil e Moda', email: 'dib.karam@usp.br', sala: '337 F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '2648-0088', pesquisa: '' },
  { nome: 'Diego Antonio Falceta Gonçalves', curso: 'Licenciatura em Ciências da Natureza', email: 'dfalceta@usp.br', sala: 'A1-T10J', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '2648-0133', pesquisa: 'Astrofísica Estelar; Astrofísica Galáctica; Astrofísica de Plasmas.' },
  { nome: 'Diósnio Machado Neto', curso: 'Ciclo Básico', email: 'dmneto@usp.br', sala: 'I1-337c', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Processos Históricos, Ideológicos e Documentais da Música Brasileira.' },
  { nome: 'Dominique Mouette', curso: 'Gestão Ambiental', email: 'dominiquem@usp.br', sala: '252/254', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Dora Mariela Salcedo Barrientos', curso: 'Obstetrícia', email: 'dorabarrientos@usp.br', sala: 'A1-110N', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Violência em Saúde; Saúde Coletiva; Gravidez na Adolescência; Terapia Comunitária.' },
  { nome: 'Douglas Roque Andrade', curso: 'Educação Física e Saúde', email: 'douglas.andrade@usp.br', sala: 'A1-204P', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Promoção da atividade física; Avaliação de políticas e programas' },
  { nome: 'Edegar Luís Tomazzoni', curso: 'Lazer e Turismo', email: 'eltomazzoni@usp.br', sala: 'I1- 303H', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '2648-0059', pesquisa: '' },
  { nome: 'Edemilson Antunes de Campos', curso: 'Obstetrícia', email: 'edicampos@usp.br', sala: '337 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8903', pesquisa: '' },
  { nome: 'Edmir Parada Vasques Prado', curso: 'Sistemas de Informação', email: 'eprado@usp.br', sala: 'A1-110M', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8893', pesquisa: '' },
  { nome: 'Edmur Antonio Stoppa', curso: 'Lazer e Turismo', email: 'stoppa@usp.br', sala: '303 D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8870', pesquisa: '' },
  { nome: 'Ednilson Viana', curso: 'Gestão Ambiental', email: 'ednilson.viana@gmail.com', sala: 'A1-T04L', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Eduardo de Lima Caldas', curso: 'Gestão de Políticas Públicas', email: 'eduardocaldas@usp.br', sala: 'A1-210E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Eimear Bernadette Dolan', curso: 'Educação Física e Saúde', email: 'eimeardolan@usp.br', sala: 'A1-T04H', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Fisiologia do Exercício; Nutrição esportiva; Fisiologia de mulheres atletas.' },
  { nome: 'Elaine Cristina Borges', curso: 'Marketing', email: 'profelaineborges@gmail.com', sala: 'A1-104D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Finanças, Investimentos, Finanças Comportamentais, Mercado de Capitais.' },
  { nome: 'Elizabete Franco Cruz', curso: 'Obstetrícia', email: 'betefranco@usp.br', sala: 'A1-104Q', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8907', pesquisa: '' },
  { nome: 'Esteban Fernandez Tuesta', curso: 'Sistemas de Informação', email: 'tuesta111@hotmail.com', sala: '320 E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1077', pesquisa: '' },
  { nome: 'Ester Gammardella Rizzi', curso: 'Gestão de Políticas Públicas', email: 'ester.rizzi@usp.br', sala: 'I1 - 253H', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Judicialização de políticas públicas; Direito à Educação; Liberdade de expressão.' },
  { nome: 'Eunice Almeida da Silva', curso: 'Obstetrícia', email: 'eunice.almeida@usp.br', sala: '210 L', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Eutimio Gustavo Fernández Núñez', curso: 'Biotecnologia', email: 'egfnunez@usp.br', sala: 'A1-104C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Engenharia de Bioprocessos' },
  { nome: 'Evandro Mateus Moretto', curso: 'Gestão Ambiental', email: 'evandromm@usp.br', sala: '339 D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8806', pesquisa: 'Desenvolvimento e Meio Ambiente; Avaliação de Impacto Ambiental' },
  { nome: 'Fabiana de Sant\'Anna Evangelista', curso: 'Educação Física e Saúde', email: 'fabiana_evangelista@yahoo.com.br', sala: '355 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8855', pesquisa: 'Estudo genética do controle do peso corporal em animais de experimentação' },
  { nome: 'Fábio Nakano', curso: 'Sistemas de Informação', email: 'fabionakano@usp.br', sala: 'A1-204E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Fátima de Lourdes dos Santos Nunes Marques', curso: 'Sistemas de Informação', email: 'fatima.nunes@usp.br', sala: 'A1-210P', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Felipe Gonçalves Brasil', curso: 'Gestão de Políticas Públicas', email: 'felipe.brasil@usp.br', sala: 'I1-204 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1004', pesquisa: 'Políticas Públicas; Análise do Processo Decisório; Agenda-setting; Formulação de política pública.' },
  { nome: 'Felipe Santiago Chambergo Alcalde', curso: 'Educação Física e Saúde', email: 'fscha@usp.br', sala: '204 G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8164', pesquisa: 'Análise da rede regulatória transcricional em fungos filamentosos' },
  { nome: 'Fernando Auil', curso: 'Sistemas de Informação', email: 'auil@usp.br', sala: '357 F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8101', pesquisa: '' },
  { nome: 'Fernando de Souza Coelho', curso: 'Gestão de Políticas Públicas', email: 'fernandocoelho@usp.br', sala: '322 L', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8879', pesquisa: 'Gestão de Organizações Públicas; Gestão de Políticas Públicas' },
  { nome: 'Fernando Henrique Magalhães', curso: 'Educação Física e Saúde', email: 'fhmagalhaes@usp.br', sala: '204 H', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Fernando Jesús Carbayo Baz', curso: 'Licenciatura em Ciências da Natureza', email: 'baz@usp.br', sala: '332 E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8102', pesquisa: 'Planárias (Platyhelminthes, Tricladida): sistemática, filogenia, biogeografia.' },
  { nome: 'Flávia Mori Sarti', curso: 'Gestão de Políticas Públicas', email: 'flamori@usp.br', sala: '303 A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8165', pesquisa: 'Economia da Saúde; Políticas Públicas em Saúde; Políticas Públicas de Alimentação.' },
  { nome: 'Flávia Noronha Dutra Ribeiro', curso: 'Gestão Ambiental', email: 'flaviaribeiro@usp.br', sala: 'A1-210A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Flávio de Oliveira Pires', curso: 'Educação Física e Saúde', email: 'piresfo@usp.br', sala: 'A1- 104I', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Fisiologia do Exercício; Desempenho Esportivo; Psico-fisiologia do Exercício.' },
  { nome: 'Flávio Luiz Coutinho', curso: 'Sistemas de Informação', email: 'flcoutinho@usp.br', sala: '320 P', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Rastreamento do Olhar; Interação Humano-Computador; Visão Computacional.' },
  { nome: 'Francisca Dantas Mendes', curso: 'Têxtil e Moda', email: 'franciscadm.tita@usp.br', sala: 'A1 - 110G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Desempenho Acadêmico da Moda; Manufatura do Vestuário; Sustentabilidade na Cadeia Têxtil.' },
  { nome: 'Francisco Javier Sebastian Mendizabal Alvarez', curso: 'Marketing', email: 'falvarez@usp.br', sala: '301 F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8103', pesquisa: 'Trade Marketing; Gerencia de Contas Especiais; Varejo; Conflitos de Canais.' },
  { nome: 'Francisco Luciano Pontes Junior', curso: 'Gerontologia', email: 'lucianopontes@usp.br', sala: 'A1-204L', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8113', pesquisa: 'Comportamento cardiovascular ao exercício físico; Exercício físico e envelhecimento.' },
  { nome: 'Gabriela Salim Ferreira de Castro', curso: 'Obstetrícia', email: 'gabriela.castro@usp.br', sala: '', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'metabolismo lipídico; bioquímica da nutrição; caquexia associada ao câncer.' },
  { nome: 'George Bedinelli Rossi', curso: 'Marketing', email: 'gbrossi@usp.br', sala: '253 D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8104', pesquisa: 'Estratégia de Marketing; Marketing de Moda; Marketing em Gestão Internacional.' },
  { nome: 'Gerardo Kuntschik', curso: 'Gestão Ambiental', email: 'gkuntschik@usp.br', sala: '350 F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8850', pesquisa: 'Geoprocessamento na gestão ambiental; Governança dos recursos naturais' },
  { nome: 'Giovana Bueno', curso: 'Lazer e Turismo', email: 'giovanabueno@usp.br', sala: '307A - I1', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Gestão Empresarial; Empreendedorismo; Inovação; Turismo Criativo.' },
  { nome: 'Gisele da Silva Craveiro', curso: 'Sistemas de Informação', email: 'giselesc@usp.br', sala: '252/254', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8829', pesquisa: 'Dados Abertos; Transparência Pública; Governo Aberto' },
  { nome: 'Gislene Aparecida dos Santos', curso: 'Gestão de Políticas Públicas', email: 'gislene@usp.br', sala: '355 E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8106', pesquisa: 'Filosofia; Educação; Direitos Humanos; Estudos pós-coloniais; Estudos do racismo.' },
  { nome: 'Gladys Beatriz Barreyro', curso: 'Licenciatura em Ciências da Natureza', email: 'gladysb@usp.br', sala: '304 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8844', pesquisa: 'Políticas de educação superior pós-LDB' },
  { nome: 'Glauber Eduardo de Oliveira Santos', curso: 'Lazer e Turismo', email: 'glauber.santos@usp.br', sala: 'I1 - 302 A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Economia do lazer e Turismo' },
  { nome: 'Glauce Cristine Ferreira Soares', curso: 'Obstetrícia', email: 'glaucesoares@usp.br', sala: 'A1-204F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Antropologia do nascimento; Humanização; Direitos sexuais e reprodutivos; Óbito materno.' },
  { nome: 'Graziela Serroni Perosa', curso: 'Obstetrícia', email: 'gperosa@usp.br', sala: '355 G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8107', pesquisa: 'Educação e desigualdade social; Formação das elites.' },
  { nome: 'Grzegorz Kowal', curso: 'Licenciatura em Ciências da Natureza', email: 'grzegorz.kowal@usp.br', sala: '310', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '2648-0133', pesquisa: 'Astrofísica de Plasmas; Ciências Espaciais; Computação Paralela.' },
  { nome: 'Heber Silveira Rocha', curso: 'Gestão de Políticas Públicas', email: 'heber@usp.br', sala: 'T04 M', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Formulação, implementação e avaliação de políticas públicas; Movimentos sociais.' },
  { nome: 'Helene Mariko Ueno', curso: 'Gestão Ambiental', email: 'papoula@usp.br', sala: 'A1-210K', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8868', pesquisa: 'Entomologia Médica; Comunicação científica em Saúde Pública' },
  { nome: 'Heloisa de Camargo Tozato', curso: 'Gestão Ambiental', email: 'htozato@usp.br', sala: '', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'análise de políticas públicas no campo das transições socioecológicas.' },
  { nome: 'Helton Hideraldo Biscaro', curso: 'Sistemas de Informação', email: 'heltonhb@usp.br', sala: '352 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8860', pesquisa: '' },
  { nome: 'Henrique Salmazo da Silva', curso: 'Gerontologia', email: 'henriquesalmazo@usp.br', sala: 'A1-T04B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Envelhecimento saudável; Cuidados de Longa duração; Psicologia cognitiva.' },
  { nome: 'Homero Fonseca Filho', curso: 'Gestão Ambiental', email: 'homeroff@usp.br', sala: '253 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8835', pesquisa: 'Geoprocessamento; Sensoriamento Remoto; Sistemas de Informação Geográfica.' },
  { nome: 'Humberto Bersani', curso: 'Lazer e Turismo', email: 'humbertobersani@usp.br', sala: 'I1-355 A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Direito; Direitos Humanos; Políticas Públicas; Direito do Trabalho.' },
  { nome: 'Humberto Miguel Garay Malpartida', curso: 'Gerontologia', email: 'hmgaray@usp.br', sala: '251 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8875', pesquisa: 'Câncer; Diabetes; Biologia experimental; Bioinformática; Oncogerontologia.' },
  { nome: 'Isabel Cristina Italiano', curso: 'Têxtil e Moda', email: 'isabel.italiano@usp.br', sala: 'A1-104A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Ivan Ramos Estevão', curso: 'Licenciatura em Ciências da Natureza', email: 'irestevao@usp.br', sala: '301 I', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Psicanálise; Agressividade: Consequências no Laço Social' },
  { nome: 'Ivana Brito', curso: 'Obstetrícia', email: 'ibrito@usp.br', sala: '334 C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Ivandre Paraboni', curso: 'Sistemas de Informação', email: 'ivandre@usp.br', sala: '320 F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8837', pesquisa: 'Inteligência Artificial; Processamento de linguagens Naturais; Tradução Automática.' },
  { nome: 'Jacqueline Isaac Machado Brigagão', curso: 'Obstetrícia', email: 'jbrigagao@yahoo.com', sala: '350 C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8845', pesquisa: 'Praticas discursivas; Produção de sentidos em saúde' },
  { nome: 'Jaime Crozatti', curso: 'Gestão de Políticas Públicas', email: 'jcrozatti@usp.br', sala: 'A1-204O', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '2648-0086', pesquisa: 'Contabilidade gerencial; Controladoria; Orçamento público.' },
  { nome: 'Jane Aparecida Marques', curso: 'Marketing', email: 'janemarq@usp.br', sala: '302 A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8858', pesquisa: 'Marketing Turístico; Segmentação de mercado; Pesquisa de marketing; Lazer' },
  { nome: 'Jefferson Agostini Mello', curso: 'Têxtil e Moda', email: 'jefferson@usp.br', sala: 'A1-110F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8108', pesquisa: 'Literatura Brasileira Contemporânea' },
  { nome: 'Jéssica Urtado da Silva', curso: 'Obstetrícia', email: 'jessica.urtado.silva@usp.br', sala: 'I1-352 A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8864', pesquisa: 'Saúde da mulher; assistência ao pré-natal; Efeitos da ocitocina sobre o Sistema Nervoso Central.' },
  { nome: 'João Luiz Bernardes Junior', curso: 'Sistemas de Informação', email: 'jlbernardes@usp.br', sala: 'A1-110G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Interação Humano-Computador; Computação Gráfica; Entretenimento Digital.' },
  { nome: 'João Paulo Pereira Marcicano', curso: 'Têxtil e Moda', email: 'marcican@usp.br', sala: '355 A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8166', pesquisa: 'Usinagem de Metais; Processos de Fabricação Têxteis; Materiais e Processos Têxteis' },
  { nome: 'João Valentini Neto', curso: 'Gerontologia', email: 'joaoneto@usp.br', sala: 'I1-319 A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Nutrição em Saúde Pública; Sarcopenia; Composição corporal; Envelhecimento.' },
  { nome: 'Jorge Alberto Silva Machado Villanueva', curso: 'Gestão de Políticas Públicas', email: 'machado@usp.br', sala: '252/254', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8110', pesquisa: 'Políticas Públicas de Acesso à Informação; Politica Científica.' },
  { nome: 'Jose Carlos Vaz', curso: 'Gestão de Políticas Públicas', email: 'vaz@usp.br', sala: '319 G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8840', pesquisa: 'Tendências e Inovações na Gestão Pública; Governo Eletrônico.' },
  { nome: 'José de Jesús Pérez Alcázar', curso: 'Sistemas de Informação', email: 'jperez@usp.br', sala: '352 F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8112', pesquisa: 'Planejamento em Inteligência Artificial; Web Semântica; Processos de negócios.' },
  { nome: 'José Glimovaldo Lupoli Junior', curso: 'Marketing', email: 'lupolijr@usp.br', sala: 'A1-104K', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8918', pesquisa: '' },
  { nome: 'Jose Mauro da Costa Hernandez', curso: 'Marketing', email: 'jmhernandez@usp.br', sala: '202 D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8114', pesquisa: 'Comércio eletrônico; Gerenciamento de marcas' },
  { nome: 'José Ribamar dos Santos Ferreira Júnior', curso: 'Gerontologia', email: 'zeribajr@usp.br', sala: 'A1-204H', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8873', pesquisa: 'Controle da Expressão Gênica; Genética de Microrganismos.' },
  { nome: 'Jose Ricardo Goncalves de Mendonca', curso: 'Sistemas de Informação', email: 'jricardo@usp.br', sala: '334 H', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Sistemas de partículas interagentes; Passeios aleatórios sobre grafos.' },
  { nome: 'Josmar Andrade', curso: 'Marketing', email: 'josmar@usp.br', sala: '251 A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Gestão da Comunicação Integrada de Marketing; Marketing para produtos culturais.' },
  { nome: 'Joyce da Costa Silveira de Camargo', curso: 'Obstetrícia', email: 'joyce@usp.br', sala: '319H', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Simulação clínica; saúde da mulher; prevenção e promoção da saúde; formação.' },
  { nome: 'Júlia Baruque Ramos', curso: 'Têxtil e Moda', email: 'jbaruque@usp.br', sala: '357 E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8116', pesquisa: 'Fibras têxteis vegetais brasileiras; Caracterização físico-química de fibras vegetais.' },
  { nome: 'Juliana Hanna Leite El Ottra', curso: 'Licenciatura em Ciências da Natureza', email: 'juliana.ottra@usp.br', sala: 'A1 210-O', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Morfologia e anatomia de órgãos reprodutivos de angiospermas; Ensino de Ciências.' },
  { nome: 'Juliana Pedreschi Rodrigues', curso: 'Lazer e Turismo', email: 'julianaprodrigues@usp.br', sala: 'A1-204 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '2648-0141', pesquisa: 'Lazer, interdisciplinaridade e suas múltiplas relações na sociedade.' },
  { nome: 'Karina Valdivia Delgado', curso: 'Sistemas de Informação', email: 'kvd@ime.usp.br', sala: 'A1-104F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Inteligência Artificial; Aprendizado de Máquina; Aprendizado por Reforço.' },
  { nome: 'Karla Roberta Pereira Sampaio Lima', curso: 'Sistemas de Informação', email: 'ksampaiolima@usp.br', sala: 'I1- 322G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Teoria dos Grafos, Otimização Combinatória, Programação Inteira' },
  { nome: 'Káthia Maria Honorio', curso: 'Licenciatura em Ciências da Natureza', email: 'kmhonorio@usp.br', sala: '322 C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8856', pesquisa: 'Química Medicinal; Métodos Computacionais; Ensino de Química.' },
  { nome: 'Kelly Cristina Máxima Pereira Venâncio', curso: 'Obstetrícia', email: 'kelly.pereira@usp.br', sala: 'I1-357 H', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1048', pesquisa: 'Enfermagem Obstétrica; Violência Obstétrica; Saúde da Mulher; Justiça Reprodutiva.' },
  { nome: 'Leonardo Dias Meireles', curso: 'Gestão Ambiental', email: 'ldmeireles@yahoo.com.br', sala: 'A1-104 P', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Linda Massako Ueno Pardi', curso: 'Educação Física e Saúde', email: 'lindabrz@usp.br', sala: 'A1-210F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8111', pesquisa: 'Atividade Física em idosos; Doença de Alzheimer; Cognição em adultos e idosos.' },
  { nome: 'Lisete Barlach', curso: 'Marketing', email: 'lisbar@usp.br', sala: 'A1 - T10D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '2648-0059', pesquisa: 'Criatividade e Empreendedorismo; Profissões e carreiras.' },
  { nome: 'Louise Hase Gracioso', curso: 'Biotecnologia', email: 'gracioso@usp.br', sala: 'A1-T10H', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Biorremediação' },
  { nome: 'Luciane Meneguin Ortega Vidal', curso: 'Sistemas de Informação', email: 'luciane.ortega@usp.br', sala: 'A1-210C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Empreendedorismo; Inovação; Habitats de Inovação; Supply Chain Management.' },
  { nome: 'Luciano Antonio Digiampietri', curso: 'Sistemas de Informação', email: 'digiampietri@usp.br', sala: 'A1-110P', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8916', pesquisa: 'Inteligência Artificial; Gerenciamento de Experimentos; Web Semântica.' },
  { nome: 'Luciano Vieira de Araújo', curso: 'Sistemas de Informação', email: 'lvaraujo@usp.br', sala: 'A1-T10P', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Banco de Dados; Data Warehouse; Bioinformática; Data Mining.' },
  { nome: 'Lucy Gomes Sant Anna', curso: 'Gestão Ambiental', email: 'lsantann@usp.br', sala: '350 F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8119', pesquisa: 'Geologia de argilas; Proveniência e diagênese de rochas sedimentares.' },
  { nome: 'Luis Americo Conti', curso: 'Licenciatura em Ciências da Natureza', email: 'lconti@usp.br', sala: '204 A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8865', pesquisa: 'Web Mapping Costeiro; Geoprocessamento; Ensino de Ciências.' },
  { nome: 'Luís César Schiesari', curso: 'Gestão Ambiental', email: 'lschiesa@usp.br', sala: '350 A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8120', pesquisa: 'Ecologia teórica e aplicada' },
  { nome: 'Luis Mochizuki', curso: 'Educação Física e Saúde', email: 'mochi@usp.br', sala: '319 D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8805', pesquisa: 'Biomecânica; Controle Motor; Postura & Locomoção.' },
  { nome: 'Luis Paulo de Carvalho Piassi', curso: 'Licenciatura em Ciências da Natureza', email: 'lppiassi@usp.br', sala: 'A1-T04J', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8872', pesquisa: 'Mídia e lúdico na educação científica; Formação continuada de professores.' },
  { nome: 'Luiz Gonzaga Godoi Trigo', curso: 'Escola de Artes, Ciências e Humanidades', email: 'trigo@usp.br', sala: '253 F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8122', pesquisa: '' },
  { nome: 'Luiz Paulo Moura Andrioli', curso: 'Licenciatura em Ciências da Natureza', email: 'lpma@usp.br', sala: 'A1-104E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Formação do corpo em insetos; Regulação da expressão gênica.' },
  { nome: 'Marcel Ferreira de Oliveira', curso: 'EACH', email: 'marcel-ferreira@usp.br', sala: 'A1-204A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Gestão de Políticas Públicas; Economia; Regressão Descontínua.' },
  { nome: 'Marcelo Antunes Nolasco', curso: 'Gestão Ambiental', email: 'mnolasco@usp.br', sala: '337 G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8902', pesquisa: 'Tratamento de esgotos sanitários; Conservação da Água em edificações.' },
  { nome: 'Marcelo Arno Nerling', curso: 'Gestão de Políticas Públicas', email: 'mnerling@usp.br', sala: '332 C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8857', pesquisa: 'Direito e Gestão de Políticas Públicas; Transparência; participação e controle social.' },
  { nome: 'Marcelo de Souza Lauretto', curso: 'Sistemas de Informação', email: 'marcelolauretto@usp.br', sala: 'I1-320B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8121', pesquisa: '' },
  { nome: 'Marcelo Fantinato', curso: 'Sistemas de Informação', email: 'm.fantinato@usp.br', sala: 'A1-110I', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Engenharia de Software; Sistemas de Informação' },
  { nome: 'Marcelo Massa', curso: 'Educação Física e Saúde', email: 'mmassa@usp.br', sala: 'A1-104D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Ambiente de Desenvolvimento do Talento Esportivo' },
  { nome: 'Marcelo Medeiros Eler', curso: 'Sistemas de Informação', email: 'marceloeler@usp.br', sala: '304 H', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Marcelo Morandini', curso: 'Sistemas de Informação', email: 'm.morandini@usp.br', sala: '322 E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8852', pesquisa: 'Interação Humano Computador; Engenharia de Software; Usabilidade de Sistemas.' },
  { nome: 'Marcelo Saldanha Aoki', curso: 'Educação Física e Saúde', email: 'aoki.ms@usp.br', sala: '204 F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8842', pesquisa: 'Plasticidade do músculo esquelético; Monitoramento da carga de treinamento.' },
  { nome: 'Marcelo Ventura Freire', curso: 'Marketing', email: 'mvf@usp.br', sala: '252/254', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8894', pesquisa: 'Processos Estocásticos' },
  { nome: 'Marcelo Vilela de Almeida', curso: 'Lazer e Turismo', email: 'marcelovilela@usp.br', sala: 'A1-T10A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8908', pesquisa: 'Patrimônio Geológico e Geoturismo; Processos Inovadores; Redes e Inovação no Turismo.' },
  { nome: 'Marcio Moretto Ribeiro', curso: 'Sistemas de Informação', email: 'marciomr@usp.br', sala: '320 P', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Marco Antonio Bettine de Almeida', curso: 'Educação Física e Saúde', email: 'marcobettine@usp.br', sala: 'A1-210L', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Memória do Futebol; Urbanização e Clubes de Futebol em São Paulo.' },
  { nome: 'Marcos Bernardino de Carvalho', curso: 'Gestão Ambiental', email: 'mbcarvalho@usp.br', sala: 'A1 - T 10-O', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8125', pesquisa: 'História e epistemologia da Geografia; Educação Ambiental.' },
  { nome: 'Marcos Lordello Chaim', curso: 'Sistemas de Informação', email: 'chaim@usp.br', sala: '322 N', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8126', pesquisa: 'Análise de programas; Teste de software; Manutenção de Software.' },
  { nome: 'Marcos Roberto Luppe', curso: 'Marketing', email: 'mluppe@usp.br', sala: 'I1 - 303A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Gestão de Marketing, Gestão de Varejo e Negócios Digitais' },
  { nome: 'Marcos Ryotaro Hara', curso: 'Licenciatura em Ciências da Natureza', email: 'marcosrh@usp.br', sala: 'A1-210B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8880', pesquisa: 'Sistemática e taxonomia de Opiliones (Arachnida).' },
  { nome: 'Maria Elena Infante Malachias', curso: 'Licenciatura em Ciências da Natureza', email: 'marilen@usp.br', sala: 'T04E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Formação de Professores; Ensino e Aprendizagem de Ciências.' },
  { nome: 'Maria Eliza Mattosinho Bernardes', curso: 'Licenciatura em Ciências da Natureza', email: 'memberna@usp.br', sala: '357 A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Atividade Pedagógica; Ensino, Aprendizagem e Desenvolvimento Humano.' },
  { nome: 'Maria Luisa Trindade Bestetti', curso: 'Gerontologia', email: 'maria.luisa@usp.br', sala: 'A1-T10F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '2648-0123', pesquisa: 'gerontologia' },
  { nome: 'Maria Silvia Barros de Held', curso: 'Têxtil e Moda', email: 'silviaheld@usp.br', sala: 'A1-T04G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Aspectos Contemporâneos da Imagem; Arte e Design de Moda e Têxtil.' },
  { nome: 'Mariana Aldrigui Carvalho', curso: 'Lazer e Turismo', email: 'aldrigui@usp.br', sala: '253 G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8168', pesquisa: 'Políticas de Turismo; Turismo e Educação' },
  { nome: 'Mariana Bueno de Andrade-Matos', curso: 'Lazer e Turismo', email: 'buenomariana@usp.br', sala: '', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Mariana De Gea Gervasio', curso: 'Obstetrícia', email: 'mariana.gervasio@usp.br', sala: 'I1- 322G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Saúde de mulheres; direitos sexuais e reprodutivos; políticas públicas.' },
  { nome: 'Mariana Harumi Cruz Tsukamoto', curso: 'Educação Física e Saúde', email: 'maharumi@usp.br', sala: 'I1- 301B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Marilia Velardi', curso: 'Educação Física e Saúde', email: 'marilia.velardi@usp.br', sala: 'A1-204J', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Promoção da Atividade Física e do Lazer' },
  { nome: 'Mario Pedrazzoli Neto', curso: 'Gerontologia', email: 'pedrazzo@usp.br', sala: '252/254', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8831', pesquisa: 'Psicobiologia do Sono e Ritmos Circadianos; Genética e Fisiologia Molecular do Sono.' },
  { nome: 'Marisa Accioly Rodrigues da Costa Domingues', curso: 'Gerontologia', email: 'maccioly@usp.br', sala: '253 A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8169', pesquisa: 'Políticas Públicas e Envelhecimento; Rede de Suporte Social da Pessoa Idosa.' },
  { nome: 'Maristela Belletti Mutt Urasaki', curso: 'Obstetrícia', email: 'mari.urasaki@usp.br', sala: 'A1-104O', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8905', pesquisa: 'O processo de cuidar em saúde; Processo ensino aprendizagem em Enfermagem.' },
  { nome: 'Marlise de Oliveira Pimentel Lima', curso: 'Obstetrícia', email: 'moplima@usp.br', sala: 'I1-301C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Martin Jayo', curso: 'Gestão de Políticas Públicas', email: 'jayomartin@gmail.com', sala: 'A1-210D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Masayuki Oka Hase', curso: 'Sistemas de Informação', email: 'mhase@usp.br', sala: '202 A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8871', pesquisa: 'Física Estatística; Redes Complexas.' },
  { nome: 'Mateus Manfrin Artêncio', curso: 'Marketing', email: '', sala: 'I1-304 A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Comportamento do consumidor; Emoções do consumidor; Neuromarketing.' },
  { nome: 'Mauricio de Campos Araujo', curso: 'Têxtil e Moda', email: 'mauricio.araujo@usp.br', sala: '355 C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8851', pesquisa: 'Fibras protéicas; Processos enzimáticos; Nanotecnologia' },
  { nome: 'Meire Cachioni', curso: 'Gerontologia', email: 'meirec@usp.br', sala: '251 E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8849', pesquisa: 'Psicoeducação e o cuidado gerontológico; Velhice e Educação' },
  { nome: 'Michele Schultz Ramos', curso: 'Educação Física e Saúde', email: 'mschultz@usp.br', sala: '252/254', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8830', pesquisa: 'Neuroproteção; Neuroplasticidade; Intervenções celulares para o sistema nervoso.' },
  { nome: 'Miguel Angelo Hemzo', curso: 'Marketing', email: 'mahemzo@usp.br', sala: '301 E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8131', pesquisa: 'Marketing de Serviços; Marketing do Luxo; Jogos de Empresa como ferramenta pedagógica.' },
  { nome: 'Miriam Sannomiya', curso: 'Licenciatura em Ciências da Natureza', email: 'miriamsan@usp.br', sala: 'A1-104G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '2648-0104', pesquisa: '' },
  { nome: 'Mônica Teixeira Dias', curso: 'Gestão Ambiental', email: 'monicat@usp.br', sala: 'A1-104 H', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Direito Ambiental; Licenciamento Ambiental; Gestão de Resíduos Sólidos.' },
  { nome: 'Neli Aparecida de Mello-Théry', curso: 'Gestão Ambiental', email: 'nmthery@usp.br', sala: '353 F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8133', pesquisa: 'Políticas públicas ambientais; Territórios; Desenvolvimento sustentável.' },
  { nome: 'Nina Simone Vilaverde Moura', curso: 'Gestão Ambiental', email: 'nsmoura@usp.br', sala: '350 E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8889', pesquisa: 'Climatologia urbana; Planejamento urbano ambiental.' },
  { nome: 'Pâmela Cristina Lukasewicz Ferreira', curso: 'Obstetrícia', email: 'pamelacl@usp.br', sala: 'A1-T10K', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Saúde da mulher; Obstetrícia; Cuidado perinatal.' },
  { nome: 'Patricia Helena Lara dos Santos Matai', curso: 'Licenciatura em Ciências da Natureza', email: 'phmatai@usp.br', sala: 'A1-T04F', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8100', pesquisa: 'Educação Química; Ensino de Ciências.' },
  { nome: 'Paula Teixeira Nakamoto', curso: 'Marketing', email: 'paulanakamoto@usp.br', sala: 'A1-204 C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Comportamento do consumidor; Publicidade e propaganda.' },
  { nome: 'Paulo Eduardo Nali de Souza', curso: 'Gestão de Políticas Públicas', email: 'pnali@usp.br', sala: 'A1-T04O', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8183', pesquisa: 'Economia Política Internacional; Integração Regional.' },
  { nome: 'Paulo Roberto Veiga Quemelo', curso: 'Saúde, Ciclos de Vida e Sociedade', email: 'pvquemelo@usp.br', sala: 'A1-110E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Saúde do trabalhador; Ergonomia; Qualidade de vida.' },
  { nome: 'Pedro Germano dos Santos Murrieta', curso: 'Gestão Ambiental', email: 'pmurriet@usp.br', sala: '334 G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8134', pesquisa: 'Ecologia Humana; Recursos Florestais; Populações Tradicionais.' },
  { nome: 'Renata Ferraz de Toledo', curso: 'Saúde, Ciclos de Vida e Sociedade', email: 'rftoledo@usp.br', sala: 'A1-110K', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8148', pesquisa: 'Educação popular em saúde; Pesquisa participativa; Saúde coletiva.' },
  { nome: 'Ricardo Augusto Souza Fernandes', curso: 'Educação Física e Saúde', email: 'rasfernandes@usp.br', sala: 'A1-210H', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Epidemiologia da atividade física; Saúde cardiovascular; Aptidão física.' },
  { nome: 'Ricardo de Sampaio Dagnino', curso: 'Gestão Ambiental', email: 'rdagnino@usp.br', sala: 'A1-T04P', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Planejamento urbano e regional; Geoprocessamento; Dinâmica demográfica.' },
  { nome: 'Rita de Cássia Barradas Barata', curso: 'Saúde, Ciclos de Vida e Sociedade', email: 'rcbarata@usp.br', sala: '', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Epidemiologia; Determinação social da saúde; Desigualdades em saúde.' },
  { nome: 'Roberto Vilela de Moura Neto', curso: 'Sistemas de Informação', email: 'rvmneto@usp.br', sala: 'A1-210 I', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Aprendizado de Máquina; Sistemas inteligentes; Visão computacional.' },
  { nome: 'Rodrigo Barros Ribeiro', curso: 'Gestão Ambiental', email: 'rodrigobr@usp.br', sala: 'A1-204K', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Sistemas agroflorestais; Etnobotânica; Ecologia de Paisagens.' },
  { nome: 'Rodrigo Janoski Meira', curso: 'Sistemas de Informação', email: 'rjmeira@usp.br', sala: '357 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Análise de dados; Mineração de dados; Aprendizado de máquina.' },
  { nome: 'Rodrigo Sartori Successfully', curso: 'Gestão de Políticas Públicas', email: 'rodrigo.sartori@usp.br', sala: '', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: '' },
  { nome: 'Rosana Aparecida Bessa', curso: 'Saúde, Ciclos de Vida e Sociedade', email: 'rabessa@usp.br', sala: 'A1-T04C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Fisioterapia; Reabilitação; Envelhecimento.' },
  { nome: 'Rosilda Mendes', curso: 'Saúde, Ciclos de Vida e Sociedade', email: 'rosildamendes@usp.br', sala: 'A1-T04I', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8152', pesquisa: 'Promoção da saúde; Determinantes sociais da saúde; Pesquisa qualitativa.' },
  { nome: 'Sandra Maria Galheigo', curso: 'Saúde, Ciclos de Vida e Sociedade', email: 'smgalheigo@usp.br', sala: 'A1-T10E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8150', pesquisa: 'Terapia Ocupacional; Vulnerabilidade social; Direitos Humanos.' },
  { nome: 'Silvia Maria Galvão de Souza Campos', curso: 'Gestão Ambiental', email: 'smcampos@usp.br', sala: '322 A', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-1082', pesquisa: 'Direito Ambiental; Política Ambiental; Legislação Ambiental.' },
  { nome: 'Sirlei Tonello', curso: 'Educação Física e Saúde', email: 'sirlei.tonello@usp.br', sala: 'A1-104J', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Educação física adaptada; Basquetebol em cadeira de rodas.' },
  { nome: 'Sonia Hue', curso: 'Licenciatura em Ciências da Natureza', email: 'soniahue@usp.br', sala: 'A1-210J', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Ensino de Química; Divulgação Científica; Educação à distância.' },
  { nome: 'Stela Adami Vayego', curso: 'Sistemas de Informação', email: 'stela@usp.br', sala: '301 H', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8141', pesquisa: 'Estatística; Biostatística; Modelos de regressão.' },
  { nome: 'Suzana Ezequiel Souto', curso: 'Têxtil e Moda', email: 'suzanaezequiel@usp.br', sala: 'I1-302 B', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Design têxtil; Processos criativos; Cultura material.' },
  { nome: 'Tae Won Jun', curso: 'Educação Física e Saúde', email: 'taewon@usp.br', sala: 'A1-T04E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8180', pesquisa: 'Fisiologia do Exercício; Bioquímica do Exercício; Saúde Pública.' },
  { nome: 'Tania Marcia Cezar Hess', curso: 'Têxtil e Moda', email: 'taniahess@usp.br', sala: 'A1-T10C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Moda, cultura e identidade; Design de moda sustentável.' },
  { nome: 'Tatiana Iaochite Russo', curso: 'Licenciatura em Ciências da Natureza', email: 'tatiana.russo@usp.br', sala: 'A1-T04L', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Formação de professores; Autoeficácia docente; Ensino de Ciências.' },
  { nome: 'Thiago Cerqueira Vieira', curso: 'Gestão Ambiental', email: 'thiago.vieira@usp.br', sala: '', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Gestão de Recursos Hídricos; Limnologia; Ecotoxicologia.' },
  { nome: 'Thiago Luiz Ferreira', curso: 'Educação Física e Saúde', email: 'thiago.ferreira@usp.br', sala: 'A1-204Q', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Neurociências do movimento; Aprendizagem e memória motora.' },
  { nome: 'Valeria Aydos', curso: 'Gestão de Políticas Públicas', email: 'vaydos@usp.br', sala: 'A1-204M', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'Políticas sociais; Inclusão produtiva; Trabalho e deficiência.' },
  { nome: 'Vânia Sanches Luiz', curso: 'Sistemas de Informação', email: 'vsluiz@usp.br', sala: '334 E', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8143', pesquisa: 'Arquitetura de informação; Ciência da informação; Ontologias.' },
  { nome: 'Vera Lúcia Codato Veit', curso: 'Têxtil e Moda', email: 'vlveit@usp.br', sala: '320 G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8144', pesquisa: 'Conservação e restauro de têxteis; Patrimônio cultural têxtil.' },
  { nome: 'Victor Andrade de Melo', curso: 'Educação Física e Saúde', email: 'v.melo@usp.br', sala: 'A1-T04G', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '', pesquisa: 'História do esporte e do lazer; Cultura física.' },
  { nome: 'Wanderley dos Reis Barreto Junior', curso: 'Gestão de Políticas Públicas', email: 'wrbjunior@usp.br', sala: '303 C', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8147', pesquisa: 'Direito à saúde; Judicialização da saúde; Políticas Públicas de saúde.' },
  { nome: 'Yoko Okamoto', curso: 'Marketing', email: 'yokookamoto@usp.br', sala: 'A1-110D', lattes: 'http://lattes.cnpq.br/', orcid: '', telefone: '3091-8909', pesquisa: 'Finanças; Tomada de Decisão Financeira; Finanças Comportamentais.' },
]

const ALL_COURSES = Array.from(new Set(docentesData.map((d) => d.curso))).sort()

const DOC_PAGE_SIZE = 20

function DocentesView({ activeTab, onSelectTab }: { activeTab: string; onSelectTab: (tab: string) => void }) {
  const [query, setQuery] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(DOC_PAGE_SIZE)

  const filtered = docentesData.filter((d) => {
    const matchName = d.nome.toLowerCase().includes(query.toLowerCase())
    const matchCourse = selectedCourse === '' || d.curso === selectedCourse
    return matchName && matchCourse
  })

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  function handleFilterChange(newQuery: string, newCourse: string) {
    setQuery(newQuery); setSelectedCourse(newCourse)
    setExpandedRow(null); setVisibleCount(DOC_PAGE_SIZE)
  }

  const navItems: [string, IconName][] = [['Início', 'home'], ['Disciplinas', 'book'], ['Docentes', 'people'], ['Entidades', 'building']]

  return <main className="app-shell doc-shell">
    <div className="doc-content">
      <section className="doc-heading">
        <p className="eyebrow">EACH · USP</p>
        <h1>Docentes<span>.</span></h1>
        <p className="doc-caption">Lista de docentes da EACH/USP em ordem alfabética. Clique em um nome para ver mais detalhes.</p>
      </section>

      <div className="doc-controls">
        <div className="doc-search-wrap">
          <svg className="doc-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>
          <input
            className="doc-search"
            type="search"
            placeholder="Pesquisar por nome…"
            value={query}
            onChange={(e) => handleFilterChange(e.target.value, selectedCourse)}
            aria-label="Pesquisar docente por nome"
          />
        </div>
        <select
          className="doc-select"
          value={selectedCourse}
          onChange={(e) => handleFilterChange(query, e.target.value)}
          aria-label="Filtrar por curso"
        >
          <option value="">Todos os cursos</option>
          {ALL_COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <p className="doc-count" aria-live="polite">
        {filtered.length} docente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        {hasMore && <span className="doc-count-showing"> · mostrando {visibleCount}</span>}
      </p>

      <div className="doc-list" role="list">
        {visible.length === 0
          ? <p className="doc-empty">Nenhum docente encontrado para os filtros aplicados.</p>
          : visible.map((d) => {
              const isOpen = expandedRow === d.nome
              return <article key={d.nome} className={`doc-card${isOpen ? ' open' : ''}`} role="listitem">
                <button
                  className="doc-card-trigger"
                  onClick={() => setExpandedRow(isOpen ? null : d.nome)}
                  aria-expanded={isOpen}
                  aria-controls={`doc-detail-${d.nome.replace(/\s+/g, '-')}`}
                >
                  <div className="doc-avatar" aria-hidden="true">{d.nome.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}</div>
                  <div className="doc-card-info">
                    <strong className="doc-name">{d.nome}</strong>
                    <span className="doc-course">{d.curso}</span>
                  </div>
                  <svg className="doc-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {isOpen && <div className="doc-detail" id={`doc-detail-${d.nome.replace(/\s+/g, '-')}`} role="region" aria-label={`Detalhes de ${d.nome}`}>
                  <dl className="doc-detail-grid">
                    {d.email && <><dt>E-mail</dt><dd><a href={`mailto:${d.email}`} className="doc-link">{d.email}</a></dd></>}
                    {d.sala && <><dt>Sala</dt><dd>{d.sala}</dd></>}
                    {d.telefone && <><dt>Telefone</dt><dd>{d.telefone}</dd></>}
                    {d.pesquisa && <><dt>Linha de Pesquisa</dt><dd className="doc-pesquisa">{d.pesquisa}</dd></>}
                  </dl>
                  <div className="doc-detail-links">
                    <a href={d.lattes} className="doc-badge-link" target="_blank" rel="noopener noreferrer">CV Lattes ↗</a>
                  </div>
                </div>}
              </article>
            })
        }
      </div>

      {hasMore && (
        <button className="doc-load-more" onClick={() => setVisibleCount(c => c + DOC_PAGE_SIZE)}>
          Ver mais {Math.min(DOC_PAGE_SIZE, filtered.length - visibleCount)} docentes
        </button>
      )}
    </div>
    <BottomNav activeTab={activeTab} onSelectTab={onSelectTab} items={navItems} />
  </main>
}



// ── Entidades data ─────────────────────────────────────────────────────────────

type Entidade = {
  id: string
  name: string
  fullName: string
  type: string
  accentColor: string
  bgColor: string
  instagram: string
  instagramHandle: string
  logo: string
}

const entidadesData: Entidade[] = [
  {
    id: 'dasi',
    name: 'DASI',
    fullName: 'Diretório Acadêmico de Sistemas de Informação',
    type: 'Diretório Acadêmico',
    accentColor: '#8b5cf6',
    bgColor: '#1a1030',
    instagram: 'https://www.instagram.com/dasiusp/',
    instagramHandle: '@dasiusp',
    logo: logoDAsi,
  },
  {
    id: 'sintese',
    name: 'Síntese Jr.',
    fullName: 'Empresa Júnior de Sistemas de Informação',
    type: 'Empresa Júnior',
    accentColor: '#2563eb',
    bgColor: '#0e1a2e',
    instagram: 'https://www.instagram.com/sintesejr/',
    instagramHandle: '@sintesejr',
    logo: logoSintese,
  },
  {
    id: 'petsi',
    name: 'PET-SI',
    fullName: 'Programa de Educação Tutorial de Sistemas de Informação',
    type: 'PET',
    accentColor: '#be123c',
    bgColor: '#1c0a0e',
    instagram: 'https://www.instagram.com/petsieach/',
    instagramHandle: '@petsieach',
    logo: logoPetsi,
  },
  {
    id: 'hype',
    name: 'Hype USP',
    fullName: 'Grupo de Estudos em Dados e IA',
    type: 'Grupo de Estudos',
    accentColor: '#ea7c00',
    bgColor: '#1e1000',
    instagram: 'https://www.instagram.com/hype.usp/',
    instagramHandle: '@hype.usp',
    logo: logoHype,
  },
  {
    id: 'codelab',
    name: 'CodeLab Leste',
    fullName: 'Grupo de Extensão em Tecnologia e Desenvolvimento Web',
    type: 'Grupo de Extensão',
    accentColor: '#ec4899',
    bgColor: '#1e0a18',
    instagram: 'https://www.instagram.com/uspcodelableste/',
    instagramHandle: '@uspcodelableste',
    logo: logoCodelab,
  },
  {
    id: 'eachintheshell',
    name: 'Each in The Shell',
    fullName: 'Grupo de Hacking e Cibersegurança',
    type: 'Grupo de Estudos',
    accentColor: '#f97316',
    bgColor: '#1e0e00',
    instagram: 'https://www.instagram.com/eachintheshell/',
    instagramHandle: '@eachintheshell',
    logo: logoEachInTheShell,
  },
  {
    id: 'conway',
    name: 'Conway USP',
    fullName: 'Grupo de Estudos em Gamedev',
    type: 'Grupo de Estudos',
    accentColor: '#a78bfa',
    bgColor: '#100a1e',
    instagram: 'https://www.instagram.com/conway_usp/',
    instagramHandle: '@conway_usp',
    logo: logoConway,
  },
  {
    id: 'cossi',
    name: 'COSSI',
    fullName: 'Comissão Organizadora da Semana de SI',
    type: 'Comissão',
    accentColor: '#7c3aed',
    bgColor: '#130c22',
    instagram: 'https://www.instagram.com/semanadesi/',
    instagramHandle: '@semanadesi',
    logo: logoCossi,
  },
]

function useNebulaAccent(color: string | null) {
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

function InstagramEmbed({ url, name }: { url: string; name: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load the Instagram embed script once, then re-process on every url change
    const process = () => {
      const ig = (window as unknown as { instgrm?: { Embeds: { process: () => void } } }).instgrm
      if (ig?.Embeds) {
        ig.Embeds.process()
      }
    }

    if (!(window as unknown as { instgrm?: unknown }).instgrm) {
      const script = document.getElementById('ig-embed-script') ?? (() => {
        const s = document.createElement('script')
        s.id = 'ig-embed-script'
        s.src = 'https://www.instagram.com/embed.js'
        s.async = true
        s.onload = process
        document.body.appendChild(s)
        return s
      })()
      void script
    } else {
      process()
    }
  }, [url])

  return (
    <div ref={wrapRef} className="ent-ig-embed-wrap">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        data-instgrm-captioned
        style={{ background: '#FFF', border: 0, borderRadius: '3px', boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)', margin: '1px', maxWidth: '540px', minWidth: '326px', padding: 0, width: 'calc(100% - 2px)' }}
      >
        <div style={{ padding: '16px' }}>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ background: '#FFFFFF', lineHeight: 0, padding: 0, textAlign: 'center', textDecoration: 'none', width: '100%' }}>
            Ver publicações de {name} no Instagram
          </a>
        </div>
      </blockquote>
    </div>
  )
}

function EntidadesView({ activeTab, onSelectTab, onEntityAccent, onOpenUserMenu }: { activeTab: string; onSelectTab: (tab: string) => void; onEntityAccent: (c: string | null) => void; onOpenUserMenu: () => void }) {
  const [selected, setSelected] = useState<Entidade | null>(null)
  const navItems: [string, IconName][] = [['Início', 'home'], ['Disciplinas', 'book'], ['Docentes', 'people'], ['Entidades', 'building']]

  useNebulaAccent(selected ? selected.accentColor : null)

  useEffect(() => {
    onEntityAccent(selected ? selected.accentColor : null)
    return () => onEntityAccent(null)
  }, [selected, onEntityAccent])

  void onOpenUserMenu // used in future topbar; avoid lint warning

  if (selected) {
    return (
      <main className="app-shell ent-shell" style={{ '--ent-accent': selected.accentColor, '--ent-bg': selected.bgColor } as React.CSSProperties}>
        <div className="ent-detail-content">
          <button className="ent-back-btn" onClick={() => setSelected(null)} aria-label="Voltar para entidades">
            <Icon name="arrow" />
            <span>Entidades</span>
          </button>
          <div className="ent-detail-hero">
            <div className="ent-detail-logo-wrap">
              <img src={selected.logo} alt={`Logo ${selected.name}`} className="ent-detail-logo" />
            </div>
            <div>
              <p className="eyebrow ent-eyebrow">{selected.type.toUpperCase()}</p>
              <h1 className="ent-detail-title">{selected.name}<span>.</span></h1>
              <p className="ent-detail-full">{selected.fullName}</p>
            </div>
          </div>

          <div className="ent-ig-section">
            <p className="eyebrow">INSTAGRAM</p>
            <InstagramEmbed url={selected.instagram} name={selected.name} />
          </div>
        </div>
        <BottomNav activeTab={activeTab} onSelectTab={onSelectTab} className="ent-nav" items={navItems} />
      </main>
    )
  }

  return (
    <main className="app-shell ent-shell">
      <div className="ent-content">
        <section className="ent-heading">
          <p className="eyebrow">SISTEMAS DE INFORMAÇÃO · EACH/USP</p>
          <h1>Entidades<span>.</span></h1>
          <p className="ent-caption">Coletivos, grupos e organizações estudantis do curso.</p>
        </section>
        <div className="ent-grid">
          {entidadesData.map((e) => (
            <button
              key={e.id}
              className="ent-card"
              style={{ '--ent-accent': e.accentColor, '--ent-bg': e.bgColor } as React.CSSProperties}
              onClick={() => setSelected(e)}
              aria-label={`Ver detalhes de ${e.name}`}
            >
              <img src={e.logo} alt={`Logo ${e.name}`} className="ent-card-logo" />
              <div className="ent-card-info">
                <strong className="ent-card-name">{e.name}</strong>
                <span className="ent-card-type">{e.type}</span>
                <span className="ent-card-full">{e.fullName}</span>
              </div>
              <div className="ent-card-arrow">
                <Icon name="arrow" />
              </div>
            </button>
          ))}
        </div>
      </div>
      <BottomNav activeTab={activeTab} onSelectTab={onSelectTab} className="ent-nav" items={navItems} />
    </main>
  )
}

// ── Shared topbar with user menu trigger ──────────────────────────────────────
function AppTopbar({ user, onOpenUserMenu }: { user: User; onOpenUserMenu: () => void }) {
  const initials = user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <header className="topbar">
      <div className="topbar-brand"><img src={appLogo} alt="daSIboard" className="topbar-logo" /></div>
      <div className="topbar-actions">
        <button className="icon-button notification" aria-label="Notificações"><Icon name="bell" /><span></span></button>
        <div className="user-summary">
          <div className="user-name-wrap"><strong>{user.name.split(' ')[0]}</strong></div>
          <button className="avatar" aria-label="Abrir menu do usuário" onClick={onOpenUserMenu}>
            {user.picture ? <img src={user.picture} alt={`Foto de ${user.name}`} /> : initials}
          </button>
        </div>
      </div>
    </header>
  )
}

function HomeView({ user, onOpenUserMenu, activeTab, onSelectTab, schedule, hasStoredSchedule, importError, jupiterData, setJupiterData, isConsultingJupiter, onConsultJupiter, onClearSchedule }: {
  user: User; onOpenUserMenu: () => void; activeTab: string; onSelectTab: (t: string) => void
  schedule: ScheduleEntry[]; hasStoredSchedule: boolean; importError: string
  jupiterData: { codpes: string; password: string; codpgm: string }; setJupiterData: (d: { codpes: string; password: string; codpgm: string }) => void
  isConsultingJupiter: boolean; onConsultJupiter: (e: React.FormEvent) => void; onClearSchedule: () => void
}) {
  const todayIndex = (new Date().getDay() + 6) % 7
  const days = getCurrentWeekDays()
  const todayLabelText = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase()
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' })()

  return <main className="app-shell home-shell">
    <AppTopbar user={user} onOpenUserMenu={onOpenUserMenu} />
    <div className="content">
      <section className="welcome-row">
        <div><p className="eyebrow">{todayLabelText}</p><h1>{greeting}, {user.name.split(' ')[0]}<span>.</span></h1></div>
        <button className="date-button" aria-label="Ir para hoje"><Icon name="calendar" /><span>{days[todayIndex]?.date} {new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date()).replace('.', '')}</span></button>
      </section>

      <section className="section-block schedule-section">
        <div className="section-heading">
          <div><p className="eyebrow">SUA SEMANA</p><h2>Grade horária<span className="grade-dot">.</span></h2></div>
          {hasStoredSchedule
            ? <button type="button" className="clear-schedule-button" onClick={onClearSchedule}><Icon name="trash" /><span>Atualizar grade</span></button>
            : null}
        </div>
        {!hasStoredSchedule && (
          <form className="jupiter-form" onSubmit={onConsultJupiter}>
            <input aria-label="Número USP" placeholder="Número USP" inputMode="numeric" value={jupiterData.codpes} onChange={(e) => setJupiterData({ ...jupiterData, codpes: e.target.value })} required />
            <input aria-label="Senha do JupiterWeb" placeholder="Senha do JupiterWeb" type="password" value={jupiterData.password} onChange={(e) => setJupiterData({ ...jupiterData, password: e.target.value })} required />
            <input aria-label="Código do programa" placeholder="Programa" value={jupiterData.codpgm} onChange={(e) => setJupiterData({ ...jupiterData, codpgm: e.target.value })} required />
            <button className="import-button" type="submit" disabled={isConsultingJupiter}>{isConsultingJupiter ? 'Buscando...' : 'Buscar no JupiterWeb'}</button>
          </form>
        )}
        {importError && <p className="schedule-error" role="alert">{importError}</p>}
        <div className="calendar-board home-calendar-board" aria-label="Grade horária semanal">
          {days.map((day, dayIndex) => (
            <article className={`calendar-day${dayIndex === todayIndex ? ' today' : ''}`} key={day.label}>
              <header>
                <div><strong>{day.label}</strong><span>{day.date}</span></div>
                <small>{schedule.filter((e) => e.weekday === dayIndex).length} aulas</small>
              </header>
              <div className="calendar-day-list">
                {schedule.filter((e) => e.weekday === dayIndex).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map((entry) => (
                  <div className="calendar-event" key={`${day.label}-${entry.code}-${entry.startsAt}`}>
                    <span className="calendar-event-time">{entry.startsAt}</span>
                    <div><strong>{entry.title}</strong><small>{entry.endsAt}{entry.room ? ` · ${entry.room}` : ''}</small></div>
                  </div>
                ))}
                {!schedule.some((e) => e.weekday === dayIndex) && <p className="calendar-empty">Livre</p>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
    <BottomNav activeTab={activeTab} onSelectTab={onSelectTab} />
  </main>
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('Início')
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(() => loadStoredSchedule(user.email) ?? [])
  const [hasStoredSchedule, setHasStoredSchedule] = useState(() => loadStoredSchedule(user.email) !== null)
  const [importError, setImportError] = useState('')
  const [jupiterData, setJupiterData] = useState({ codpes: '', password: '', codpgm: '1' })
  const [isConsultingJupiter, setIsConsultingJupiter] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [entityAccent, setEntityAccent] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem(ONBOARDING_KEY))

  // Map tab names to space themes
  const spaceTheme = activeTab === 'Disciplinas' ? 'disc' : activeTab === 'Docentes' ? 'docentes' : activeTab === 'Entidades' ? 'entidades' : 'home'
  const handleEntityAccent = useCallback((c: string | null) => setEntityAccent(c), [])
  const openUserMenu = useCallback(() => setUserMenuOpen(true), [])

  useEffect(() => {
    if (hasStoredSchedule) return
    fetch('/api/schedule', { credentials: 'include' }).then(async (response) => {
      if (response.ok) {
        const data = await response.json() as { entries: ScheduleEntry[] }
        if (data.entries.length > 0) {
          setSchedule(data.entries)
          saveStoredSchedule(user.email, data.entries)
          setHasStoredSchedule(true)
        }
      }
    }).catch(() => { /* server unavailable, use cached data */ })
  }, [hasStoredSchedule, user.email])

  async function consultJupiter(event: React.FormEvent) {
    event.preventDefault(); setImportError(''); setIsConsultingJupiter(true)
    try {
      const response = await fetch('/api/schedule/jupiter', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jupiterData) })
      const data = await response.json() as { entries?: ScheduleEntry[]; error?: string }
      if (!response.ok || !data.entries) throw new Error(data.error || 'Não foi possível consultar o JupiterWeb.')
      setSchedule(data.entries)
      saveStoredSchedule(user.email, data.entries)
      setHasStoredSchedule(true)
      setJupiterData((current) => ({ ...current, password: '' }))
    } catch (error) { setImportError(error instanceof Error ? error.message : 'Não foi possível consultar o JupiterWeb.') }
    finally { setIsConsultingJupiter(false) }
  }

  function clearSchedule() {
    clearStoredSchedule(user.email)
    setSchedule([])
    setHasStoredSchedule(false)
    setImportError('')
  }

  if (showProfile) {
    return (
      <div className="dashboard-root">
        <SpaceCanvas theme="home" />
        <PageTransition pageKey="profile">
          <ProfilePage user={user} onBack={() => setShowProfile(false)} onLogout={onLogout} />
        </PageTransition>
      </div>
    )
  }

  const pageKey = activeTab
  const pageContent = activeTab === 'Disciplinas'
    ? <DisciplinasView activeTab={activeTab} onSelectTab={setActiveTab} />
    : activeTab === 'Docentes'
    ? <DocentesView activeTab={activeTab} onSelectTab={setActiveTab} />
    : activeTab === 'Entidades'
    ? <EntidadesView activeTab={activeTab} onSelectTab={setActiveTab} onEntityAccent={handleEntityAccent} onOpenUserMenu={openUserMenu} />
    : <HomeView
        user={user} onOpenUserMenu={openUserMenu} activeTab={activeTab} onSelectTab={setActiveTab}
        schedule={schedule} hasStoredSchedule={hasStoredSchedule} importError={importError}
        jupiterData={jupiterData} setJupiterData={setJupiterData}
        isConsultingJupiter={isConsultingJupiter} onConsultJupiter={consultJupiter} onClearSchedule={clearSchedule}
      />

  return (
    <div className="dashboard-root">
      <SpaceCanvas theme={spaceTheme} liveAccent={entityAccent ?? undefined} />
      <PageTransition pageKey={pageKey}>{pageContent}</PageTransition>
      {userMenuOpen && (
        <UserMenu
          user={user}
          onLogout={onLogout}
          onClose={() => setUserMenuOpen(false)}
          onOpenProfile={() => setShowProfile(true)}
        />
      )}
      {showOnboarding && <OnboardingFlow onDone={() => setShowOnboarding(false)} />}
    </div>
  )
}

function App() {
  const developmentHome = import.meta.env.DEV && window.location.pathname === developmentHomePath
  const cachedUser = developmentHome ? developmentUser : loadStoredUser()
  const [user, setUser] = useState<User | null>(cachedUser)
  const [authReady, setAuthReady] = useState(developmentHome || cachedUser !== null)

  useEffect(() => {
    if (developmentHome) return
    fetch('/api/auth/me', { credentials: 'include' }).then(async (response) => {
      if (response.ok) {
        const data = await response.json() as { user: User }
        setUser(data.user)
        saveStoredUser(data.user)
      } else {
        setUser(null)
        saveStoredUser(null)
      }
    }).catch(() => {
      // Server unreachable — keep using cached user if available
    }).finally(() => setAuthReady(true))
  }, [developmentHome])

  useEffect(() => { document.title = user ? 'daSIboard · Seu campus' : 'daSIboard · Entrar' }, [user])

  async function login(credential: string) {
    let response: Response
    try {
      response = await fetch('/api/auth/google', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }) })
    } catch {
      throw new Error('Servidor de autenticação indisponível. Inicie `npm run dev:server` e tente novamente.')
    }
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string } | null
      throw new Error(data?.error || `Falha no servidor de autenticação (${response.status}).`)
    }
    const data = await response.json() as { user: User }
    setUser(data.user)
    saveStoredUser(data.user)
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    saveStoredUser(null)
    setUser(null)
  }

  if (!authReady) return <main className="auth-loading" aria-label="Carregando autenticação"></main>
  return user ? <Dashboard user={user} onLogout={logout} /> : <LoginScreen onLogin={login} />
}

export default App
