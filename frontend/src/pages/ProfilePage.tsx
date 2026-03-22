import { useAuthStore } from '@/store/authStore'
import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  User, Mail, Hash, Calendar, GraduationCap, LogOut,
  Download, RefreshCw, X, Check, Code2, Trophy,
  Sparkles, ImagePlus, Trash2, Lock, Star,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStudyStats } from '@/hooks/useStudyStats'
import toast from 'react-hot-toast'
import api from '@/utils/api'

// ── PRNG ──────────────────────────────────────────────────────────────────────
function seededRng(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  let s = h >>> 0
  return () => {
    s += 0x6D2B79F5
    let t = Math.imul(s ^ s >>> 15, 1 | s)
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// ── Canvas utilities ───────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r)
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r)
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r)
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r)
  ctx.closePath()
}

function addGrain(ctx: CanvasRenderingContext2D, rng: () => number, W: number, H: number, alpha: number, count=4000) {
  for (let i=0;i<count;i++) {
    const x=rng()*W, y=rng()*H, v=Math.floor(rng()*255)
    ctx.fillStyle=`rgba(${v},${v},${v},${alpha*rng()})`
    ctx.fillRect(x,y,1,1)
  }
}

// Parse hex color to RGB
function hexToRgb(hex: string): [number,number,number] {
  const n = parseInt(hex.replace('#',''), 16)
  return [(n>>16)&255, (n>>8)&255, n&255]
}
function hslToRgb(h:number, s:number, l:number): [number,number,number] {
  s/=100; l/=100
  const a = s*Math.min(l,1-l)
  const f = (n:number) => { const k=(n+h/30)%12; return l-a*Math.max(Math.min(k-3,9-k,1),-1) }
  return [Math.round(f(0)*255), Math.round(f(8)*255), Math.round(f(4)*255)]
}

// ── Card styles — 9 distinct visual concepts ───────────────────────────────────
// Inspired by: Polish student ID geometric patterns, Tokyo Olympics holographic
// tickets, boarding passes, all-access badges, gradient layers, geometric waves

type CardStyle =
  | 'geometric_rays'    // Polish ID style — radiating ray bands from corner
  | 'layer_stack'       // Stacked transparent hexagon/rect layers (gradient layers image)
  | 'wave_lines'        // Parallel curved lines filling the zone (Seoul wave image)
  | 'checkerboard'      // Bold checker pattern (Brooklyn image)
  | 'holographic'       // Holographic rainbow gradient + noise (Tokyo Olympics ticket)
  | 'boarding_pass'     // Barcode strips + gradient ticket (boarding pass images)
  | 'diagonal_bands'    // Diagonal colored stripes (Polish ID diagonal pattern)
  | 'concentric_shapes' // Nested shrinking shapes with glow
  | 'ink_splatter'      // Organic ink-like splashes (original blob but more dramatic)

function pickCardStyle(userId: string): CardStyle {
  const rng = seededRng(userId + '-style')
  const styles: CardStyle[] = [
    'geometric_rays','layer_stack','wave_lines','checkerboard',
    'holographic','boarding_pass','diagonal_bands','concentric_shapes','ink_splatter'
  ]
  return styles[Math.floor(rng() * styles.length)]
}

// ── Effect overlays — decoupled from background, applied on top ──────────────
type CardEffect = 'foil' | 'scanlines' | 'vignette' | 'chromatic' | 'grain_heavy' | 'none'

function pickCardEffect(userId: string): CardEffect {
  const rng = seededRng(userId + '-effect')
  const effects: CardEffect[] = ['foil','scanlines','vignette','chromatic','grain_heavy','none','foil','none']
  return effects[Math.floor(rng() * effects.length)]
}

