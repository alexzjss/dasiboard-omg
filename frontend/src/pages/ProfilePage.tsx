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


const TITLES = [
  'Explorador Incansável','Arquiteto de Sonhos','Nômade Digital',
  'Construtor do Futuro','Caçador de Bugs','Artesão do Código',
  'Viajante entre Mundos','Filósofo dos Pixels','Guardião da Stack',
  'Detetive de Dados','Mago das Abstrações','Pesquisador Curioso',
  'Estrategista Criativo','Desbravador de APIs','Artista do Terminal',
  'Navegador de Incertezas','Alquimista Digital','Construtor Obstinado',
  'Sonhador Pragmático','Engenheiro de Possibilidades','Entusiasta Nato',
  'Pensador Lateral','Hacker de Soluções','Curador de Conhecimento',
  'Montador de Sistemas','Visionário Técnico','Explorador de Fronteiras',
]

export const AREAS = [
  'Frontend','Backend','Fullstack','Mobile','Data Science',
  'IA & ML','DevOps','Cybersecurity','Game Dev','Design',
  'Pesquisa','UX/UI','Cloud','Embedded','Blockchain','QA',
]
export const LANGUAGES = [
  'Python','JavaScript','TypeScript','Java','Kotlin','Swift',
  'Go','Rust','C','C++','C#','PHP','Ruby','Dart','Scala',
  'R','MATLAB','Haskell','SQL','Shell','Lua','Zig','Elixir',
  'Clojure','F#','OCaml','Assembly','VHDL','Prolog',
]

export interface Achievement {
  id: string; emoji: string; label: string; desc: string
  hint: string; color: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlocked: boolean
  category: 'profile' | 'academic' | 'kanban' | 'social' | 'secret' | 'system'
}

const RARITY_LABEL: Record<string, string> = {
  common: 'Comum', rare: 'Raro', epic: 'Épico', legendary: 'Lendário',
}
const RARITY_COLOR: Record<string, string> = {
  common: '#6b7280', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b',
}
const CATEGORY_LABELS: Record<string, string> = {
  profile: 'Perfil', academic: 'Acadêmico', kanban: 'Organização',
  social: 'Comunidade', secret: 'Secretas', system: 'Sistema',
}

export const buildAchievements = (opts: {
  hasBoards: boolean; hasMultipleBoards: boolean; hasLanguage: boolean
  hasArea: boolean; hasPassedSubject: boolean; hasFailedSubject: boolean
  hasAvatar: boolean; hasNusp: boolean; eventCount: number
  subjectCount: number; gradeCount: number; loginCount: number
  easterEggFound: boolean
}): Achievement[] => [
  { id: 'pioneer',    emoji: '🚀', label: 'Pioneiro',       rarity: 'legendary', category: 'system',
    desc: 'Membro fundador do DaSIboard',          hint: 'Crie sua conta',          color: '#f59e0b', unlocked: true },
  { id: 'coder',      emoji: '💻', label: 'Desenvolvedor',  rarity: 'common',    category: 'profile',
    desc: 'Selecionou uma linguagem principal',     hint: 'Escolha sua linguagem',    color: '#6366f1', unlocked: opts.hasLanguage },
  { id: 'specialist', emoji: '🎯', label: 'Especialista',   rarity: 'common',    category: 'profile',
    desc: 'Selecionou uma área de atuação',         hint: 'Escolha sua área',          color: '#06b6d4', unlocked: opts.hasArea },
  { id: 'face',       emoji: '📸', label: 'Fotogênico',     rarity: 'common',    category: 'profile',
    desc: 'Adicionou foto de perfil',               hint: 'Faça upload de uma foto',   color: '#ec4899', unlocked: opts.hasAvatar },
  { id: 'identified', emoji: '🪪', label: 'Identificado',   rarity: 'common',    category: 'profile',
    desc: 'Adicionou número USP',                   hint: 'Informe seu Nº USP',         color: '#8b5cf6', unlocked: opts.hasNusp },
  { id: 'eisenhower', emoji: '📋', label: 'Eisenhower',     rarity: 'common',    category: 'kanban',
    desc: 'Criou o primeiro quadro Kanban',         hint: 'Crie um quadro em Kanban',  color: '#22c55e', unlocked: opts.hasBoards },
  { id: 'organizer',  emoji: '🗂️', label: 'Organizador',   rarity: 'rare',      category: 'kanban',
    desc: 'Criou 3 ou mais quadros Kanban',         hint: 'Crie pelo menos 3 quadros', color: '#10b981', unlocked: opts.hasMultipleBoards },
  { id: 'planner',    emoji: '🗓️', label: 'Planejador',    rarity: 'common',    category: 'kanban',
    desc: 'Criou 5+ eventos no calendário',         hint: 'Adicione eventos',           color: '#f59e0b', unlocked: opts.eventCount >= 5 },
  { id: 'night_owl',  emoji: '🦉', label: 'Coruja',         rarity: 'rare',      category: 'academic',
    desc: 'Aprovado em pelo menos uma disciplina',  hint: 'Registre notas e passe',    color: '#a855f7', unlocked: opts.hasPassedSubject },
  { id: 'survivor',   emoji: '💀', label: 'Sobrevivente',   rarity: 'rare',      category: 'academic',
    desc: 'Reprovado e voltou mais forte',          hint: 'Registre uma reprovação',   color: '#ef4444', unlocked: opts.hasFailedSubject },
  { id: 'scholar',    emoji: '📚', label: 'Estudioso',      rarity: 'epic',      category: 'academic',
    desc: 'Cadastrou 6+ disciplinas',               hint: 'Adicione 6 matérias',       color: '#6366f1', unlocked: opts.subjectCount >= 6 },
  { id: 'annotator',  emoji: '✏️', label: 'Anotador',       rarity: 'common',    category: 'academic',
    desc: 'Registrou 10+ notas',                   hint: 'Adicione notas',             color: '#f97316', unlocked: opts.gradeCount >= 10 },
  { id: 'easter_egg', emoji: '🥚', label: 'Caçador',        rarity: 'legendary', category: 'secret',
    desc: 'Encontrou um easter egg!',               hint: '???',                        color: '#f59e0b', unlocked: opts.easterEggFound },
  { id: 'night_coder',emoji: '🌙', label: 'Coder Noturno',  rarity: 'epic',      category: 'secret',
    desc: 'Usou o app após meia-noite',             hint: '???',                        color: '#6366f1', unlocked: new Date().getHours() >= 0 && new Date().getHours() < 4 },
]

// ── Canvas utilities ─────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r)
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r)
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r)
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r)
  ctx.closePath()
}

