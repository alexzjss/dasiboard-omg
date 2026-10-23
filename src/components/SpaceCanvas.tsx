import { useCallback, useEffect, useRef } from 'react'
import { getResolvedTheme, subscribeTheme } from '../lib/theme'

type SpaceTheme = { nebula: string; star: string; accent: string; glow: string }

const SPACE_THEMES: Record<string, SpaceTheme> = {
  home:       { nebula: '#6450b3', star: '#d8e8ff', accent: '#8b6eff', glow: '#7c5ce830' },
  calendar:   { nebula: '#1e4080', star: '#c8deff', accent: '#5588ff', glow: '#3355cc28' },
  disc:       { nebula: '#1e4040', star: '#c8f0ef', accent: '#3eb8b5', glow: '#2a8c8a28' },
  docentes:   { nebula: '#3a1e50', star: '#e8d8ff', accent: '#b86eff', glow: '#8844cc30' },
  entidades:  { nebula: '#5c2a14', star: '#ffe8cc', accent: '#ff9040', glow: '#cc5500' },
  login:      { nebula: '#1a0c2e', star: '#d8c8ff', accent: '#9060ff', glow: '#6030cc28' },
}

export function SpaceCanvas({ theme, liveAccent }: { theme: string; liveAccent?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const frameRef = useRef(0)
  const prevTheme = useRef(theme)
  const blendRef = useRef(1)
  const themeFrom = useRef<SpaceTheme>(SPACE_THEMES[theme] ?? SPACE_THEMES.home)
  const themeTo = useRef<SpaceTheme>(SPACE_THEMES[theme] ?? SPACE_THEMES.home)
  const liveAccentRef = useRef(liveAccent)
  liveAccentRef.current = liveAccent
  const lightRef = useRef(false)
  const reducedRef = useRef(false)
  const redrawRef = useRef<(() => void) | null>(null)

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
      blendRef.current = reducedRef.current ? 1 : 0
      prevTheme.current = theme
    }
    redrawRef.current?.()
  }, [theme, getTheme])

  useEffect(() => { redrawRef.current?.() }, [liveAccent])

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
      // Telas pequenas ou CPUs fracas: menos estrelas e nebulosas
      const lowPower = window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4
      const count = Math.min(lowPower ? 90 : 280, Math.floor((window.innerWidth * window.innerHeight) / 5000))
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
      for (let i = 0; i < (lowPower ? 3 : 6); i++) {
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

    function drawFrame(time: number) {
      if (!canvas || !ctx) return
      const W = canvas.width, H = canvas.height
      const t = time * 0.001
      const light = lightRef.current
      const animated = !reducedRef.current
      const cur = getTheme()
      const live = liveAccentRef.current   // entity-specific accent override

      // Blend transition
      if (!animated) blendRef.current = 1
      else if (blendRef.current < 1) blendRef.current = Math.min(1, blendRef.current + 0.036) // ~1 s a 30 fps

      // Background — slightly tinted when live accent present
      ctx.clearRect(0, 0, W, H)
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      if (light) {
        // "céu diurno": degradê claro, sem nebulosa
        bg.addColorStop(0, '#e9eff9')
        bg.addColorStop(1, '#f6f8fc')
      } else {
        bg.addColorStop(0, '#070a12')
        bg.addColorStop(1, live ? '#0e0a14' : '#0b0f1a')
      }
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Large entity-accent glow when in entity detail (very dramatic, low alpha)
      if (live && !light) {
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

      // Nebula clouds (soft, blurred radial gradients) — só no tema escuro
      for (const neb of light ? [] : nebulae) {
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
      accRad.addColorStop(0, accentColor + (light ? '0c' : live ? '22' : '1a'))
      accRad.addColorStop(0.45, accentColor + (light ? '05' : '0c'))
      accRad.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(acx, acy, acR, 0, Math.PI * 2)
      ctx.fillStyle = accRad
      ctx.fill()

      // Secondary accent blob
      const ac2x = W * (0.72 + Math.sin(t * 0.04 + 1.2) * 0.12)
      const ac2y = H * (0.65 + Math.cos(t * 0.035 + 0.8) * 0.1)
      const acc2 = ctx.createRadialGradient(ac2x, ac2y, 0, ac2x, ac2y, W * 0.28)
      acc2.addColorStop(0, accentColor + (light ? '06' : '14'))
      acc2.addColorStop(1, 'transparent')
      ctx.beginPath(); ctx.arc(ac2x, ac2y, W * 0.28, 0, Math.PI * 2)
      ctx.fillStyle = acc2; ctx.fill()

      // Stars with parallax
      for (const s of stars) {
        const parallax = (s.layer + 1) * 0.003
        const sx = ((s.x + t * s.speed * parallax) % 1) * W
        const sy = ((s.y + t * s.speed * 0.3 * parallax) % 1) * H
        const twinkleVal = s.twinkle * (0.5 + 0.5 * Math.sin(t * 1.5 + s.phase))
        const alpha = light ? 0.12 + twinkleVal * 0.2 : 0.35 + twinkleVal * 0.65
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2)
        ctx.fillStyle = light ? '#2c3556' : s.layer === 2 ? accentColor + 'cc' : cur.star
        ctx.fill()
      }

      // Shooting star (occasional)
      const shootCycle = 16
      const shootT = t % shootCycle
      if (shootT < 1.4 && !light && animated) {
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
    }

    // Limita a ~30 fps
    const FRAME_MS = 1000 / 30
    let lastDraw = 0
    function loop(time: number) {
      rafRef.current = requestAnimationFrame(loop)
      if (time - lastDraw < FRAME_MS - 2) return
      lastDraw = time
      drawFrame(time)
    }

    // Quadro estático (prefers-reduced-motion) ou repintura após resize/tema
    function drawStatic() { drawFrame(20000) }

    function start() {
      cancelAnimationFrame(rafRef.current)
      if (reducedRef.current) drawStatic()
      else rafRef.current = requestAnimationFrame(loop)
    }

    // Pausa o loop com a aba oculta
    function onVisibility() {
      if (document.hidden) cancelAnimationFrame(rafRef.current)
      else if (!reducedRef.current) start()
    }

    function onResize() { resize(); initParticles(); if (reducedRef.current) drawStatic() }

    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    function syncEnvironment() {
      lightRef.current = getResolvedTheme() === 'light'
      const wasReduced = reducedRef.current
      reducedRef.current = motionMq.matches
      if (wasReduced !== reducedRef.current) start()
      else if (reducedRef.current) drawStatic()
    }

    lightRef.current = getResolvedTheme() === 'light'
    reducedRef.current = motionMq.matches
    redrawRef.current = () => { if (reducedRef.current) drawStatic() }

    resize()
    initParticles()
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    const unsubscribeTheme = subscribeTheme(syncEnvironment)
    motionMq.addEventListener('change', syncEnvironment)
    start()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      unsubscribeTheme()
      motionMq.removeEventListener('change', syncEnvironment)
      redrawRef.current = null
    }
  }, [getTheme])

  return <canvas ref={canvasRef} className="space-canvas" aria-hidden="true" />
}