// ── Draw background style ─────────────────────────────────────────────────────
function drawCardBackground(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, zoneH: number,
  style: CardStyle,
  hue: number, sat: number, lit: number,
  rng: () => number,
  entityBg: {color:string; name:string} | null
) {
  const [r1,g1,b1] = hslToRgb(hue, sat, lit)
  const [r2,g2,b2] = hslToRgb((hue+40)%360, sat-10, lit-18)
  const [r3,g3,b3] = hslToRgb((hue+80)%360, sat-20, lit-8)
  const c1 = `rgb(${r1},${g1},${b1})`
  const c2 = `rgb(${r2},${g2},${b2})`
  const c3 = `rgb(${r3},${g3},${b3})`
  const a1 = `rgba(${r1},${g1},${b1},0)`
  const a2 = `rgba(${r2},${g2},${b2},0)`

  // Card base bg
  const isDark = lit < 45
  const bgBase = entityBg
    ? (isDark ? '#0e0e12' : '#f8f7f2')
    : (isDark ? `hsl(${hue},18%,8%)` : `hsl(${hue},12%,97%)`)

  ctx.fillStyle = bgBase
  ctx.fillRect(0,0,W,H)

  // Entity background gradient overlay
  if (entityBg) {
    const [er,eg,eb] = hexToRgb(entityBg.color)
    const eg2 = ctx.createLinearGradient(0,0,W,H)
    eg2.addColorStop(0, `rgba(${er},${eg},${eb},0.18)`)
    eg2.addColorStop(1, `rgba(${er},${eg},${eb},0.06)`)
    ctx.fillStyle = eg2
    ctx.fillRect(0,0,W,H)
  }

  ctx.save()
  ctx.beginPath(); ctx.rect(0,0,W,zoneH); ctx.clip()

  switch(style) {

    case 'geometric_rays': {
      // Radiating bands from a corner — inspired by Polish student IDs
      const cx = W * (rng() < 0.5 ? -0.05 : 1.05)
      const cy = H * (-0.1 + rng() * 0.2)
      const numRays = 14 + Math.floor(rng() * 8)
      const totalAngle = Math.PI * (0.55 + rng() * 0.25)
      const startAngle = cy < H/2 ? 0.1 : -Math.PI + 0.1

      for (let i = 0; i < numRays; i++) {
        const angle1 = startAngle + (i / numRays) * totalAngle
        const angle2 = startAngle + ((i+1) / numRays) * totalAngle
        const dist = Math.sqrt(W*W+H*H) * 1.6

        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(angle1)*dist, cy + Math.sin(angle1)*dist)
        ctx.lineTo(cx + Math.cos(angle2)*dist, cy + Math.sin(angle2)*dist)
        ctx.closePath()

        const t = i / numRays
        const alpha = i % 2 === 0 ? 0.85 : 0.65
        const rayGrad = ctx.createLinearGradient(cx, cy, cx + Math.cos((angle1+angle2)/2)*dist*0.7, cy + Math.sin((angle1+angle2)/2)*dist*0.7)
        if (i % 2 === 0) {
          rayGrad.addColorStop(0, c1)
          rayGrad.addColorStop(1, c2)
        } else {
          rayGrad.addColorStop(0, c2)
          rayGrad.addColorStop(1, c3)
        }
        ctx.globalAlpha = alpha
        ctx.fillStyle = rayGrad
        ctx.fill()
      }
      ctx.globalAlpha = 1
      break
    }

    case 'layer_stack': {
      // Stacked semi-transparent layers shrinking toward center — gradient covers image
      const numLayers = 7 + Math.floor(rng() * 4)
      const shapeType = rng() < 0.33 ? 'rect' : rng() < 0.5 ? 'hex' : 'rounded'
      const baseAlpha = 0.75

      for (let i = numLayers-1; i >= 0; i--) {
        const t = i / numLayers
        const margin = (1-t) * W * 0.42
        const topMargin = (1-t) * zoneH * 0.38
        const layerAlpha = baseAlpha * (0.4 + t * 0.6)
        const hShift = (i * 22) % 360

        const lg = ctx.createLinearGradient(margin, topMargin, W-margin, zoneH-topMargin*0.4)
        lg.addColorStop(0, `hsl(${(hue + hShift*0.8)%360},${sat}%,${lit}%)`)
        lg.addColorStop(1, `hsl(${(hue + hShift)%360},${sat-15}%,${Math.max(lit-20,15)}%)`)

        ctx.globalAlpha = layerAlpha
        ctx.fillStyle = lg

        if (shapeType === 'rect') {
          ctx.fillRect(margin, topMargin, W-margin*2, zoneH-topMargin)
        } else if (shapeType === 'rounded') {
          roundRect(ctx, margin, topMargin, W-margin*2, zoneH-topMargin, 18)
          ctx.fill()
        } else {
          // Hexagon-ish
          const cx2 = W/2, cy2 = topMargin + (zoneH-topMargin)/2
          const rx = (W-margin*2)/2, ry = (zoneH-topMargin)/2
          ctx.beginPath()
          for (let j=0;j<6;j++) {
            const a = (j/6)*Math.PI*2 - Math.PI/6
            j===0 ? ctx.moveTo(cx2+Math.cos(a)*rx, cy2+Math.sin(a)*ry*0.85)
                  : ctx.lineTo(cx2+Math.cos(a)*rx, cy2+Math.sin(a)*ry*0.85)
          }
          ctx.closePath()
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      break
    }

    case 'wave_lines': {
      // Parallel wave lines filling the zone — Seoul psychedelic wave
      const numWaves = 28 + Math.floor(rng() * 16)
      const amplitude = 20 + rng() * 50
      const frequency = 0.008 + rng() * 0.016
      const phaseShift = rng() * Math.PI * 2
      const lineW = zoneH / numWaves

      for (let wi = 0; wi < numWaves; wi++) {
        const t = wi / numWaves
        const y0 = (wi / numWaves) * zoneH
        const hh = hue + t * 60
        const ll = lit - t * 20

        ctx.beginPath()
        ctx.moveTo(-10, y0)
        for (let x=0; x<=W+10; x+=3) {
          const wave = Math.sin(x * frequency + phaseShift + wi * 0.3) * amplitude
          ctx.lineTo(x, y0 + wave)
        }
        ctx.lineTo(W+10, zoneH+10)
        ctx.lineTo(-10, zoneH+10)
        ctx.closePath()

        ctx.fillStyle = `hsl(${hh%360},${sat}%,${ll}%)`
        ctx.globalAlpha = 0.9
        ctx.fill()
      }
      ctx.globalAlpha = 1
      break
    }

    case 'checkerboard': {
      // Bold checker + color gradient shift per row/col — Brooklyn image
      const cols = 8 + Math.floor(rng() * 6)
      const cellW = W / cols
      const rows = Math.ceil(zoneH / cellW)

      for (let row=0; row<rows; row++) {
        for (let col=0; col<cols; col++) {
          const t = (row + col) / (rows + cols)
          const isOn = (row + col) % 2 === 0
          if (!isOn) continue
          const h2 = (hue + t * 45) % 360
          ctx.fillStyle = `hsl(${h2},${sat}%,${lit - t*15}%)`
          ctx.globalAlpha = 0.9
          ctx.fillRect(col*cellW, row*cellW, cellW, cellW)
        }
      }
      ctx.globalAlpha = 1
      break
    }

    case 'holographic': {
      // Holographic iridescent gradient — Tokyo Olympics ticket style
      const numStops = 8
      const grad = ctx.createLinearGradient(0, 0, W * (0.7 + rng()*0.6), zoneH * (0.6 + rng()*0.5))

      const holoHues = [hue, (hue+45)%360, (hue+90)%360, (hue+135)%360, (hue+180)%360,
                        (hue+225)%360, (hue+270)%360, (hue+315)%360]
      for (let i=0; i<numStops; i++) {
        const t = i / (numStops-1)
        const hh = holoHues[i]
        grad.addColorStop(t, `hsl(${hh},${80 + rng()*15}%,${60 + rng()*20}%)`)
      }

      ctx.globalAlpha = 0.92
      ctx.fillStyle = grad
      ctx.fillRect(0,0,W,zoneH)

      // White shimmer overlay
      const shimmer = ctx.createLinearGradient(W*0.1, 0, W*0.9, zoneH)
      shimmer.addColorStop(0, 'rgba(255,255,255,0)')
      shimmer.addColorStop(0.35, 'rgba(255,255,255,0.22)')
      shimmer.addColorStop(0.5, 'rgba(255,255,255,0.38)')
      shimmer.addColorStop(0.65, 'rgba(255,255,255,0.22)')
      shimmer.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = shimmer
      ctx.fillRect(0,0,W,zoneH)
      ctx.globalAlpha = 1
      break
    }

    case 'boarding_pass': {
      // Ticket/boarding pass aesthetic — gradient upper block + info strips
      const grad = ctx.createLinearGradient(0, 0, W, zoneH)
      grad.addColorStop(0, c1)
      grad.addColorStop(0.4, c2)
      grad.addColorStop(1, c3)
      ctx.fillStyle = grad
      ctx.globalAlpha = 0.95
      ctx.fillRect(0,0,W,zoneH)
      ctx.globalAlpha = 1

      // Perforated dashed line near bottom of zone
      const perf = zoneH * 0.85
      ctx.setLineDash([8, 6])
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(20, perf); ctx.lineTo(W-20, perf); ctx.stroke()
      ctx.setLineDash([])

      // Mini barcode-style stripes at bottom
      const barH = zoneH * 0.12
      const barY = zoneH * 0.87
      const numBars = 32 + Math.floor(rng() * 16)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      for (let bi=0; bi<numBars; bi++) {
        const bw = 1 + Math.floor(rng() * 4)
        const bx = 40 + rng() * (W-80)
        ctx.fillRect(bx, barY, bw, barH * (0.5 + rng()*0.5))
      }
      break
    }

    case 'diagonal_bands': {
      // Bold diagonal colored bands — Polish ID diagonal variant
      const numBands = 8 + Math.floor(rng() * 6)
      const angle = 35 + rng() * 30
      const rad = (angle * Math.PI) / 180
      const bandW = (W * 1.8) / numBands

      for (let bi=0; bi<numBands; bi++) {
        const t = bi / numBands
        const x = bi * bandW - W * 0.4
        const h2 = (hue + bi * 18) % 360
        const l2 = lit - bi * 4
        const isEven = bi % 2 === 0

        ctx.save()
        ctx.translate(x, -zoneH*0.2)
        ctx.rotate(rad)

        const bandGrad = ctx.createLinearGradient(0,0,bandW,0)
        bandGrad.addColorStop(0, `hsl(${h2},${sat}%,${l2}%)`)
        bandGrad.addColorStop(1, `hsl(${(h2+20)%360},${sat-8}%,${Math.max(l2-15,15)}%)`)

        ctx.fillStyle = bandGrad
        ctx.globalAlpha = isEven ? 0.88 : 0.72
        ctx.fillRect(0, 0, bandW*0.82, zoneH*2.5)
        ctx.restore()
      }
      ctx.globalAlpha = 1
      break
    }

    case 'concentric_shapes': {
      // Nested concentric shapes shrinking with glow
      const numRings = 9 + Math.floor(rng() * 5)
      const shapeN = Math.floor(rng() * 4) + 3 // 3=triangle, 4=diamond, 5=pentagon, 6=hex
      const cx = W * (0.35 + rng() * 0.30)
      const cy = zoneH * (0.35 + rng() * 0.25)
      const maxR = Math.min(W, zoneH) * 0.78

      // Background solid first
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
      bgGrad.addColorStop(0, c1)
      bgGrad.addColorStop(1, c3)
      ctx.fillStyle = bgGrad
      ctx.fillRect(0,0,W,zoneH)

      for (let ri=numRings-1; ri>=0; ri--) {
        const t = ri / numRings
        const r = maxR * t
        const hh = (hue + ri * 15) % 360
        const ll = 30 + ri * (60/numRings)
        const alpha = 0.15 + (1-t) * 0.5

        ctx.beginPath()
        for (let pi=0; pi<shapeN; pi++) {
          const a = (pi/shapeN)*Math.PI*2 - Math.PI/2
          const px = cx + Math.cos(a)*r
          const py = cy + Math.sin(a)*r
          pi===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py)
        }
        ctx.closePath()

        ctx.strokeStyle = `hsl(${hh},${sat}%,${ll}%)`
        ctx.lineWidth = 3 + (1-t) * 4
        ctx.globalAlpha = alpha
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      break
    }

    case 'ink_splatter':
    default: {
      // Dramatic organic ink splash — evolved from original blob
      const numSplats = 2 + Math.floor(rng() * 3)
      for (let si=0; si<numSplats; si++) {
        const scx = W * (0.1 + rng() * 0.8)
        const scy = zoneH * (-0.1 + rng() * 0.8)
        const sr = Math.min(W, zoneH) * (0.45 + rng() * 0.55)
        const n = 8 + Math.floor(rng()*6)
        const pts: [number,number][] = []
        for (let i=0;i<n;i++) {
          const a = (i/n)*Math.PI*2 - Math.PI/2
          const rr = sr * (0.35 + rng()*1.0)
          pts.push([scx+Math.cos(a)*rr, scy+Math.sin(a)*rr])
        }
        ctx.beginPath()
        for (let i=0;i<pts.length;i++) {
          const p0=pts[(i-1+n)%n], p1=pts[i], p2=pts[(i+1)%n], p3=pts[(i+2)%n]
          const cp1x=p1[0]+(p2[0]-p0[0])/5, cp1y=p1[1]+(p2[1]-p0[1])/5
          const cp2x=p2[0]-(p3[0]-p1[0])/5, cp2y=p2[1]-(p3[1]-p1[1])/5
          if (i===0) ctx.moveTo(p1[0],p1[1])
          ctx.bezierCurveTo(cp1x,cp1y,cp2x,cp2y,p2[0],p2[1])
        }
        ctx.closePath()
        const sg = ctx.createRadialGradient(scx-sr*0.2,scy-sr*0.2,sr*0.03,scx+sr*0.1,scy+sr*0.1,sr*1.0)
        sg.addColorStop(0, c1)
        sg.addColorStop(0.55, c2)
        sg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = sg
        ctx.globalAlpha = si === 0 ? 0.92 : 0.65
        ctx.fill()
      }
      ctx.globalAlpha = 1
      break
    }
  }
  ctx.restore()
}

// ── Draw effect overlay (independent of background) ───────────────────────────
function drawCardEffect(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, zoneH: number,
  effect: CardEffect,
  hue: number,
  rng: () => number
) {
  switch(effect) {
    case 'foil': {
      // Gold/silver foil shimmer in diagonal
      const foilGrad = ctx.createLinearGradient(0, 0, W, zoneH)
      foilGrad.addColorStop(0.00, 'rgba(255,255,255,0.00)')
      foilGrad.addColorStop(0.30, 'rgba(255,255,255,0.06)')
      foilGrad.addColorStop(0.42, 'rgba(255,240,180,0.28)')
      foilGrad.addColorStop(0.50, 'rgba(255,255,255,0.38)')
      foilGrad.addColorStop(0.58, 'rgba(200,220,255,0.22)')
      foilGrad.addColorStop(0.70, 'rgba(255,255,255,0.06)')
      foilGrad.addColorStop(1.00, 'rgba(255,255,255,0.00)')
      ctx.save()
      ctx.beginPath(); ctx.rect(0,0,W,zoneH); ctx.clip()
      ctx.fillStyle = foilGrad; ctx.fillRect(0,0,W,zoneH)
      ctx.restore()
      break
    }
    case 'scanlines': {
      // Horizontal scanlines CRT effect
      ctx.save()
      ctx.beginPath(); ctx.rect(0,0,W,zoneH); ctx.clip()
      for (let y=0; y<zoneH; y+=3) {
        ctx.fillStyle = 'rgba(0,0,0,0.12)'
        ctx.fillRect(0,y,W,1)
      }
      ctx.restore()
      break
    }
    case 'vignette': {
      const vgGrad = ctx.createRadialGradient(W/2, zoneH/2, zoneH*0.2, W/2, zoneH/2, zoneH*0.85)
      vgGrad.addColorStop(0, 'rgba(0,0,0,0)')
      vgGrad.addColorStop(1, 'rgba(0,0,0,0.45)')
      ctx.save()
      ctx.beginPath(); ctx.rect(0,0,W,zoneH); ctx.clip()
      ctx.fillStyle = vgGrad; ctx.fillRect(0,0,W,zoneH)
      ctx.restore()
      break
    }
    case 'chromatic': {
      // Chromatic aberration fringe at edges
      ctx.save()
      ctx.beginPath(); ctx.rect(0,0,W,zoneH); ctx.clip()
      const cg1 = ctx.createLinearGradient(0,0,W*0.15,0)
      cg1.addColorStop(0,'rgba(255,0,0,0.08)'); cg1.addColorStop(1,'rgba(255,0,0,0)')
      ctx.fillStyle = cg1; ctx.fillRect(0,0,W,zoneH)
      const cg2 = ctx.createLinearGradient(W,0,W*0.85,0)
      cg2.addColorStop(0,'rgba(0,80,255,0.08)'); cg2.addColorStop(1,'rgba(0,80,255,0)')
      ctx.fillStyle = cg2; ctx.fillRect(0,0,W,zoneH)
      ctx.restore()
      break
    }
    case 'grain_heavy': {
      addGrain(ctx, rng, W, zoneH, 0.09, 12000)
      break
    }
    case 'none':
    default:
      break
  }
}

// ── Draw info section (bottom of card) ───────────────────────────────────────
function drawCardInfo(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, zoneH: number,
  user: {full_name:string; email:string; nusp?:string; id:string; avatar_url?:string},
  activeAchievements: Achievement[],
  area: string, language: string,
  hue: number, sat: number,
  entityBg: {color:string; name:string} | null,
  style: CardStyle,
) {
  const isDark = style === 'checkerboard' || style === 'holographic' || style === 'diagonal_bands'
  const onDark = hslToRgb(hue, sat, 15)
  const inkColor  = entityBg
    ? `hsl(${hue},55%,12%)`
    : isDark ? `rgba(${onDark[0]},${onDark[1]},${onDark[2]},0.9)` : `hsl(${hue},55%,12%)`
  const inkFaint  = entityBg
    ? `hsl(${hue},30%,45%)`
    : isDark ? `rgba(255,255,255,0.65)` : `hsl(${hue},30%,45%)`
  const accentPill= `hsl(${hue},${sat}%,${Math.max(40-sat*0.1,20)}%)`

  const textX = 44
  const nameY = H * 0.606

  // Name
  const parts     = user.full_name.trim().split(/\s+/)
  const firstName = parts[0] ?? ''
  const lastName  = parts.slice(1).join(' ')

  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font         = '800 52px sans-serif'
  ctx.fillStyle    = inkColor
  ctx.fillText(firstName, textX, nameY)
  const fnW = ctx.measureText(firstName).width

  if (lastName) {
    ctx.font      = '300 52px sans-serif'
    ctx.fillStyle = inkFaint
    const spW = ctx.measureText(' ').width
    if (fnW + spW + ctx.measureText(lastName).width < W - textX * 2)
      ctx.fillText(lastName, textX + fnW + spW, nameY)
    else
      ctx.fillText(lastName, textX, nameY + 58)
  }

  // Title
  const titleRng  = seededRng(user.id + '-title')
  const titleText = TITLES[Math.floor(titleRng() * TITLES.length)]
  const titleY    = nameY + 42
  ctx.font        = '400 17px sans-serif'
  ctx.fillStyle   = inkFaint
  ctx.fillText(titleText, textX, titleY)

  // USP + email
  const infoY   = titleY + 30
  const nuspStr = user.nusp ? `#${user.nusp}` : ''
  ctx.font      = '400 12px monospace'
  ctx.fillStyle = inkFaint
  ctx.globalAlpha = 0.6
  ctx.fillText([nuspStr, user.email].filter(Boolean).join('  ·  '), textX, infoY)
  ctx.globalAlpha = 1

  // Style badge — small watermark top-right showing the card style
  ctx.font = '500 9px monospace'
  ctx.fillStyle = inkFaint
  ctx.globalAlpha = 0.28
  ctx.textAlign = 'right'
  const styleLabel: Record<CardStyle,string> = {
    geometric_rays:'GEO', layer_stack:'LAY', wave_lines:'WAV',
    checkerboard:'CHK', holographic:'HOL', boarding_pass:'TKT',
    diagonal_bands:'DIA', concentric_shapes:'CON', ink_splatter:'INK',
  }
  ctx.fillText(styleLabel[style] ?? 'USP', W-textX, 32)
  ctx.textAlign = 'left'
  ctx.globalAlpha = 1

  // Bottom: area|language pill
  const bottomY = H - 64
  const aLabel  = area || '', lLabel = language || ''
  if (aLabel || lLabel) {
    const pillH = 38
    ctx.font = '600 13px sans-serif'
    const aW    = aLabel ? ctx.measureText(aLabel).width + 22 : 0
    const lW    = lLabel ? ctx.measureText(lLabel).width + 22 : 0
    const sepW  = (aLabel && lLabel) ? 12 : 0
    const totalW = aW + sepW + lW

    ctx.strokeStyle = accentPill; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5
    roundRect(ctx, textX, bottomY, totalW, pillH, pillH/2); ctx.stroke()
    ctx.globalAlpha = 1

    if (aLabel && lLabel) {
      ctx.save()
      ctx.beginPath()
      roundRect(ctx, textX+aW, bottomY+4, sepW, pillH-8, 2); ctx.clip()
      ctx.fillStyle = accentPill; ctx.globalAlpha = 0.10
      ctx.fillRect(textX+aW, bottomY+4, sepW, pillH-8)
      ctx.globalAlpha = 0.35; ctx.strokeStyle = accentPill; ctx.lineWidth = 1
      for (let sx = -pillH; sx < sepW + pillH; sx += 4) {
        ctx.beginPath()
        ctx.moveTo(textX+aW+sx, bottomY+4)
        ctx.lineTo(textX+aW+sx+pillH, bottomY+4+pillH)
        ctx.stroke()
      }
      ctx.globalAlpha = 1; ctx.restore()
    }

    ctx.fillStyle = accentPill; ctx.textAlign = 'center'
    if (aLabel) ctx.fillText(aLabel, textX + aW/2, bottomY + pillH/2 + 5)
    if (lLabel) ctx.fillText(lLabel, textX + aW + sepW + lW/2, bottomY + pillH/2 + 5)
    ctx.textAlign = 'left'
  }

  // Achievements — right-aligned
  const displayA = activeAchievements.filter(a => a.unlocked).slice(0, 5)
  if (displayA.length > 0) {
    let bx = W - textX
    ctx.textAlign = 'right'; ctx.font = '26px serif'
    for (const ach of [...displayA].reverse()) {
      ctx.globalAlpha = 1; ctx.fillText(ach.emoji, bx, bottomY + 30); bx -= 30
    }
    ctx.textAlign = 'left'; ctx.globalAlpha = 1
  }

  // ID watermark
  ctx.font = '400 9px monospace'; ctx.fillStyle = inkColor; ctx.globalAlpha = 0.18
  ctx.fillText(user.id.replace(/-/g,'').slice(0,8).toUpperCase(), textX, H-22)
  ctx.globalAlpha = 1
}

// ── Main card draw function ─────────────────────────────────────────────────
function drawPortraitCard(
  canvas: HTMLCanvasElement,
  user: {full_name:string; email:string; nusp?:string; id:string; avatar_url?:string},
  activeAchievements: Achievement[],
  area: string, language: string,
  entityBg: {color:string; name:string} | null,
) {
  const W = 680, H = 920
  canvas.width  = W * 2; canvas.height = H * 2
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2)

  const rngColor  = seededRng(user.id + '-hue')
  const rngBg     = seededRng(user.id + '-bg-rng')
  const hue       = Math.floor(rngColor() * 360)
  const sat       = 70 + Math.floor(rngColor() * 20)
  const lit       = 48 + Math.floor(rngColor() * 20)

  const style     = pickCardStyle(user.id)
  const effect    = pickCardEffect(user.id)
  const zoneH     = H * 0.57

  ctx.clearRect(0, 0, W, H)

  // ── [1] Rounded card clip
  ctx.save()
  roundRect(ctx, 0, 0, W, H, 32); ctx.clip()

  // ── [2] Draw background pattern
  drawCardBackground(ctx, W, H, zoneH, style, hue, sat, lit, rngBg, entityBg)

  // ── [3] Grain over background zone
  addGrain(ctx, seededRng(user.id + '-grain'), W, zoneH, 0.04, 5000)

  // ── [4] Draw effect overlay (foil / scanlines / etc)
  drawCardEffect(ctx, W, H, zoneH, effect, hue, seededRng(user.id + '-efx'))

  // ── [5] Grain over whole card (subtle)
  addGrain(ctx, seededRng(user.id + '-bg-g'), W, H, 0.010, 1800)

  ctx.restore() // restore [1]

  // ── [6] Draw text info section (outside card clip for text sharpness)
  ctx.save()
  roundRect(ctx, 0, 0, W, H, 32); ctx.clip()
  drawCardInfo(ctx, W, H, zoneH, user, activeAchievements, area, language, hue, sat, entityBg, style)

  // ── [7] Border
  ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.globalAlpha = 1; ctx.lineWidth = 1.5
  roundRect(ctx, 0.75, 0.75, W-1.5, H-1.5, 32); ctx.stroke()
  ctx.restore()
}