function addGrain(ctx: CanvasRenderingContext2D, rng: () => number, W: number, H: number, alpha: number, count = 4000) {
  for (let i = 0; i < count; i++) {
    const x = rng()*W, y = rng()*H, v = Math.floor(rng()*255)
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha*rng()})`
    ctx.fillRect(x, y, 1, 1)
  }
}

function hexToRgb(hex: string): [number,number,number] {
  const clean = hex.replace('#','').padEnd(6,'0')
  const n = parseInt(clean.slice(0,6), 16)
  return [(n>>16)&255, (n>>8)&255, n&255]
}

function hslToRgb(h: number, s: number, l: number): [number,number,number] {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1-l)
  const f = (n: number) => { const k = (n + h/30) % 12; return l - a*Math.max(Math.min(k-3, 9-k, 1), -1) }
  return [Math.round(f(0)*255), Math.round(f(8)*255), Math.round(f(4)*255)]
}

function rgbToHsl(r: number, g: number, b: number): [number,number,number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r,g,b), min = Math.min(r,g,b), l = (max+min)/2
  if (max === min) return [0,0,l*100]
  const d = max - min, s = d / (l > 0.5 ? 2-max-min : max+min)
  const h = max === r ? (g-b)/d + (g<b?6:0) : max === g ? (b-r)/d+2 : (r-g)/d+4
  return [h*60, s*100, l*100]
}

// ── Color palette derivation from hue ──────────────────────────────────────────
// Returns 5 colors: primary, shift1, shift2, light accent, dark accent
function deriveColors(hue: number, sat: number, lit: number) {
  const h2 = (hue + 40 + Math.floor(sat * 0.2)) % 360
  const h3 = (hue + 85 + Math.floor(sat * 0.3)) % 360
  const h4 = (hue - 30 + 360) % 360
  return {
    c1:   `hsl(${hue},${sat}%,${lit}%)`,
    c2:   `hsl(${h2},${sat-8}%,${lit-18}%)`,
    c3:   `hsl(${h3},${sat-16}%,${Math.max(lit-30,12)}%)`,
    c4:   `hsl(${h4},${Math.min(sat+10,100)}%,${Math.min(lit+18,88)}%)`,
    c5:   `hsl(${hue},${sat-25}%,${Math.min(lit+32,92)}%)`,
    a1:   `hsla(${hue},${sat}%,${lit}%,0)`,
    a2:   `hsla(${h2},${sat-8}%,${lit-18}%,0)`,
    hue, sat, lit, h2, h3, h4,
  }
}

// ── Card style system — 16 distinct visual concepts ──────────────────────────
type CardStyle =
  | 'geometric_rays'      // Radiating fan bands from corner (Polish IDs)
  | 'layer_stack'         // Nested shrinking shapes, translucent layers
  | 'wave_lines'          // Parallel sine-wave color bands
  | 'checkerboard'        // Gradient-shifted chess grid
  | 'holographic'         // Full rainbow prismatic gradient
  | 'boarding_pass'       // Ticket with barcode strips & perfs
  | 'diagonal_bands'      // Bold angled color stripes
  | 'concentric_shapes'   // Polygon rings expanding outward
  | 'ink_splatter'        // Organic multi-blob shapes
  | 'grid_mosaic'         // Colored square mosaic/pixel grid
  | 'circuit'             // Tech circuit-board line pattern
  | 'halftone'            // Dot halftone gradient
  | 'topographic'         // Topographic contour lines
  | 'brush_strokes'       // Wide paint brush sweeps
  | 'crystal'             // Geometric low-poly crystal facets
  | 'neon_glow'           // Dark bg with glowing neon shapes

function pickCardStyle(userId: string): CardStyle {
  const rng = seededRng(userId + '-stylev2')
  const styles: CardStyle[] = [
    'geometric_rays','layer_stack','wave_lines','checkerboard',
    'holographic','boarding_pass','diagonal_bands','concentric_shapes',
    'ink_splatter','grid_mosaic','circuit','halftone',
    'topographic','brush_strokes','crystal','neon_glow',
  ]
  return styles[Math.floor(rng() * styles.length)]
}

// ── Effect overlays ───────────────────────────────────────────────────────────
type CardEffect =
  | 'foil_gold'    // diagonal golden shimmer
  | 'foil_holo'    // full-spectrum prismatic shimmer bands
  | 'scanlines'    // CRT horizontal scanlines
  | 'vignette'     // edge darkening
  | 'chromatic'    // red/blue edge fringe
  | 'grain_film'   // heavy analog film grain
  | 'crosshatch'   // diagonal crosshatch lines
  | 'noise_rgb'    // RGB channel noise
  | 'none'

function pickCardEffect(userId: string): CardEffect {
  const rng = seededRng(userId + '-effectv2')
  const effects: CardEffect[] = [
    'foil_gold','foil_holo','scanlines','vignette','chromatic',
    'grain_film','crosshatch','noise_rgb','none','foil_holo',
    'foil_gold','none','vignette','scanlines','none',
  ]
  return effects[Math.floor(rng() * effects.length)]
}

// ── Color scheme variation ─────────────────────────────────────────────────────
type ColorScheme = 'vivid' | 'pastel' | 'dark_rich' | 'neon' | 'earth' | 'cold'

function pickColorScheme(userId: string): ColorScheme {
  const rng = seededRng(userId + '-scheme')
  const schemes: ColorScheme[] = ['vivid','pastel','dark_rich','neon','earth','cold','vivid','vivid']
  return schemes[Math.floor(rng() * schemes.length)]
}

function applyColorScheme(hue: number, scheme: ColorScheme): { sat: number; lit: number } {
  switch(scheme) {
    case 'vivid':     return { sat: 75 + Math.random()*18, lit: 50 + Math.random()*12 }
    case 'pastel':    return { sat: 45 + Math.random()*20, lit: 68 + Math.random()*14 }
    case 'dark_rich': return { sat: 70 + Math.random()*20, lit: 32 + Math.random()*12 }
    case 'neon':      return { sat: 92 + Math.random()*8,  lit: 55 + Math.random()*10 }
    case 'earth':     return { sat: 35 + Math.random()*25, lit: 42 + Math.random()*18 }
    case 'cold':      return { sat: 55 + Math.random()*25, lit: 58 + Math.random()*16 }
  }
}

// ── Draw background style ──────────────────────────────────────────────────────
function drawCardBackground(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, zoneH: number,
  style: CardStyle,
  hue: number, sat: number, lit: number,
  rng: () => number,
  entityBg: { color: string; name: string } | null,
) {
  const pal = deriveColors(hue, sat, lit)
  const { c1, c2, c3, c4, c5 } = pal

  // ── Card base background ───────────────────────────────────────────────────
  // The pattern zone (top ~57%) always uses user's colors.
  // The info zone (bottom ~43%) is where entityBg actually lives — as solid tinted bg.
  const isDark = lit < 44

  if (entityBg) {
    // Entity: tint the ENTIRE card base (mainly visible in info section)
    const [er,eg,eb] = hexToRgb(entityBg.color)
    const [eh,es,el] = rgbToHsl(er,eg,eb)
    // Light neutral for info zone
    const infoBg = isDark
      ? `hsl(${eh},${es*0.4}%,${12}%)`
      : `hsl(${eh},${es*0.25}%,${96}%)`
    ctx.fillStyle = infoBg
    ctx.fillRect(0, 0, W, H)
    // Subtle entity color wash over entire card
    const entityWash = ctx.createLinearGradient(0, 0, W*0.6, H)
    entityWash.addColorStop(0, `rgba(${er},${eg},${eb},0.12)`)
    entityWash.addColorStop(1, `rgba(${er},${eg},${eb},0.05)`)
    ctx.fillStyle = entityWash
    ctx.fillRect(0, 0, W, H)
    // Strong entity color band at the bottom info strip
    const infoGrad = ctx.createLinearGradient(0, zoneH, 0, H)
    infoGrad.addColorStop(0, `rgba(${er},${eg},${eb},0.22)`)
    infoGrad.addColorStop(1, `rgba(${er},${eg},${eb},0.10)`)
    ctx.fillStyle = infoGrad
    ctx.fillRect(0, zoneH, W, H - zoneH)
    // Entity color accent stripe at very bottom
    ctx.fillStyle = `rgba(${er},${eg},${eb},0.7)`
    ctx.fillRect(0, H - 5, W, 5)
  } else {
    const bgBase = isDark
      ? `hsl(${hue},${Math.round(sat*0.18)}%,8%)`
      : `hsl(${hue},${Math.round(sat*0.12)}%,97%)`
    ctx.fillStyle = bgBase
    ctx.fillRect(0, 0, W, H)
  }

  // ── Pattern zone clip ─────────────────────────────────────────────────────
  ctx.save()
  ctx.beginPath(); ctx.rect(0, 0, W, zoneH); ctx.clip()

  switch (style) {

    // ─ 1. Geometric rays (Polish student ID) ────────────────────────────────
    case 'geometric_rays': {
      const side = rng() < 0.5 ? -1 : 1
      const cx   = side < 0 ? W * -0.06 : W * 1.06
      const cy   = H * (-0.08 + rng() * 0.22)
      const nr   = 16 + Math.floor(rng() * 10)
      const span = Math.PI * (0.50 + rng() * 0.30)
      const base = side < 0 ? -0.15 : Math.PI - span + 0.15
      const dist = Math.sqrt(W*W + H*H) * 1.7

      for (let i = 0; i < nr; i++) {
        const a1 = base + (i/nr)*span, a2 = base + ((i+1)/nr)*span
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(a1)*dist, cy + Math.sin(a1)*dist)
        ctx.lineTo(cx + Math.cos(a2)*dist, cy + Math.sin(a2)*dist)
        ctx.closePath()
        const rg = ctx.createLinearGradient(cx, cy, cx + Math.cos((a1+a2)/2)*dist*0.75, cy + Math.sin((a1+a2)/2)*dist*0.75)
        rg.addColorStop(0, i%2===0 ? c1 : c2)
        rg.addColorStop(0.6, i%2===0 ? c2 : c3)
        rg.addColorStop(1, i%3===0 ? c4 : c3)
        ctx.globalAlpha = i%2===0 ? 0.9 : 0.72
        ctx.fillStyle = rg; ctx.fill()
      }
      ctx.globalAlpha = 1
      break
    }

    // ─ 2. Layer stack (nested shapes) ───────────────────────────────────────
    case 'layer_stack': {
      const nl   = 8 + Math.floor(rng() * 5)
      const kind = rng() < 0.25 ? 'rect' : rng() < 0.5 ? 'hex' : rng() < 0.75 ? 'rounded' : 'diamond'
      for (let i = nl-1; i >= 0; i--) {
        const t  = i / nl
        const mg = (1-t) * W * 0.40
        const tm = (1-t) * zoneH * 0.35
        const hh = (hue + i*28) % 360
        const ll = isDark ? 20 + t*45 : 35 + t*42
        const lg = ctx.createLinearGradient(mg, tm, W-mg, zoneH-tm*0.3)
        lg.addColorStop(0, `hsl(${hh},${sat}%,${ll}%)`)
        lg.addColorStop(1, `hsl(${(hh+30)%360},${sat-12}%,${Math.max(ll-22,10)}%)`)
        ctx.globalAlpha = 0.38 + t*0.52
        ctx.fillStyle = lg
        if (kind === 'rect') {
          ctx.fillRect(mg, tm, W-mg*2, zoneH-tm)
        } else if (kind === 'rounded') {
          roundRect(ctx, mg, tm, W-mg*2, zoneH-tm, 22); ctx.fill()
        } else if (kind === 'hex') {
          const hcx = W/2, hcy = tm + (zoneH-tm)/2
          const rx = (W-mg*2)/2, ry = (zoneH-tm)/2
          ctx.beginPath()
          for (let j=0;j<6;j++) {
            const a = (j/6)*Math.PI*2 - Math.PI/6
            j===0 ? ctx.moveTo(hcx+Math.cos(a)*rx, hcy+Math.sin(a)*ry*0.8)
                  : ctx.lineTo(hcx+Math.cos(a)*rx, hcy+Math.sin(a)*ry*0.8)
          }
          ctx.closePath(); ctx.fill()
        } else { // diamond
          const dcx = W/2, dcy = tm + (zoneH-tm)/2
          const dx = (W-mg*2)/2, dy = (zoneH-tm)/2
          ctx.beginPath()
          ctx.moveTo(dcx, dcy-dy); ctx.lineTo(dcx+dx, dcy)
          ctx.lineTo(dcx, dcy+dy); ctx.lineTo(dcx-dx, dcy)
          ctx.closePath(); ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      break
    }

    // ─ 3. Wave lines ────────────────────────────────────────────────────────
    case 'wave_lines': {
      const nw  = 32 + Math.floor(rng() * 20)
      const amp = 18 + rng() * 58
      const frq = 0.007 + rng() * 0.018
      const ph  = rng() * Math.PI * 2
      const dbl = rng() < 0.4 // double wave interference
      const frq2 = frq * (1.7 + rng() * 0.8)
      for (let wi = 0; wi < nw; wi++) {
        const t  = wi / nw
        const y0 = t * zoneH
        const hh = (hue + t*70) % 360
        const ll = isDark ? 25 + t*38 : 42 + t*32
        ctx.beginPath()
        ctx.moveTo(-8, y0)
        for (let x = 0; x <= W+8; x += 2) {
          const w1 = Math.sin(x*frq + ph + wi*0.28) * amp
          const w2 = dbl ? Math.sin(x*frq2 + ph*1.4 + wi*0.1) * amp * 0.4 : 0
          ctx.lineTo(x, y0 + w1 + w2)
        }
        ctx.lineTo(W+8, zoneH+8); ctx.lineTo(-8, zoneH+8)
        ctx.closePath()
        ctx.fillStyle = `hsl(${hh},${sat}%,${ll}%)`
        ctx.globalAlpha = 0.88
        ctx.fill()
      }
      ctx.globalAlpha = 1
      break
    }

    // ─ 4. Checkerboard ──────────────────────────────────────────────────────
    case 'checkerboard': {
      const cols = 7 + Math.floor(rng() * 7)
      const cw   = W / cols
      const rows = Math.ceil(zoneH / cw)
      const alt  = rng() < 0.3 // alternating color shift per row

      // Fill background first
      ctx.fillStyle = isDark ? c3 : c5; ctx.fillRect(0, 0, W, zoneH)

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if ((row + col) % 2 !== 0) continue
          const t   = (row + col) / (rows + cols)
          const hh  = (hue + t*55 + (alt && row%2===0 ? 30 : 0)) % 360
          const ll  = isDark ? 28 + t*30 : 52 - t*20
          ctx.fillStyle = `hsl(${hh},${sat}%,${ll}%)`
          ctx.globalAlpha = 0.9
          ctx.fillRect(col*cw, row*cw, cw, cw)
        }
      }
      ctx.globalAlpha = 1
      break
    }

    // ─ 5. Holographic (full rainbow) ────────────────────────────────────────
    case 'holographic': {
      // Base: angled multi-stop rainbow
      const angle = rng() * Math.PI / 3
      const gx2   = Math.cos(angle)*W, gy2 = Math.sin(angle)*zoneH
      const grad  = ctx.createLinearGradient(0, 0, gx2, gy2)
      const stops = 10
      for (let i = 0; i <= stops; i++) {
        const t  = i / stops
        const hh = (hue + t*340) % 360
        const ls = isDark ? 52 : 62
        grad.addColorStop(t, `hsl(${hh},${85+rng()*12}%,${ls}%)`)
      }
      ctx.globalAlpha = 0.94
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, zoneH)

      // White shimmer band sweeping diagonally
      const sw  = 180 + rng()*120
      const sx  = rng() * (W - sw)
      const shim = ctx.createLinearGradient(sx, 0, sx + sw, zoneH)
      shim.addColorStop(0,   'rgba(255,255,255,0)')
      shim.addColorStop(0.3, 'rgba(255,255,255,0.15)')
      shim.addColorStop(0.5, 'rgba(255,255,255,0.42)')
      shim.addColorStop(0.7, 'rgba(255,255,255,0.15)')
      shim.addColorStop(1,   'rgba(255,255,255,0)')
      ctx.fillStyle = shim; ctx.fillRect(0, 0, W, zoneH)

      // Second shimmer at different angle — iridescence
      const shim2 = ctx.createLinearGradient(0, 0, W, zoneH * 0.4)
      shim2.addColorStop(0,   'rgba(200,100,255,0.00)')
      shim2.addColorStop(0.45,'rgba(200,100,255,0.12)')
      shim2.addColorStop(0.55,'rgba(100,220,255,0.12)')
      shim2.addColorStop(1,   'rgba(100,220,255,0.00)')
      ctx.fillStyle = shim2; ctx.fillRect(0, 0, W, zoneH)

      ctx.globalAlpha = 1
      break
    }

    // ─ 6. Boarding pass / ticket ────────────────────────────────────────────
    case 'boarding_pass': {
      // Gradient fill
      const grad = ctx.createLinearGradient(rng()*W*0.3, 0, W*(0.7+rng()*0.3), zoneH)
      grad.addColorStop(0,   c1)
      grad.addColorStop(0.38, c2)
      grad.addColorStop(0.72, c3)
      grad.addColorStop(1,   c4)
      ctx.fillStyle = grad; ctx.globalAlpha = 0.96
      ctx.fillRect(0, 0, W, zoneH); ctx.globalAlpha = 1

      // Perforation line
      const perf = zoneH * 0.82
      ctx.setLineDash([9, 7])
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(24, perf); ctx.lineTo(W-24, perf); ctx.stroke()
      ctx.setLineDash([])

      // Barcode strips in two groups
      const drawBars = (startX: number, endX: number, y: number, h: number) => {
        let bx = startX
        while (bx < endX) {
          const bw = 1 + Math.floor(rng() * 5)
          ctx.fillStyle = 'rgba(0,0,0,0.28)'
          ctx.fillRect(bx, y, bw, h * (0.5 + rng()*0.5))
          bx += bw + (rng() < 0.3 ? 2 : 1)
        }
      }
      drawBars(32, W*0.5 - 20, perf + 8, zoneH - perf - 8)
      drawBars(W*0.55, W-32, perf + 8, zoneH - perf - 8)
      break
    }

    // ─ 7. Diagonal bands ────────────────────────────────────────────────────
    case 'diagonal_bands': {
      const nb  = 9 + Math.floor(rng() * 7)
      const ang = (28 + rng()*38) * Math.PI / 180
      const bw  = W * 1.9 / nb
      for (let bi = 0; bi < nb; bi++) {
        const t  = bi / nb
        const hh = (hue + bi*20 + Math.floor(rng()*8)) % 360
        const ll = isDark
          ? 22 + bi*Math.floor(32/nb)
          : 35 + bi*Math.floor(38/nb)
        ctx.save()
        ctx.translate(bi*bw - W*0.45, -zoneH*0.25)
        ctx.rotate(ang)
        const bg2 = ctx.createLinearGradient(0,0,bw,0)
        bg2.addColorStop(0, `hsl(${hh},${sat}%,${ll}%)`)
        bg2.addColorStop(1, `hsl(${(hh+24)%360},${sat-10}%,${Math.max(ll-18,8)}%)`)
        ctx.fillStyle = bg2
        ctx.globalAlpha = bi%2===0 ? 0.90 : 0.70
        ctx.fillRect(0, 0, bw*0.85, zoneH*3)
        ctx.restore()
      }
      ctx.globalAlpha = 1
      break
    }

    // ─ 8. Concentric shapes ─────────────────────────────────────────────────
    case 'concentric_shapes': {
      const nr    = 10 + Math.floor(rng() * 6)
      const sides = 3 + Math.floor(rng() * 4) // 3→6 sides
      const cx    = W * (0.30 + rng()*0.40)
      const cy    = zoneH * (0.25 + rng()*0.35)
      const maxR  = Math.min(W, zoneH) * 0.82
      const rot   = rng() * Math.PI * 2

      // Base radial gradient fill
      const bg2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR*1.1)
      bg2.addColorStop(0, c1); bg2.addColorStop(0.6, c2); bg2.addColorStop(1, c3)
      ctx.fillStyle = bg2; ctx.fillRect(0, 0, W, zoneH)

      // Draw rings from outside in
      for (let ri = nr; ri >= 0; ri--) {
        const t  = ri / nr
        const r  = maxR * t
        const hh = (hue + ri*18) % 360
        const ll = isDark ? 18 + ri*(52/nr) : 28 + ri*(55/nr)
        ctx.beginPath()
        for (let pi = 0; pi < sides; pi++) {
          const a = rot + (pi/sides)*Math.PI*2
          pi===0 ? ctx.moveTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r)
                 : ctx.lineTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r)
        }
        ctx.closePath()
        ctx.strokeStyle = `hsl(${hh},${sat}%,${ll}%)`
        ctx.lineWidth   = 2.5 + (1-t)*4
        ctx.globalAlpha = 0.12 + (1-t)*0.55
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      break
    }

    // ─ 9. Ink splatter (evolved organic blobs) ──────────────────────────────
    case 'ink_splatter': {
      const ns = 2 + Math.floor(rng()*4)
      for (let si = 0; si < ns; si++) {
        const scx = W * (0.05 + rng()*0.90)
        const scy = zoneH * (-0.08 + rng()*0.85)
        const sr  = Math.min(W, zoneH) * (0.40 + rng()*0.60)
        const n   = 9 + Math.floor(rng()*7)
        const pts: [number,number][] = []
        for (let i=0;i<n;i++) {
          const a  = (i/n)*Math.PI*2 - Math.PI/2
          const rr = sr * (0.30 + rng()*1.05)
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
        const hh = (hue + si*35) % 360
        const sg = ctx.createRadialGradient(scx-sr*0.2, scy-sr*0.2, sr*0.03, scx+sr*0.1, scy+sr*0.1, sr*1.05)
        sg.addColorStop(0, `hsl(${hh},${sat}%,${lit}%)`)
        sg.addColorStop(0.55, `hsl(${(hh+35)%360},${sat-10}%,${lit-18}%)`)
        sg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = sg
        ctx.globalAlpha = si===0 ? 0.94 : 0.62
        ctx.fill()
      }
      ctx.globalAlpha = 1
      break
    }

    // ─ 10. Grid mosaic (pixel grid) ──────────────────────────────────────────
    case 'grid_mosaic': {
      const cellS = 36 + Math.floor(rng()*52)
      const cols2 = Math.ceil(W/cellS) + 1
      const rows2 = Math.ceil(zoneH/cellS) + 1
      const rng2  = seededRng('mosaic')
      for (let row=0; row<rows2; row++) {
        for (let col=0; col<cols2; col++) {
          const t  = Math.sqrt((col/cols2)**2 + (row/rows2)**2)
          const hh = (hue + t*90 + rng2()*25) % 360
          const ll = isDark ? 22+rng2()*35 : 45+rng2()*38
          const alpha = 0.55 + rng2()*0.40
          ctx.fillStyle = `hsl(${hh},${sat}%,${ll}%)`
          ctx.globalAlpha = alpha
          ctx.fillRect(col*cellS - 2, row*cellS - 2, cellS-1, cellS-1)
        }
      }
      ctx.globalAlpha = 1
      break
    }

    // ─ 11. Circuit board ────────────────────────────────────────────────────
    case 'circuit': {
      // Background
      const bgc = isDark ? `hsl(${hue},${sat*0.3}%,10%)` : `hsl(${hue},${sat*0.15}%,94%)`
      ctx.fillStyle = bgc; ctx.fillRect(0,0,W,zoneH)

      // Grid of circuit traces
      const grid = 28 + Math.floor(rng()*24)
      const rng3 = seededRng('circuit-'+hue)
      ctx.strokeStyle = c1; ctx.lineWidth = 1.8; ctx.globalAlpha = 0.55

      for (let gx=0; gx<W; gx+=grid) {
        for (let gy=0; gy<zoneH; gy+=grid) {
          if (rng3() < 0.4) {
            ctx.beginPath(); ctx.moveTo(gx,gy); ctx.lineTo(gx+grid,gy); ctx.stroke()
          }
          if (rng3() < 0.4) {
            ctx.beginPath(); ctx.moveTo(gx,gy); ctx.lineTo(gx,gy+grid); ctx.stroke()
          }
          // Nodes
          if (rng3() < 0.25) {
            ctx.globalAlpha = 0.9
            ctx.beginPath(); ctx.arc(gx,gy,3.5,0,Math.PI*2)
            ctx.fillStyle = c4; ctx.fill()
            ctx.globalAlpha = 0.55
          }
          // L-bends
          if (rng3() < 0.2) {
            ctx.beginPath()
            ctx.moveTo(gx,gy); ctx.lineTo(gx+grid*0.5,gy); ctx.lineTo(gx+grid*0.5,gy+grid)
            ctx.stroke()
          }
        }
      }
      ctx.globalAlpha = 1
      break
    }

    // ─ 12. Halftone dots ────────────────────────────────────────────────────
    case 'halftone': {
      // Background gradient
      const bg2 = ctx.createLinearGradient(0,0,W,zoneH)
      bg2.addColorStop(0, c1); bg2.addColorStop(1, c3)
      ctx.fillStyle = bg2; ctx.fillRect(0,0,W,zoneH)

      // Dot grid
      const spacing = 18 + Math.floor(rng()*18)
      const maxDot  = spacing * 0.52
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.22)'

      for (let dy=spacing/2; dy<zoneH; dy+=spacing) {
        for (let dx=spacing/2; dx<W; dx+=spacing) {
          // Dot size based on distance from center
          const distX = (dx/W - 0.5), distY = (dy/zoneH - 0.5)
          const dist  = Math.sqrt(distX*distX + distY*distY)
          const r     = maxDot * (0.15 + dist * 1.4)
          if (r < 0.5) continue
          ctx.beginPath(); ctx.arc(dx, dy, Math.min(r, maxDot), 0, Math.PI*2)
          ctx.fill()
        }
      }
      break
    }

    // ─ 13. Topographic contour lines ────────────────────────────────────────
    case 'topographic': {
      // Background fill
      const bg2 = isDark
        ? ctx.createLinearGradient(0,0,W,zoneH)
        : ctx.createLinearGradient(0,0,W,zoneH)
      if (isDark) {
        bg2.addColorStop(0,c3); bg2.addColorStop(1,`hsl(${hue},${sat*0.4}%,8%)`)
      } else {
        bg2.addColorStop(0,c5); bg2.addColorStop(1,c4)
      }
      ctx.fillStyle = bg2; ctx.fillRect(0,0,W,zoneH)

      // Undulating contour lines
      const nl2  = 12 + Math.floor(rng()*10)
      const freq = 0.004 + rng()*0.010
      const freq2 = freq * (1.3 + rng()*0.5)
      for (let li=0; li<nl2; li++) {
        const t    = li/nl2
        const baseY = t * zoneH
        const hh   = (hue + li*15) % 360
        ctx.beginPath()
        ctx.moveTo(0, baseY)
        for (let x=0; x<=W; x+=4) {
          const y = baseY
            + Math.sin(x*freq + li*1.1) * (35 + rng()*25)
            + Math.sin(x*freq2 + li*0.7) * (15 + rng()*12)
          ctx.lineTo(x, y)
        }
        ctx.strokeStyle = `hsl(${hh},${sat}%,${isDark ? 45+t*30 : 30+t*35}%)`
        ctx.lineWidth   = 1.5 + (1-t) * 1.5
        ctx.globalAlpha = 0.55 + (1-t) * 0.35
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      break
    }

    // ─ 14. Brush strokes ────────────────────────────────────────────────────
    case 'brush_strokes': {
      const nb2 = 5 + Math.floor(rng()*5)
      for (let bi=0; bi<nb2; bi++) {
        const t    = bi / nb2
        const y0   = rng()*zoneH*0.6
        const hh   = (hue + bi*30) % 360
        const bh   = 60 + rng()*120 // brush height
        const tilt = (rng()-0.5)*0.4 // slight angle
        const ll   = isDark ? 28+t*35 : 38+t*40

        ctx.save()
        ctx.translate(0, y0)
        ctx.rotate(tilt)

        // Brush body — wide, tapering at edges with multiple overlapping fills
        for (let pass=0; pass<4; pass++) {
          const wobble = (rng()-0.5)*20
          const bGrad = ctx.createLinearGradient(0,wobble,W,wobble+bh)
          bGrad.addColorStop(0,   `hsla(${hh},${sat}%,${ll}%,0)`)
          bGrad.addColorStop(0.15, `hsla(${hh},${sat}%,${ll}%,${0.55+rng()*0.35})`)
          bGrad.addColorStop(0.5,  `hsla(${(hh+15)%360},${sat-5}%,${ll-8}%,${0.7+rng()*0.25})`)
          bGrad.addColorStop(0.85, `hsla(${hh},${sat}%,${ll}%,${0.55+rng()*0.35})`)
          bGrad.addColorStop(1,   `hsla(${hh},${sat}%,${ll}%,0)`)
          ctx.fillStyle = bGrad
          ctx.fillRect(-10, wobble, W+20, bh)
        }
        ctx.restore()
      }
      // Final gradient overlay to blend
      const ov = ctx.createLinearGradient(0,0,W,zoneH)
      ov.addColorStop(0, c1+'80'); ov.addColorStop(1, c3+'40')
      ctx.globalAlpha = 0.25; ctx.fillStyle = ov; ctx.fillRect(0,0,W,zoneH)
      ctx.globalAlpha = 1
      break
    }

    // ─ 15. Crystal facets (low-poly) ────────────────────────────────────────
    case 'crystal': {
      const pts2: [number,number][] = []
      // Generate random vertices
      const npts = 12 + Math.floor(rng()*10)
      pts2.push([0,0],[W,0],[0,zoneH],[W,zoneH])
      for (let i=0;i<npts;i++) pts2.push([rng()*W, rng()*zoneH])

      // Triangulate naively — connect each point to nearest two
      for (let i=0; i<pts2.length-2; i++) {
        for (let j=i+1; j<pts2.length-1; j++) {
          for (let k=j+1; k<pts2.length; k++) {
            const [ax,ay]=pts2[i],[bx,by]=pts2[j],[cx2,cy2]=pts2[k]
            const cx3 = (ax+bx+cx2)/3, cy3 = (ay+by+cy2)/3
            if (cx3<0||cx3>W||cy3<0||cy3>zoneH) continue
            const t   = Math.sqrt((cx3/W)**2+(cy3/zoneH)**2)
            const hh  = (hue + t*110 + i*8) % 360
            const ll  = isDark ? 18+t*48 : 30+t*52
            ctx.beginPath()
            ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.lineTo(cx2,cy2)
            ctx.closePath()
            ctx.fillStyle = `hsl(${hh},${sat}%,${ll}%)`
            ctx.globalAlpha = 0.75 + (1-t)*0.2
            ctx.fill()
            ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
            ctx.lineWidth = 0.8; ctx.globalAlpha = 0.8; ctx.stroke()
          }
        }
      }
      ctx.globalAlpha = 1
      break
    }

    // ─ 16. Neon glow ────────────────────────────────────────────────────────
    case 'neon_glow': {
      // Very dark background
      ctx.fillStyle = `hsl(${hue},${sat*0.15}%,6%)`
      ctx.fillRect(0,0,W,zoneH)

      // Multiple glowing orbs
      const norbs = 3 + Math.floor(rng()*3)
      for (let oi=0; oi<norbs; oi++) {
        const ox = rng()*W, oy = rng()*zoneH
        const or = 80 + rng()*160
        const hh = (hue + oi*70) % 360
        const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, or)
        og.addColorStop(0,   `hsl(${hh},100%,80%)`)
        og.addColorStop(0.2, `hsl(${hh},90%,55%)`)
        og.addColorStop(0.6, `hsla(${hh},85%,40%,0.3)`)
        og.addColorStop(1,   `hsla(${hh},80%,30%,0)`)
        ctx.fillStyle = og
        ctx.globalAlpha = 0.65 + rng()*0.30
        ctx.fillRect(0,0,W,zoneH)
      }

      // Thin neon lines across
      const nlines = 3 + Math.floor(rng()*4)
      for (let li=0; li<nlines; li++) {
        const ly   = rng()*zoneH
        const hh   = (hue + li*45) % 360
        const lgrad = ctx.createLinearGradient(0,ly,W,ly)
        lgrad.addColorStop(0,'rgba(0,0,0,0)')
        lgrad.addColorStop(0.3,`hsl(${hh},100%,75%)`)
        lgrad.addColorStop(0.7,`hsl(${hh},100%,75%)`)
        lgrad.addColorStop(1,'rgba(0,0,0,0)')
        ctx.strokeStyle = lgrad; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7
        ctx.beginPath(); ctx.moveTo(0,ly); ctx.lineTo(W,ly); ctx.stroke()
        // Glow halo
        ctx.lineWidth = 6; ctx.globalAlpha = 0.15
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      break
    }

    default:
      ctx.fillStyle = c1; ctx.fillRect(0,0,W,zoneH)
  }

  ctx.restore() // restore pattern zone clip
}

// ── Effect overlays ───────────────────────────────────────────────────────────
function drawCardEffect(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, zoneH: number,
  effect: CardEffect,
  hue: number,
  rng: () => number,
) {
  ctx.save()
  ctx.beginPath(); ctx.rect(0,0,W,zoneH); ctx.clip()

  switch(effect) {
    case 'foil_gold': {
      // Diagonal golden foil shimmer
      const g = ctx.createLinearGradient(0, 0, W, zoneH)
      g.addColorStop(0.00, 'rgba(255,255,255,0.00)')
      g.addColorStop(0.28, 'rgba(255,255,255,0.04)')
      g.addColorStop(0.40, 'rgba(255,235,140,0.30)')
      g.addColorStop(0.48, 'rgba(255,255,255,0.44)')
      g.addColorStop(0.56, 'rgba(220,200,255,0.24)')
      g.addColorStop(0.68, 'rgba(255,255,255,0.06)')
      g.addColorStop(1.00, 'rgba(255,255,255,0.00)')
      ctx.fillStyle = g; ctx.fillRect(0,0,W,zoneH)
      break
    }

    case 'foil_holo': {
      // Full-spectrum prismatic shimmer — multiple bands
      const nbands = 5 + Math.floor(rng()*4)
      for (let bi=0; bi<nbands; bi++) {
        const t   = bi / nbands
        const bx  = t * W + rng()*40-20
        const bw  = 40 + rng()*80
        const hh  = (bi * 55 + hue*0.5) % 360
        const sg  = ctx.createLinearGradient(bx, 0, bx+bw, zoneH)
        sg.addColorStop(0, `hsla(${hh},80%,75%,0)`)
        sg.addColorStop(0.35, `hsla(${hh},80%,75%,0.20)`)
        sg.addColorStop(0.5,  `hsla(${(hh+40)%360},85%,80%,0.32)`)
        sg.addColorStop(0.65, `hsla(${(hh+80)%360},80%,75%,0.20)`)
        sg.addColorStop(1, `hsla(${hh},80%,75%,0)`)
        ctx.fillStyle = sg; ctx.fillRect(bx, 0, bw, zoneH)
      }
      break
    }

    case 'scanlines': {
      for (let y=0; y<zoneH; y+=3) {
        ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(0,y,W,1)
      }
      break
    }

    case 'vignette': {
      const vg = ctx.createRadialGradient(W/2,zoneH/2,zoneH*0.15, W/2,zoneH/2,zoneH*0.88)
      vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.48)')
      ctx.fillStyle = vg; ctx.fillRect(0,0,W,zoneH)
      break
    }

    case 'chromatic': {
      const cgl = ctx.createLinearGradient(0,0,W*0.18,0)
      cgl.addColorStop(0,'rgba(255,0,0,0.10)'); cgl.addColorStop(1,'rgba(255,0,0,0)')
      ctx.fillStyle = cgl; ctx.fillRect(0,0,W,zoneH)
      const cgr = ctx.createLinearGradient(W,0,W*0.82,0)
      cgr.addColorStop(0,'rgba(0,60,255,0.10)'); cgr.addColorStop(1,'rgba(0,60,255,0)')
      ctx.fillStyle = cgr; ctx.fillRect(0,0,W,zoneH)
      // Top/bottom fringe too
      const cgt = ctx.createLinearGradient(0,0,0,zoneH*0.12)
      cgt.addColorStop(0,'rgba(0,255,120,0.06)'); cgt.addColorStop(1,'rgba(0,255,120,0)')
      ctx.fillStyle = cgt; ctx.fillRect(0,0,W,zoneH)
      break
    }

    case 'grain_film': {
      // Heavy analog film grain
      addGrain(ctx, rng, W, zoneH, 0.10, 14000)
      break
    }

    case 'crosshatch': {
      // Diagonal crosshatch lines
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.8
      for (let x=-zoneH; x<W+zoneH; x+=8) {
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x+zoneH,zoneH); ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 0.8
      for (let x=-zoneH; x<W+zoneH; x+=8) {
        ctx.beginPath(); ctx.moveTo(x,zoneH); ctx.lineTo(x+zoneH,0); ctx.stroke()
      }
      break
    }

    case 'noise_rgb': {
      // RGB channel noise — each channel shifted slightly
      const rng2 = seededRng('rgb-noise')
      for (let i=0; i<8000; i++) {
        const x  = rng2()*W, y = rng2()*zoneH
        const ch = Math.floor(rng2()*3)
        const a  = 0.04 + rng2()*0.08
        ctx.fillStyle = ch===0 ? `rgba(255,0,0,${a})` : ch===1 ? `rgba(0,255,0,${a})` : `rgba(0,0,255,${a})`
        ctx.fillRect(x + (ch-1)*1.5, y, 2, 2)
      }
      break
    }

    case 'none': default: break
  }

  ctx.restore()
}

// ── Card info section ─────────────────────────────────────────────────────────
function drawCardInfo(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, zoneH: number,
  user: { full_name: string; email: string; nusp?: string; id: string; avatar_url?: string },
  activeAchievements: Achievement[],
  area: string, language: string,
  hue: number, sat: number, lit: number,
  entityBg: { color: string; name: string } | null,
  style: CardStyle,
  scheme: ColorScheme,
) {
  // Determine if the pattern zone is dark (needs light text) or light
  const patternDark = lit < 44 || style === 'neon_glow' || style === 'checkerboard'
  const infoDark    = entityBg
    ? (lit < 44) // follow user's overall darkness
    : lit < 44

  const inkColor  = infoDark  ? `hsl(${hue},40%,90%)`  : `hsl(${hue},55%,12%)`
  const inkFaint  = infoDark  ? `hsl(${hue},25%,72%)`  : `hsl(${hue},30%,45%)`
  const accentClr = entityBg
    ? entityBg.color
    : `hsl(${hue},${sat}%,${Math.max(lit-18,18)}%)`

  const textX = 44
  const nameY = H * 0.608

  // Name
  const parts     = user.full_name.trim().split(/\s+/)
  const firstName = parts[0] ?? ''
  const lastName  = parts.slice(1).join(' ')

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  ctx.font      = '800 52px sans-serif'
  ctx.fillStyle = inkColor
  ctx.fillText(firstName, textX, nameY)
  const fnW = ctx.measureText(firstName).width

  if (lastName) {
    ctx.font      = '300 52px sans-serif'
    ctx.fillStyle = inkFaint
    const spW = ctx.measureText(' ').width
    if (fnW + spW + ctx.measureText(lastName).width < W - textX*2)
      ctx.fillText(lastName, textX + fnW + spW, nameY)
    else
      ctx.fillText(lastName, textX, nameY + 58)
  }

  // Title
  const trng    = seededRng(user.id + '-title')
  const titleTx = TITLES[Math.floor(trng() * TITLES.length)]
  const titleY  = nameY + 42
  ctx.font      = '400 17px sans-serif'
  ctx.fillStyle = inkFaint
  ctx.fillText(titleTx, textX, titleY)

  // Email + NUSP
  const infoY   = titleY + 30
  const nuspStr = user.nusp ? `#${user.nusp}` : ''
  ctx.font      = '400 12px monospace'
  ctx.fillStyle = inkFaint
  ctx.globalAlpha = 0.58
  ctx.fillText([nuspStr, user.email].filter(Boolean).join('  ·  '), textX, infoY)
  ctx.globalAlpha = 1

  // Style code watermark — top-right corner inside pattern zone
  const styleCode: Record<CardStyle,string> = {
    geometric_rays:'GEO', layer_stack:'LAY', wave_lines:'WAV',
    checkerboard:'CHK', holographic:'HOL', boarding_pass:'TKT',
    diagonal_bands:'DIA', concentric_shapes:'CON', ink_splatter:'INK',
    grid_mosaic:'MOS', circuit:'CKT', halftone:'DOT',
    topographic:'TOP', brush_strokes:'BSH', crystal:'CRY', neon_glow:'NEO',
  }
  ctx.save()
  // Place inside pattern zone — top-right
  ctx.font      = '500 9px monospace'
  ctx.fillStyle = patternDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.22)'
  ctx.globalAlpha = 1
  ctx.textAlign = 'right'
  ctx.fillText(styleCode[style] ?? '···', W - textX, 32)
  ctx.textAlign = 'left'
  ctx.restore()

  // Area | Language pill
  const bottomY = H - 64
  const aLabel  = area || '', lLabel = language || ''
  if (aLabel || lLabel) {
    const pillH = 38
    ctx.font    = '600 13px sans-serif'
    const aW   = aLabel ? ctx.measureText(aLabel).width + 22 : 0
    const lW   = lLabel ? ctx.measureText(lLabel).width + 22 : 0
    const sepW = aLabel && lLabel ? 12 : 0

    ctx.strokeStyle = accentClr; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5
    roundRect(ctx, textX, bottomY, aW+sepW+lW, pillH, pillH/2); ctx.stroke()
    ctx.globalAlpha = 1

    if (aLabel && lLabel) {
      ctx.save()
      ctx.beginPath(); roundRect(ctx, textX+aW, bottomY+4, sepW, pillH-8, 2); ctx.clip()
      ctx.fillStyle   = accentClr; ctx.globalAlpha = 0.10
      ctx.fillRect(textX+aW, bottomY+4, sepW, pillH-8)
      ctx.globalAlpha = 0.30; ctx.strokeStyle = accentClr; ctx.lineWidth = 1
      for (let sx=-pillH; sx<sepW+pillH; sx+=4) {
        ctx.beginPath()
        ctx.moveTo(textX+aW+sx, bottomY+4); ctx.lineTo(textX+aW+sx+pillH, bottomY+4+pillH)
        ctx.stroke()
      }
      ctx.globalAlpha = 1; ctx.restore()
    }

    ctx.fillStyle = accentClr; ctx.textAlign = 'center'
    if (aLabel) ctx.fillText(aLabel, textX+aW/2, bottomY+pillH/2+5)
    if (lLabel) ctx.fillText(lLabel, textX+aW+sepW+lW/2, bottomY+pillH/2+5)
    ctx.textAlign = 'left'
  }

  // Achievements
  const displayA = activeAchievements.filter(a => a.unlocked).slice(0, 5)
  if (displayA.length > 0) {
    ctx.textAlign = 'right'; ctx.font = '26px serif'
    let bx = W - textX
    for (const ach of [...displayA].reverse()) {
      ctx.globalAlpha = 1; ctx.fillText(ach.emoji, bx, bottomY+30); bx -= 30
    }
    ctx.textAlign = 'left'; ctx.globalAlpha = 1
  }

  // ID watermark
  ctx.font = '400 9px monospace'; ctx.fillStyle = inkColor; ctx.globalAlpha = 0.16
  ctx.fillText(user.id.replace(/-/g,'').slice(0,8).toUpperCase(), textX, H-22)
  ctx.globalAlpha = 1
}