// ── Achievement Picker ────────────────────────────────────────────────────────
function AchievementPicker({achievements,selected,onSave,onClose}: {
  achievements:Achievement[]; selected:string[]
  onSave:(ids:string[])=>void; onClose:()=>void
}) {
  const [sel,setSel]=useState<string[]>(selected)
  const [filterCat,setFilterCat]=useState<string>("all")
  const [search,setSearch]=useState("")
  const MAX=5
  const toggle=(id:string)=>setSel(p=>p.includes(id)?p.filter(x=>x!==id):p.length<MAX?[...p,id]:p)
  const cats=["all",...Array.from(new Set(achievements.map(a=>a.category)))]

  const shown = achievements.filter(a => {
    const catOk = filterCat === "all" || a.category === filterCat
    const searchOk = !search.trim() || a.label.toLowerCase().includes(search.toLowerCase()) || a.desc.toLowerCase().includes(search.toLowerCase())
    return catOk && searchOk
  })

  const unlockedCount=achievements.filter(a=>a.unlocked).length
  const selectedObjects=achievements.filter(a=>sel.includes(a.id)&&a.unlocked)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
         style={{background:"rgba(0,0,0,0.72)",backdropFilter:"blur(10px)"}}
         onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl overflow-hidden animate-in"
           style={{background:"var(--bg-card)",border:"1px solid var(--border)",maxHeight:"92dvh",display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,0.6)"}}>

        {/* Handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{background:"var(--border-light)"}}/>
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between" style={{borderBottom:"1px solid var(--border)"}}>
          <div>
            <h3 className="font-display font-bold text-base flex items-center gap-2" style={{color:"var(--text-primary)"}}>
              <Trophy size={17} style={{color:"#f59e0b"}}/> Conquistas no cartão
            </h3>
            <p className="text-xs mt-1" style={{color:"var(--text-muted)"}}>
              {unlockedCount} desbloqueadas · selecione até {MAX} para exibir no cartão
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ml-3"
                  style={{background:"var(--border)",color:"var(--text-muted)"}}><X size={15}/></button>
        </div>

        {/* Selected preview strip */}
        {selectedObjects.length > 0 && (
          <div className="px-5 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-hide"
               style={{background:"var(--bg-elevated)",borderBottom:"1px solid var(--border)"}}>
            <span className="text-[10px] font-semibold shrink-0" style={{color:"var(--text-muted)"}}>No cartão:</span>
            {selectedObjects.map(a=>(
              <button key={a.id} onClick={()=>toggle(a.id)}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all hover:opacity-80"
                      style={{background:a.color+"22",border:`1px solid ${a.color}55`,color:a.color}}>
                <span>{a.emoji}</span>
                <span>{a.label}</span>
                <X size={9}/>
              </button>
            ))}
            <span className="shrink-0 text-[10px]" style={{color:"var(--text-muted)",opacity:0.6}}>{sel.length}/{MAX}</span>
          </div>
        )}

        {/* Search */}
        <div className="px-4 pt-3 pb-1">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:"var(--text-muted)"}}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text" placeholder="Buscar conquistas..." value={search}
              onChange={e=>setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-sm"
              style={{background:"var(--bg-elevated)",border:"1px solid var(--border)",color:"var(--text-primary)",outline:"none"}}
            />
          </div>
        </div>

        {/* Category filter chips */}
        <div className="px-4 py-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {cats.map(cat=>(
            <button key={cat} onClick={()=>setFilterCat(cat)}
                    className="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
                    style={{
                      background:filterCat===cat?"var(--accent-soft)":"var(--bg-elevated)",
                      border:`1px solid ${filterCat===cat?"var(--accent-1)":"var(--border)"}`,
                      color:filterCat===cat?"var(--accent-3)":"var(--text-muted)",
                    }}>
              {cat==="all"
                ? `✨ Todas (${achievements.filter(a=>a.unlocked).length})`
                : `${CATEGORY_LABELS[cat]??cat} (${achievements.filter(a=>a.category===cat&&a.unlocked).length})`}
            </button>
          ))}
        </div>

        {/* Achievement grid */}
        <div className="px-4 pb-2 overflow-y-auto flex-1">
          {shown.length === 0 && (
            <div className="text-center py-10" style={{color:"var(--text-muted)"}}>
              <p className="text-sm">Nenhuma conquista encontrada</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {shown.map(a=>{
              const isSelected=sel.includes(a.id)
              const rarityColor=RARITY_COLOR[a.rarity]
              const cantSelect=!a.unlocked && !isSelected
              return (
                <button key={a.id} onClick={()=>a.unlocked&&toggle(a.id)} disabled={cantSelect}
                        className="flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all"
                        style={{
                          border:`2px solid ${isSelected?a.color:a.unlocked?"var(--border-light)":"var(--border)"}`,
                          background:isSelected?a.color+"15":a.unlocked?"var(--bg-elevated)":"var(--bg-base)",
                          opacity:a.unlocked?1:0.5,
                          cursor:a.unlocked?"pointer":"not-allowed",
                          transform:isSelected?"scale(1.01)":"scale(1)",
                          boxShadow:isSelected?`0 4px 16px ${a.color}25`:"none",
                        }}>
                  {/* Emoji + rarity dot */}
                  <div className="relative shrink-0">
                    <span className="text-2xl" style={{filter:a.unlocked?"none":"grayscale(1)"}}>{a.unlocked?a.emoji:"🔒"}</span>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                         style={{background:rarityColor,borderColor:"var(--bg-elevated)",opacity:a.unlocked?1:0.4}}/>
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-bold truncate" style={{color:isSelected?a.color:"var(--text-primary)"}}>{a.label}</p>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{background:rarityColor+"20",color:rarityColor}}>{RARITY_LABEL[a.rarity]}</span>
                    </div>
                    <p className="text-[11px] leading-snug" style={{color:"var(--text-muted)"}}>
                      {a.unlocked ? a.desc : `🔒 ${a.hint}`}
                    </p>
                  </div>
                  {/* Check mark */}
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                         style={{background:a.color,boxShadow:`0 2px 8px ${a.color}60`}}>
                      <Check size={12} color="white"/>
                    </div>
                  )}
                  {!a.unlocked && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                         style={{background:"var(--bg-elevated)",border:"1px solid var(--border)"}}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{color:"var(--text-muted)"}}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 flex gap-2" style={{borderTop:"1px solid var(--border)"}}>
          <button className="btn-primary flex-1 justify-center" onClick={()=>{onSave(sel);onClose()}}>
            <Check size={14}/> Salvar seleção
          </button>
          <button className="btn-ghost" onClick={()=>{onSave(selected);onClose()}}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ── Entity Background Picker ──────────────────────────────────────────────────
interface Entity {id:string; slug:string; name:string; short_name:string; color:string; icon_emoji:string; is_member:boolean}

function EntityBgPicker({entities,currentEntityId,onSave,onClose}: {
  entities:Entity[]; currentEntityId:string|null
  onSave:(entityId:string|null)=>void; onClose:()=>void
}) {
  const [sel,setSel]=useState<string|null>(currentEntityId)
  const memberEntities=entities.filter(e=>e.is_member)
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
         style={{background:"rgba(0,0,0,0.72)",backdropFilter:"blur(8px)"}}
         onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden animate-in"
           style={{background:"var(--bg-card)",border:"1px solid var(--border)",maxHeight:"80dvh",boxShadow:"0 24px 64px rgba(0,0,0,0.5)"}}>
        <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full" style={{background:"var(--border-light)"}}/></div>
        <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{borderBottom:"1px solid var(--border)"}}>
          <div>
            <h3 className="font-display font-bold flex items-center gap-2" style={{color:"var(--text-primary)"}}>
              <ImagePlus size={16} style={{color:"var(--accent-3)"}}/> Fundo do cartão
            </h3>
            <p className="text-xs mt-0.5" style={{color:"var(--text-muted)"}}>Escolha uma entidade da qual você faz parte</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{background:"var(--border)",color:"var(--text-muted)"}}><X size={15}/></button>
        </div>
        <div className="px-4 py-3 space-y-2 overflow-y-auto" style={{maxHeight:"55dvh"}}>
          <button onClick={()=>setSel(null)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                  style={{border:`2px solid ${sel===null?"var(--accent-1)":"var(--border)"}`,background:sel===null?"var(--accent-soft)":"var(--bg-elevated)"}}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:"var(--border)"}}>
              <Sparkles size={16} style={{color:"var(--text-muted)"}}/>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>Padrão</p>
              <p className="text-xs" style={{color:"var(--text-muted)"}}>Cor única gerada pelo seu ID</p>
            </div>
            {sel===null&&<Check size={14} className="ml-auto" style={{color:"var(--accent-3)"}}/>}
          </button>
          {memberEntities.length===0&&(
            <div className="text-center py-8" style={{color:"var(--text-muted)"}}>
              <Lock size={24} className="mx-auto mb-2 opacity-40"/>
              <p className="text-sm">Entre em alguma entidade primeiro</p>
            </div>
          )}
          {memberEntities.map(e=>(
            <button key={e.id} onClick={()=>setSel(e.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={{border:`2px solid ${sel===e.id?e.color:"var(--border)"}`,background:sel===e.id?e.color+"15":"var(--bg-elevated)"}}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                   style={{background:e.color+"22",border:`1px solid ${e.color}44`}}>{e.icon_emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{color:sel===e.id?e.color:"var(--text-primary)"}}>{e.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-2 h-2 rounded-full" style={{background:e.color}}/>
                  <p className="text-[10px]" style={{color:"var(--text-muted)"}}>{e.short_name}</p>
                </div>
              </div>
              {sel===e.id&&<Check size={14} style={{color:e.color,flexShrink:0}}/>}
            </button>
          ))}
        </div>
        <div className="px-4 py-4 flex gap-2" style={{borderTop:"1px solid var(--border)"}}>
          <button className="btn-primary flex-1 justify-center" onClick={()=>{onSave(sel);onClose()}}><Check size={14}/> Aplicar</button>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ── Profile Page ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const {user,logout,setUser}=useAuthStore()
  const navigate=useNavigate()
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const fileInputRef=useRef<HTMLInputElement>(null)

  const [area,setAreaState]=useState<string>(()=>localStorage.getItem("dasiboard-area")??"")
  const [language,setLanguageState]=useState<string>(()=>localStorage.getItem("dasiboard-lang")??"")
  const [activeAchievIds,setActiveAchievIds]=useState<string[]>(()=>{
    try{return JSON.parse(localStorage.getItem("dasiboard-achievements")??"[]")}catch{return[]}
  })
  const [entityBgId,setEntityBgId]=useState<string|null>(()=>localStorage.getItem("dasiboard-card-entity")??null)
  const [showAchievPicker,setShowAchievPicker]=useState(false)
  const [showEntityPicker,setShowEntityPicker]=useState(false)
  const [avatarLoading,setAvatarLoading]=useState(false)
  const [activeTab,setActiveTab]=useState<"conquistas"|"stats"|"conta">("conquistas")
  const stats = useStudyStats()

  const [entities,setEntities]=useState<Entity[]>([])
  const [memberSlugs,setMemberSlugs]=useState<string[]>([])
  const [hasBoards,setHasBoards]=useState(false)
  const [hasMultiBoards,setHasMultiBoards]=useState(false)
  const [hasPassedSubject,setHasPassedSubject]=useState(false)
  const [hasFailedSubject,setHasFailedSubject]=useState(false)
  const [eventCount,setEventCount]=useState(0)
  const [subjectCount,setSubjectCount]=useState(0)
  const [gradeCount,setGradeCount]=useState(0)
  const [easterEggFound,setEasterEggFound]=useState(false)

  useEffect(()=>{
    setEasterEggFound(!!localStorage.getItem("dasiboard-easter-found"))
    Promise.all([
      api.get("/entities/").catch(()=>({data:[]})),
      api.get("/kanban/boards").catch(()=>({data:[]})),
      api.get("/grades/subjects").catch(()=>({data:[]})),
      api.get("/events/").catch(()=>({data:[]})),
    ]).then(([entRes,boardRes,subRes,evtRes])=>{
      const ents=entRes.data as Entity[]
      setEntities(ents)
      setMemberSlugs(ents.filter((e:any)=>e.is_member).map((e:any)=>e.slug))
      const boards=boardRes.data as any[]
      setHasBoards(boards.length>0); setHasMultiBoards(boards.length>=3)
      const subjects=subRes.data as any[]
      setSubjectCount(subjects.length)
      const allGrades=subjects.flatMap((s:any)=>s.grades)
      setGradeCount(allGrades.length)
      let passed=false,failed=false
      subjects.forEach((s:any)=>{
        const tw=s.grades.reduce((a:number,g:any)=>a+g.weight,0)
        if(!tw)return
        const avg=s.grades.reduce((a:number,g:any)=>a+(g.value/g.max_value)*10*g.weight,0)/tw
        if(avg>=5)passed=true; else failed=true
      })
      setHasPassedSubject(passed); setHasFailedSubject(failed)
      setEventCount((evtRes.data as any[]).length)
    })
  },[])

  const achievements=useMemo(()=>buildAchievements({
    hasBoards, hasMultipleBoards:hasMultiBoards, hasLanguage:!!language,
    hasArea:!!area, hasPassedSubject, hasFailedSubject, hasAvatar:!!user?.avatar_url,
    hasNusp:!!user?.nusp, eventCount, subjectCount, gradeCount,
    loginCount:1, easterEggFound,
  }),[hasBoards,hasMultiBoards,language,area,hasPassedSubject,hasFailedSubject,user,eventCount,subjectCount,gradeCount,easterEggFound])

  const activeAchievements=useMemo(
    ()=>achievements.filter(a=>activeAchievIds.includes(a.id)&&a.unlocked),
    [achievements,activeAchievIds]
  )
  const entityBgData=useMemo(()=>{
    if(!entityBgId)return null
    const ent=entities.find(e=>e.id===entityBgId&&e.is_member)
    if(!ent)return null
    return {color:ent.color, name:ent.short_name||ent.name}
  },[entityBgId,entities])

  const draw=useCallback(()=>{
    if(!canvasRef.current||!user)return
    try{drawPortraitCard(canvasRef.current,user,activeAchievements,area,language,entityBgData)}
    catch(err){console.error("Card draw:",err)}
  },[user,activeAchievements,area,language,entityBgData])

  useEffect(()=>{draw()},[draw])

  const handleAvatarChange=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file)return
    if(file.size>2*1024*1024){toast.error("Imagem muito grande. Máximo 2MB.");return}
    setAvatarLoading(true)
    try{
      const base64=await new Promise<string>((res,rej)=>{
        const reader=new FileReader()
        reader.onload=()=>res(reader.result as string); reader.onerror=rej
        reader.readAsDataURL(file)
      })
      const{data}=await api.patch("/users/me/avatar",{avatar_url:base64})
      setUser(data); toast.success("Foto atualizada!")
    }catch{toast.error("Erro ao atualizar foto")}
    finally{setAvatarLoading(false);e.target.value=""}
  }
  const handleRemoveAvatar=async()=>{
    setAvatarLoading(true)
    try{const{data}=await api.patch("/users/me/avatar",{avatar_url:null});setUser(data);toast.success("Foto removida")}
    catch{toast.error("Erro ao remover foto")}finally{setAvatarLoading(false)}
  }
  const handleDownload=()=>{
    if(!canvasRef.current||!user)return
    const a=document.createElement("a")
    a.download=`dasiboard-${user.full_name.toLowerCase().replace(/\s+/g,"-")}.png`
    a.href=canvasRef.current.toDataURL("image/png",1.0); a.click()
  }

  const saveAchievements=(ids:string[])=>{localStorage.setItem("dasiboard-achievements",JSON.stringify(ids));setActiveAchievIds(ids)}
  const saveEntityBg=(id:string|null)=>{if(id)localStorage.setItem("dasiboard-card-entity",id);else localStorage.removeItem("dasiboard-card-entity");setEntityBgId(id)}
  const saveArea=(v:string)=>{localStorage.setItem("dasiboard-area",v);setAreaState(v)}
  const saveLang=(v:string)=>{localStorage.setItem("dasiboard-lang",v);setLanguageState(v)}

  if(!user)return null

  const userTitle=TITLES[Math.abs((user.full_name??"").split("").reduce((a:number,c:string)=>a+c.charCodeAt(0),0))%TITLES.length]
  const initials=user.full_name?.split(" ").map((n:string)=>n[0]).slice(0,2).join("").toUpperCase()??"U"
  const unlockedCount=achievements.filter(a=>a.unlocked).length

  const catGroups=Object.entries(
    achievements.reduce<Record<string,Achievement[]>>((acc,a)=>{
      if(!acc[a.category])acc[a.category]=[]
      acc[a.category].push(a); return acc
    },{})
  )

  return (
    <div className="px-3 py-4 sm:px-5 md:px-8 md:py-8 max-w-3xl mx-auto w-full page-mobile">
      {showAchievPicker&&<AchievementPicker achievements={achievements} selected={activeAchievIds} onSave={saveAchievements} onClose={()=>setShowAchievPicker(false)}/>}
      {showEntityPicker&&<EntityBgPicker entities={entities} currentEntityId={entityBgId} onSave={saveEntityBg} onClose={()=>setShowEntityPicker(false)}/>}

      {/* Header */}
      <div className="flex items-center gap-4 mb-7 animate-in">
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-2xl p-0.5" style={{background:"var(--gradient-btn)",boxShadow:"0 4px 20px var(--accent-glow)"}}>
            <div className="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center"
                 style={{background:user.avatar_url?"transparent":"var(--bg-card)"}}>
              {user.avatar_url?<img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover"/>
                :<span className="text-xl font-bold text-white font-display">{initials}</span>}
            </div>
          </div>
          {avatarLoading&&<div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{background:"rgba(0,0,0,0.5)"}}><RefreshCw size={14} className="animate-spin text-white"/></div>}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold truncate" style={{color:"var(--text-primary)"}}>{user.full_name}</h1>
          <p className="text-xs mt-0.5" style={{color:"var(--accent-3)"}}>{userTitle}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{background:"rgba(245,158,11,0.12)",color:"#f59e0b",border:"1px solid rgba(245,158,11,0.25)"}}>
              <Trophy size={9}/> {unlockedCount} conquistas
            </span>
            {entityBgData&&<span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{background:entityBgData.color+"18",color:entityBgData.color,border:`1px solid ${entityBgData.color}30`}}>{entityBgData.name}</span>}
          </div>
        </div>
      </div>

      {/* Card portrait */}
      <div className="mb-6 animate-in">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{color:"var(--text-muted)"}}>Cartão de perfil</p>
          <div className="flex gap-1.5">
            <button onClick={()=>setShowEntityPicker(true)} className="btn-ghost text-xs py-1.5 px-2.5 gap-1.5" title="Fundo da entidade">
              <ImagePlus size={12}/><span className="hidden sm:inline">Fundo</span>
            </button>
            <button onClick={()=>setShowAchievPicker(true)} className="btn-ghost text-xs py-1.5 px-2.5 gap-1.5">
              <Trophy size={12}/><span className="hidden sm:inline">Conquistas</span>
            </button>
            <button onClick={draw} className="btn-ghost text-xs py-1.5 px-2.5"><RefreshCw size={12}/></button>
            <button onClick={handleDownload} className="btn-primary text-xs py-1.5 px-2.5 gap-1.5">
              <Download size={12}/><span className="hidden sm:inline">PNG</span>
            </button>
          </div>
        </div>
        <div className="flex justify-center">
          {/* Aspect-ratio container for 680:920 portrait card */}
          <div style={{width:"100%",maxWidth:320,position:"relative"}}>
            <div style={{position:"relative",paddingBottom:`${(920/680)*100}%`,borderRadius:24,overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,0.22),0 6px 16px rgba(0,0,0,0.14)"}}>
              <canvas
                ref={canvasRef}
                onClick={handleDownload}
                title="Clique para baixar"
                style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",cursor:"pointer",borderRadius:24,display:"block"}}
              />
            </div>
          </div>
        </div>
        <p className="text-[10px] text-center mt-2.5" style={{color:"var(--text-muted)"}}>Único por conta · clique para baixar · blob gerado pelo seu ID</p>
      </div>

      {/* Área & Linguagem */}
      <div className="card mb-4 animate-in-delay-1">
        <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2" style={{color:"var(--text-primary)"}}>
          <Code2 size={15} style={{color:"var(--accent-3)"}}/> Área & Linguagem
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Área de atuação</label>
            <select className="input text-sm" value={area} onChange={e=>saveArea(e.target.value)}>
              <option value="">Selecionar...</option>
              {AREAS.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Linguagem principal</label>
            <select className="input text-sm" value={language} onChange={e=>saveLang(e.target.value)}>
              <option value="">Selecionar...</option>
              {LANGUAGES.map(l=><option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          {language&&<p className="text-xs flex items-center gap-1.5" style={{color:"#6366f1"}}>💻 Conquista <strong>Desenvolvedor</strong> desbloqueada!</p>}
          {area&&<p className="text-xs flex items-center gap-1.5" style={{color:"#06b6d4"}}>🎯 Conquista <strong>Especialista</strong> desbloqueada!</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-2xl animate-in-delay-1" style={{background:"var(--bg-elevated)",border:"1px solid var(--border)"}}>
        {(["conquistas","stats","conta"] as const).map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)} className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                  style={{background:activeTab===t?"var(--bg-card)":"transparent",color:activeTab===t?"var(--text-primary)":"var(--text-muted)",boxShadow:activeTab===t?"0 2px 8px rgba(0,0,0,0.12)":"none"}}>
            {t==="conquistas"?`🏆 Conquistas (${unlockedCount})`:t==="stats"?"📊 Stats":"👤 Conta"}
          </button>
        ))}
      </div>

      {/* CONQUISTAS TAB */}
      {activeTab==="conquistas"&&(
        <div className="animate-in space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {(["common","rare","epic","legendary"] as const).map(r=>{
              const count=achievements.filter(a=>a.rarity===r&&a.unlocked).length
              const total=achievements.filter(a=>a.rarity===r).length
              return (
                <div key={r} className="rounded-xl p-3 text-center" style={{background:"var(--bg-elevated)",border:`1px solid ${RARITY_COLOR[r]}22`}}>
                  <p className="text-base font-bold" style={{color:RARITY_COLOR[r]}}>{count}</p>
                  <p className="text-[9px] mt-0.5" style={{color:"var(--text-muted)"}}>{RARITY_LABEL[r]}</p>
                  <p className="text-[8px]" style={{color:"var(--text-muted)",opacity:0.6}}>/{total}</p>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{color:"var(--text-muted)"}}>{activeAchievements.length} no cartão · máx. 5</p>
            <button onClick={()=>setShowAchievPicker(true)} className="text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-70" style={{color:"var(--accent-3)"}}>
              <Star size={11}/> Editar seleção →
            </button>
          </div>
          {catGroups.map(([cat,items])=>(
            <div key={cat}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-0.5" style={{color:"var(--text-muted)"}}>{CATEGORY_LABELS[cat]??cat}</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map(a=>(
                  <div key={a.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all relative cursor-default"
                       style={{background:a.unlocked?a.color+"15":"var(--bg-elevated)",border:`1px solid ${a.unlocked?a.color+"40":"var(--border)"}`,color:a.unlocked?a.color:"var(--text-muted)",opacity:a.unlocked?1:0.45}}>
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{background:RARITY_COLOR[a.rarity],opacity:a.unlocked?1:0.3}}/>
                    <span style={{filter:a.unlocked?"none":"grayscale(1)"}}>{a.unlocked?a.emoji:"🔒"}</span>
                    <span className="font-semibold">{a.label}</span>
                    {activeAchievIds.includes(a.id)&&a.unlocked&&(
                      <div className="w-3 h-3 rounded-full flex items-center justify-center" style={{background:a.color}}><Check size={7} color="white"/></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STATS TAB */}
      {activeTab==="stats"&&(
        <div className="animate-in space-y-3">
          {/* Streak */}
          <div className="rounded-2xl p-4 flex items-center gap-4"
               style={{ background: stats.streak > 0 ? 'rgba(245,158,11,0.08)' : 'var(--bg-elevated)', border: `1px solid ${stats.streak > 0 ? 'rgba(245,158,11,0.3)' : 'var(--border)'}` }}>
            <span style={{ fontSize: 40, lineHeight: 1 }}>{stats.streak >= 7 ? '🔥' : stats.streak >= 3 ? '⚡' : '📅'}</span>
            <div>
              <p className="font-display font-bold text-2xl" style={{ color: stats.streak > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                {stats.streak} dia{stats.streak !== 1 ? 's' : ''}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {stats.streak === 0 ? 'Comece a sequência hoje!' : `Sequência de estudo 🔥`}
              </p>
            </div>
          </div>

          {/* Activity heatmap (last 30 days) */}
          <div className="card p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Atividade — 30 dias</p>
            <div className="flex flex-wrap gap-1">
              {Array.from({length:30},(_,i)=>{
                const d = new Date(); d.setDate(d.getDate()-29+i)
                const key = d.toISOString().slice(0,10)
                const active = stats.sessionDates.includes(key)
                const isToday = key === new Date().toISOString().slice(0,10)
                return (
                  <div key={key} className="w-5 h-5 rounded" title={key}
                       style={{ background: active ? 'var(--accent-1)' : 'var(--bg-elevated)', border: isToday ? '2px solid var(--accent-3)' : '1px solid var(--border)', opacity: active ? 1 : 0.4 }}/>
                )
              })}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label:'Notas criadas',     value: stats.notesCreated,           emoji:'📝', color:'#f59e0b' },
              { label:'Flashcards resp.',  value: stats.flashcardsAnswered,     emoji:'⚡', color:'#22c55e' },
              { label:'Taxa de acerto',    value: stats.flashcardsAnswered > 0 ? `${Math.round((stats.flashcardsCorrect/stats.flashcardsAnswered)*100)}%` : '—', emoji:'🎯', color:'#6366f1' },
              { label:'Pomodoros',         value: Math.floor(stats.pomodoroMinutes/25), emoji:'🍅', color:'#ef4444' },
              { label:'Tempo de estudo',   value: `${Math.floor(stats.pomodoroMinutes/60)}h ${stats.pomodoroMinutes%60}m`, emoji:'⏱️', color:'#06b6d4' },
              { label:'Flashcards corretos', value: stats.flashcardsCorrect,    emoji:'✅', color:'#22c55e' },
            ].map(({label,value,emoji,color})=>(
              <div key={label} className="rounded-2xl p-3 flex items-center gap-3"
                   style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
                <span style={{fontSize:22,lineHeight:1}}>{emoji}</span>
                <div>
                  <p className="font-display font-bold text-lg leading-none" style={{color}}>{value}</p>
                  <p className="text-[10px] mt-0.5" style={{color:'var(--text-muted)'}}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* High scores */}
          {Object.keys(stats.highScores).length > 0 && (
            <div className="card p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{color:'var(--text-muted)'}}>Recordes de flashcard</p>
              <div className="space-y-1.5">
                {(Object.entries(stats.highScores) as [string, number][]).sort(([,a],[,b])=>b-a).slice(0,5).map(([sub,hs])=>(
                  <div key={sub} className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:'var(--border)'}}>
                      <div className="h-full rounded-full" style={{width:`${hs}%`,background:hs>=80?'#22c55e':hs>=60?'#f59e0b':'#ef4444'}}/>
                    </div>
                    <span className="text-xs font-mono font-bold shrink-0" style={{color:'var(--text-muted)',minWidth:36,textAlign:'right'}}>{hs}%</span>
                    <span className="text-[10px] truncate shrink-0" style={{color:'var(--text-secondary)',maxWidth:80}}>{sub}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

            {/* CONTA TAB */}
      {activeTab==="conta"&&(
        <div className="animate-in space-y-4">
          <div className="card">
            <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2" style={{color:"var(--text-primary)"}}>
              <User size={14} style={{color:"var(--accent-3)"}}/> Foto de perfil
            </h3>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-[72px] h-[72px] rounded-full p-0.5" style={{background:"var(--gradient-btn)",boxShadow:"0 0 20px var(--accent-glow)"}}>
                  <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
                       style={{background:user.avatar_url?"transparent":"var(--gradient-btn)"}}>
                    {user.avatar_url?<img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover"/>
                      :<span className="text-xl font-bold text-white font-display">{initials}</span>}
                  </div>
                </div>
                {avatarLoading&&<div className="absolute inset-0 rounded-full flex items-center justify-center" style={{background:"rgba(0,0,0,0.5)"}}><RefreshCw size={14} className="animate-spin text-white"/></div>}
              </div>
              <div className="flex flex-col gap-2">
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange}/>
                <button onClick={()=>fileInputRef.current?.click()} disabled={avatarLoading} className="btn-primary text-xs py-1.5 px-3 gap-1.5"><Download size={12}/> Enviar foto</button>
                {user.avatar_url&&<button onClick={handleRemoveAvatar} disabled={avatarLoading} className="btn-ghost text-xs py-1.5 px-3 gap-1.5" style={{color:"#f87171"}}><Trash2 size={12}/> Remover</button>}
                <p className="text-[10px]" style={{color:"var(--text-muted)"}}>JPG, PNG · máx 2MB</p>
              </div>
            </div>
          </div>
          <div className="card space-y-4">
            <h3 className="font-display font-semibold text-sm" style={{color:"var(--text-primary)"}}>Informações</h3>
            {[
              {icon:Mail,label:"E-mail",value:user.email},
              {icon:Hash,label:"Nº USP",value:user.nusp??"Não informado"},
              {icon:GraduationCap,label:"Curso",value:"Sistemas de Informação · EACH · USP"},
              {icon:Calendar,label:"Membro desde",value:user.created_at?format(new Date(user.created_at),"d 'de' MMMM 'de' yyyy",{locale:ptBR}):"—"},
            ].map(({icon:Icon,label,value})=>(
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background:"var(--accent-soft)",border:"1px solid var(--border)"}}><Icon size={14} style={{color:"var(--accent-3)"}}/></div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider" style={{color:"var(--text-muted)"}}>{label}</p>
                  <p className="text-sm truncate" style={{color:"var(--text-primary)"}}>{value}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={()=>{logout();navigate("/login")}} className="btn-danger w-full justify-center"><LogOut size={15}/> Sair da conta</button>
        </div>
      )}
    </div>
  )
}