// ── Main draw function ────────────────────────────────────────────────────────
function drawPortraitCard(
  canvas: HTMLCanvasElement,
  user: { full_name: string; email: string; nusp?: string; id: string; avatar_url?: string },
  activeAchievements: Achievement[],
  area: string, language: string,
  entityBg: { color: string; name: string } | null,
) {
  const W = 680, H = 920
  canvas.width = W*2; canvas.height = H*2
  canvas.style.width = W+'px'; canvas.style.height = H+'px'
  const ctx = canvas.getContext('2d')!
  ctx.scale(2,2)

  // User's unique color identity (never changes with entityBg)
  const rngColor = seededRng(user.id+'-hue')
  const hue      = Math.floor(rngColor() * 360)
  const scheme   = pickColorScheme(user.id)
  const { sat, lit } = applyColorScheme(hue, scheme)

  const style  = pickCardStyle(user.id)
  const effect = pickCardEffect(user.id)
  const rngBg  = seededRng(user.id+'-bgv3')
  const zoneH  = H * 0.57

  ctx.clearRect(0, 0, W, H)

  // ── Rounded card clip (applied to everything) ────────────────────────────
  ctx.save()
  roundRect(ctx, 0, 0, W, H, 32); ctx.clip()

  // ── Background: user pattern + entity bg in info zone ───────────────────
  drawCardBackground(ctx, W, H, zoneH, style, hue, sat, lit, rngBg, entityBg)

  // ── Subtle grain over pattern zone ───────────────────────────────────────
  addGrain(ctx, seededRng(user.id+'-grainv3'), W, zoneH, 0.038, 5500)

  // ── Effect overlay on pattern zone ───────────────────────────────────────
  drawCardEffect(ctx, W, H, zoneH, effect, hue, seededRng(user.id+'-efxv3'))

  // ── Card-wide subtle grain (ties zones together) ─────────────────────────
  addGrain(ctx, seededRng(user.id+'-bggrainv3'), W, H, 0.009, 1600)

  // ── Text info ────────────────────────────────────────────────────────────
  drawCardInfo(ctx, W, H, zoneH, user, activeAchievements, area, language, hue, sat, lit, entityBg, style, scheme)

  // ── Border ───────────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 1.5; ctx.globalAlpha = 1
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
