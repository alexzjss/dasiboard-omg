import { useAuthStore } from '@/store/authStore'
import { useRef, useEffect, useCallback, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  User, Mail, Hash, Calendar, GraduationCap, LogOut,
  Download, RefreshCw, Award, Star, Zap, Shield, Trophy,
  Heart, Code2, BookOpen, Coffee, Flame, Crown, Sparkles,
  Globe, Music, Camera, X, Check,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// ── Badge definitions ─────────────────────────────────────────────────────────
interface Badge {
  id: string
  emoji: string
  label: string
  desc: string
  color: string
  unlocked: boolean
}

const ALL_BADGES: Badge[] = [
  { id: 'pioneer',    emoji: '🚀', label: 'Pioneiro',     desc: 'Um dos primeiros membros',         color: '#f59e0b', unlocked: true  },
  { id: 'coder',      emoji: '💻', label: 'Dev',          desc: 'Fanático por código',               color: '#6366f1', unlocked: true  },
  { id: 'kanban_pro', emoji: '📋', label: 'Kanban Pro',   desc: 'Mestre do quadro Kanban',           color: '#22c55e', unlocked: true  },
  { id: 'night_owl',  emoji: '🦉', label: 'Coruja',       desc: 'Estuda de madrugada',               color: '#a855f7', unlocked: true  },
  { id: 'dasi',       emoji: '🎓', label: 'DASI',         desc: 'Membro do Diretório',               color: '#ec4899', unlocked: false },
  { id: 'hype',       emoji: '🤖', label: 'HypE',         desc: 'Membro do HypE',                    color: '#f97316', unlocked: false },
  { id: 'conway',     emoji: '🎮', label: 'Conway',       desc: 'Game developer',                    color: '#10b981', unlocked: false },
  { id: 'sintese',    emoji: '💼', label: 'Síntese Jr.',  desc: 'Membro da empresa júnior',          color: '#ef4444', unlocked: false },
  { id: 'spidey',     emoji: '🕷️', label: 'Aranha',       desc: 'Completou o modo Aranha',           color: '#e60000', unlocked: false },
  { id: 'retro',      emoji: '📺', label: 'Retro',        desc: 'Usou todos os temas',               color: '#0ea5e9', unlocked: false },
  { id: 'shell',      emoji: '💀', label: 'Hacker',       desc: 'Membro da EACH in the Shell',       color: '#00ff41', unlocked: false },
  { id: 'pet',        emoji: '📚', label: 'PET-SI',       desc: 'Membro do PET-SI',                  color: '#4d67f5', unlocked: false },
]

// ── PRNG ─────────────────────────────────────────────────────────────────────
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

// ── Card style variants (seeded, so always same per user) ─────────────────────
interface CardStyle {
  bgA: string; bgB: string; bgC: string
  accentA: string; accentB: string
  layout: 'split-left' | 'split-right' | 'top-banner' | 'diagonal' | 'gradient-full'
  textDark: boolean
  pattern: 'none' | 'dots' | 'grid' | 'diagonal-lines' | 'circles' | 'noise' | 'hexagon'
  font: string
}

const CARD_PALETTES: Omit<CardStyle, 'layout' | 'pattern' | 'font'>[] = [
  // Warm cream (original)
  { bgA: '#faf8f5', bgB: '#f5f0ea', bgC: '#ede5d8', accentA: '#d4580a', accentB: '#8b3a0a', textDark: true },
  // Deep night purple
  { bgA: '#0f0a1e', bgB: '#1a1035', bgC: '#130c28', accentA: '#a855f7', accentB: '#c084fc', textDark: false },
  // Spider-Man red & blue
  { bgA: '#ffffff', bgB: '#fff0f0', bgC: '#f0f0ff', accentA: '#e60000', accentB: '#1a5ccc', textDark: true },
  // Retrowave sunset
  { bgA: '#1a0030', bgB: '#2d0050', bgC: '#0a0015', accentA: '#ff6600', accentB: '#ff0080', textDark: false },
  // Emerald dark
  { bgA: '#061610', bgB: '#0a2218', bgC: '#051210', accentA: '#22c55e', accentB: '#4ade80', textDark: false },
  // Newspaper comic
  { bgA: '#f8f3e3', bgB: '#ede5c8', bgC: '#e5dab8', accentA: '#1a1a1a', accentB: '#e60000', textDark: true },
  // Ocean blue
  { bgA: '#0a1628', bgB: '#0f2040', bgC: '#080e1e', accentA: '#0ea5e9', accentB: '#38bdf8', textDark: false },
  // Rose gold
  { bgA: '#2a1020', bgB: '#3a1828', bgC: '#1e0a16', accentA: '#f472b6', accentB: '#e879f9', textDark: false },
  // Matrix green
  { bgA: '#000000', bgB: '#020f04', bgC: '#000000', accentA: '#00ff41', accentB: '#00cc33', textDark: false },
  // Nordic snow
  { bgA: '#f0f4f8', bgB: '#e2eaf4', bgC: '#d8e4f0', accentA: '#2563eb', accentB: '#1d4ed8', textDark: true },
  // Amber fire
  { bgA: '#18080a', bgB: '#280c10', bgC: '#100508', accentA: '#f97316', accentB: '#fbbf24', textDark: false },
  // Mint fresh
  { bgA: '#f0fdf4', bgB: '#dcfce7', bgC: '#e8f8ed', accentA: '#16a34a', accentB: '#15803d', textDark: true },
]

const CARD_PATTERNS: CardStyle['pattern'][] = ['none','dots','grid','diagonal-lines','circles','noise','hexagon']
const CARD_LAYOUTS:  CardStyle['layout'][]  = ['split-left','split-right','top-banner','diagonal','gradient-full']
const CARD_FONTS = [
  "'Syne', sans-serif",
  "'DM Sans', sans-serif",
  "'Orbitron', sans-serif",
  "'Rajdhani', sans-serif",
  "'JetBrains Mono', monospace",
  "'Playfair Display', serif",
  "'Share Tech Mono', monospace",
]

function getCardStyle(userId: string): CardStyle {
  const rng = seededRng(userId + '-card-style')
  const pal = CARD_PALETTES[Math.floor(rng() * CARD_PALETTES.length)]
  return {
    ...pal,
    layout:  CARD_LAYOUTS[Math.floor(rng() * CARD_LAYOUTS.length)],
    pattern: CARD_PATTERNS[Math.floor(rng() * CARD_PATTERNS.length)],
    font:    CARD_FONTS[Math.floor(rng() * CARD_FONTS.length)],
  }
}

// ── Canvas helpers ────────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}

function drawPattern(ctx: CanvasRenderingContext2D, pattern: CardStyle['pattern'], rng: ()=>number, W: number, H: number, color: string) {
  ctx.save()
  switch(pattern) {
    case 'dots':
      for (let x=0; x<W; x+=20) for (let y=0; y<H; y+=20) {
        ctx.beginPath(); ctx.arc(x,y,1.5,0,Math.PI*2)
        ctx.fillStyle = color + '30'; ctx.fill()
      }
      break
    case 'grid':
      ctx.strokeStyle = color + '20'; ctx.lineWidth = 0.5
      for (let x=0; x<W; x+=32) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      for (let y=0; y<H; y+=32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
      break
    case 'diagonal-lines':
      ctx.strokeStyle = color + '18'; ctx.lineWidth = 1
      for (let i=-H; i<W+H; i+=18) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+H,H); ctx.stroke() }
      break
    case 'circles':
      ctx.strokeStyle = color + '15'; ctx.lineWidth = 1
      for (let r=40; r<Math.max(W,H)*1.5; r+=40) {
        ctx.beginPath(); ctx.arc(W*0.15, H*0.15, r, 0, Math.PI*2); ctx.stroke()
      }
      break
    case 'hexagon':
      ctx.strokeStyle = color + '18'; ctx.lineWidth = 0.8
      const hw = 20, hh = 23
      for (let col=0; col<Math.ceil(W/hw)+2; col++) {
        for (let row=0; row<Math.ceil(H/hh)+2; row++) {
          const ox = col*hw*2 + (row%2)*hw - hw
          const oy = row*hh - hh
          ctx.beginPath()
          for (let a=0; a<6; a++) {
            const angle = (a*60-30)*Math.PI/180
            const px = ox + hw*Math.cos(angle), py = oy + hh*Math.sin(angle)
            a===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py)
          }
          ctx.closePath(); ctx.stroke()
        }
      }
      break
    case 'noise':
      for (let i=0; i<2000; i++) {
        const nx=rng()*W, ny=rng()*H
        ctx.fillStyle = color + Math.floor(rng()*30).toString(16).padStart(2,'0')
        ctx.fillRect(nx,ny,1,1)
      }
      break
  }
  ctx.restore()
}

// ── Main drawCard function ────────────────────────────────────────────────────
function drawCard(canvas: HTMLCanvasElement, user: {
  full_name: string; email: string; nusp?: string; created_at?: string; id: string
}, activeBadges: Badge[]) {
  const W = 900, H = 520
  canvas.width = W * 2; canvas.height = H * 2
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2)

  const rng = seededRng(user.id)
  const style = getCardStyle(user.id)
  const ink   = style.textDark ? '#1a1410' : '#ffffff'
  const inkM  = style.textDark ? 'rgba(30,20,10,0.45)' : 'rgba(255,255,255,0.45)'
  const inkS  = style.textDark ? 'rgba(30,20,10,0.65)' : 'rgba(255,255,255,0.65)'
  const r = style.layout === 'diagonal' ? 0 : 20

  // ── Background fill ───────────────────────────────────
  roundRect(ctx, 0, 0, W, H, r); ctx.clip()
  const bgGrad = ctx.createLinearGradient(0, 0, W, H)
  bgGrad.addColorStop(0, style.bgA); bgGrad.addColorStop(0.6, style.bgB); bgGrad.addColorStop(1, style.bgC)
  ctx.fillStyle = bgGrad; ctx.fillRect(0,0,W,H)

  // ── Pattern overlay ───────────────────────────────────
  drawPattern(ctx, style.pattern, rng, W, H, style.accentA)

  // ── Layout-specific panel + accent ────────────────────
  const initials = user.full_name.split(' ').map((n:string)=>n[0]).slice(0,2).join('').toUpperCase()

  if (style.layout === 'split-left' || style.layout === 'split-right') {
    const panelW = 260
    const px = style.layout === 'split-left' ? 0 : W - panelW
    const panelGrad = ctx.createLinearGradient(px, 0, px+panelW, 0)
    panelGrad.addColorStop(0, style.accentA + 'dd')
    panelGrad.addColorStop(1, style.accentB + 'aa')
    ctx.fillStyle = panelGrad; ctx.fillRect(px, 0, panelW, H)
    // divider line
    ctx.strokeStyle = style.textDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(style.layout === 'split-left' ? panelW : W-panelW, 0)
    ctx.lineTo(style.layout === 'split-left' ? panelW : W-panelW, H)
    ctx.stroke()
    drawPanelContent(ctx, style, px+panelW/2, H/2+10, initials, user.full_name, '#ffffff', rng)
    drawInfoSection(ctx, style, style.layout==='split-left'?panelW+36:36, 52, W, user, activeBadges, ink, inkM, inkS)
  } else if (style.layout === 'top-banner') {
    const bannerH = 160
    const bannerGrad = ctx.createLinearGradient(0, 0, W, 0)
    bannerGrad.addColorStop(0, style.accentA); bannerGrad.addColorStop(1, style.accentB)
    ctx.fillStyle = bannerGrad; ctx.fillRect(0, 0, W, bannerH)
    drawPanelContent(ctx, style, 90, bannerH/2+10, initials, user.full_name, '#ffffff', rng)
    drawInfoSection(ctx, style, 200, bannerH+28, W, user, activeBadges, ink, inkM, inkS)
  } else if (style.layout === 'diagonal') {
    // Diagonal split
    ctx.save()
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W*0.55,0); ctx.lineTo(W*0.35,H); ctx.lineTo(0,H); ctx.closePath()
    const dg = ctx.createLinearGradient(0,0,W*0.55,H)
    dg.addColorStop(0, style.accentA); dg.addColorStop(1, style.accentB)
    ctx.fillStyle = dg; ctx.fill(); ctx.restore()
    drawPanelContent(ctx, style, W*0.17, H/2+5, initials, user.full_name, '#ffffff', rng)
    drawInfoSection(ctx, style, W*0.4, 52, W, user, activeBadges, ink, inkM, inkS)
  } else if (style.layout === 'gradient-full') {
    // Full gradient background with centered content
    const fg = ctx.createRadialGradient(W*0.25, H*0.25, 20, W*0.25, H*0.25, W*0.7)
    fg.addColorStop(0, style.accentA+'55'); fg.addColorStop(1, 'transparent')
    ctx.fillStyle = fg; ctx.fillRect(0,0,W,H)
    // Avatar top-left
    drawAvatarCircle(ctx, 90, 90, 60, style, initials, rng)
    // Name below avatar
    ctx.font = `700 18px ${style.font}`; ctx.textAlign = 'left'
    ctx.fillStyle = ink; ctx.fillText(user.full_name, 170, 76)
    ctx.font = `400 12px 'DM Sans', sans-serif`; ctx.fillStyle = inkS
    ctx.fillText('SI · EACH · USP', 170, 96)
    drawInfoSection(ctx, style, 36, 170, W, user, activeBadges, ink, inkM, inkS)
  }

  // ── Card code bottom-right ─────────────────────────────
  const cardCode = '#' + user.id.replace(/-/g,'').slice(0,8).toUpperCase()
  ctx.font = `400 9px 'JetBrains Mono', monospace`
  ctx.textAlign = 'right'; ctx.fillStyle = inkM
  ctx.fillText(cardCode, W-20, H-14)

  // ── DaSIboard watermark ───────────────────────────────
  ctx.font = `700 11px '${style.font}'`
  ctx.fillStyle = inkM; ctx.textAlign = 'right'
  ctx.fillText('DaSIboard', W-20, H-26)

  // ── Border ───────────────────────────────────────────
  ctx.strokeStyle = style.textDark ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 1.5
  if (r > 0) { roundRect(ctx, 0.75, 0.75, W-1.5, H-1.5, r); ctx.stroke() }
}

function drawAvatarCircle(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number,
  style: CardStyle, initials: string, rng: ()=>number
) {
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.clip()
  const ag = ctx.createLinearGradient(cx-r, cy-r, cx+r, cy+r)
  ag.addColorStop(0, style.accentA); ag.addColorStop(1, style.accentB)
  ctx.fillStyle = ag; ctx.fill(); ctx.restore()
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = `bold 24px 'Syne', sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(initials, cx, cy+1)
  ctx.beginPath(); ctx.arc(cx, cy, r+3, 0, Math.PI*2)
  ctx.strokeStyle = style.accentA + '60'; ctx.lineWidth = 2; ctx.stroke()
  ctx.textBaseline = 'alphabetic'
}

function drawPanelContent(
  ctx: CanvasRenderingContext2D, style: CardStyle,
  cx: number, cy: number, initials: string, fullName: string, textColor: string,
  rng: ()=>number
) {
  drawAvatarCircle(ctx, cx, cy - 50, 48, style, initials, rng)
  const parts = fullName.split(' ')
  ctx.fillStyle = textColor; ctx.textAlign = 'center'
  ctx.font = `700 16px ${style.font}`
  ctx.fillText(parts[0] ?? '', cx, cy + 20)
  if (parts.length > 1) {
    ctx.font = `400 13px 'DM Sans', sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.fillText(parts.slice(1).join(' '), cx, cy + 38)
  }
  // course badge
  ctx.font = `600 10px 'DM Sans', sans-serif`
  const bl = 'SI · EACH · USP'
  const bw = ctx.measureText(bl).width + 18
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  roundRect(ctx, cx-bw/2, cy+50, bw, 20, 10); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(bl, cx, cy+64)
}

function drawInfoSection(
  ctx: CanvasRenderingContext2D, style: CardStyle,
  x: number, y: number, W: number,
  user: { email: string; nusp?: string; created_at?: string },
  activeBadges: Badge[],
  ink: string, inkM: string, inkS: string
) {
  const maxW = W - x - 32
  const items = [
    { label: 'E-MAIL',       value: user.email },
    { label: 'Nº USP',       value: user.nusp ?? 'Não informado' },
    { label: 'CURSO',        value: 'Sistemas de Informação' },
    { label: 'MEMBRO DESDE', value: user.created_at
        ? format(new Date(user.created_at), "MMM yyyy", { locale: ptBR })
        : '—' },
  ]

  let iy = y
  for (const item of items) {
    ctx.font = `600 8px 'DM Sans', sans-serif`
    ctx.fillStyle = style.accentA; ctx.textAlign = 'left'
    ctx.fillText(item.label, x, iy); iy += 13

    ctx.font = `500 13px 'DM Sans', sans-serif`
    ctx.fillStyle = ink
    let val = item.value
    while (ctx.measureText(val).width > maxW && val.length > 8) val = val.slice(0,-4)+'…'
    ctx.fillText(val, x, iy); iy += 22

    ctx.strokeStyle = style.textDark ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(x, iy); ctx.lineTo(x+maxW, iy); ctx.stroke()
    iy += 8
  }

  // Badges row
  if (activeBadges.length > 0) {
    iy += 6
    ctx.font = `600 8px 'DM Sans', sans-serif`
    ctx.fillStyle = style.accentA; ctx.fillText('BADGES', x, iy); iy += 12
    let bx = x
    for (const badge of activeBadges.slice(0, 6)) {
      ctx.font = '16px serif'
      ctx.fillText(badge.emoji, bx, iy + 4)
      bx += 26
    }
  }
}

// ── Badge picker modal ────────────────────────────────────────────────────────
function BadgePicker({
  badges, selected, onSave, onClose
}: {
  badges: Badge[]
  selected: string[]
  onSave: (ids: string[]) => void
  onClose: () => void
}) {
  const [sel, setSel] = useState<string[]>(selected)
  const MAX = 6

  const toggle = (id: string) => {
    setSel(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < MAX ? [...prev, id] : prev
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
         style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 animate-in" style={{maxHeight:"85dvh",overflowY:"auto",background:"var(--bg-card)",border:"1px solid var(--border)",boxShadow:"0 24px 64px rgba(0,0,0,0.5)"}}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>
            Escolher badges <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>({sel.length}/{MAX})</span>
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-3 gap-2 mb-4">
          {badges.map(b => (
            <button
              key={b.id}
              disabled={!b.unlocked}
              onClick={() => b.unlocked && toggle(b.id)}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all"
              style={{
                border: sel.includes(b.id) ? `2px solid ${b.color}` : '2px solid var(--border)',
                background: sel.includes(b.id) ? b.color + '18' : b.unlocked ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                opacity: b.unlocked ? 1 : 0.4,
                cursor: b.unlocked ? 'pointer' : 'not-allowed',
              }}>
              <span className="text-2xl">{b.emoji}</span>
              <span className="text-[10px] font-semibold text-center leading-tight"
                    style={{ color: sel.includes(b.id) ? b.color : 'var(--text-secondary)' }}>
                {b.label}
              </span>
              {!b.unlocked && (
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>🔒</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn-primary flex-1 justify-center" onClick={() => { onSave(sel); onClose() }}>
            <Check size={14} /> Salvar
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ── Profile Page ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showBadgePicker, setShowBadgePicker] = useState(false)
  const [activeBadgeIds, setActiveBadgeIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dasiboard-badges') ?? '[]') } catch { return [] }
  })

  const activeBadges = ALL_BADGES.filter(b => activeBadgeIds.includes(b.id) && b.unlocked)

  const draw = useCallback(() => {
    if (!canvasRef.current || !user) return
    drawCard(canvasRef.current, user, activeBadges)
  }, [user, activeBadgeIds])

  useEffect(() => { draw() }, [draw])

  const handleLogout = () => { logout(); navigate('/login') }

  const handleDownload = () => {
    if (!canvasRef.current || !user) return
    const a = document.createElement('a')
    a.download = `dasiboard-${user.full_name.toLowerCase().replace(/\s+/g,'-')}.png`
    a.href = canvasRef.current.toDataURL('image/png', 1.0)
    a.click()
  }

  const saveBadges = (ids: string[]) => {
    localStorage.setItem('dasiboard-badges', JSON.stringify(ids))
    setActiveBadgeIds(ids)
  }

  if (!user) return null

  const cardStyle = getCardStyle(user.id)
  const initials = user.full_name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()

  return (
    <div className="px-4 py-4 sm:px-6 md:px-8 md:py-8 max-w-2xl mx-auto w-full">
      {showBadgePicker && (
        <BadgePicker
          badges={ALL_BADGES}
          selected={activeBadgeIds}
          onSave={saveBadges}
          onClose={() => setShowBadgePicker(false)}
        />
      )}

      <h1 className="font-display text-2xl font-bold mb-6 flex items-center gap-2 animate-in"
          style={{ color: 'var(--text-primary)' }}>
        <User size={22} style={{ color: 'var(--accent-3)' }} /> Perfil
      </h1>

      {/* ── Identity card ────────────────────── */}
      <div className="mb-5 animate-in">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Cartão de identificação
          </p>
          <div className="flex gap-2">
            <button onClick={() => setShowBadgePicker(true)}
                    className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5">
              <Award size={12} /> Badges
            </button>
            <button onClick={draw} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5">
              <RefreshCw size={12} /> Atualizar
            </button>
            <button onClick={handleDownload} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
              <Download size={12} /> PNG
            </button>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden"
             style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.15)', lineHeight: 0 }}>
          <canvas ref={canvasRef}
                  style={{ display: 'block', width: '100%', cursor: 'pointer', borderRadius: 16 }}
                  onClick={handleDownload} title="Clique para baixar" />
        </div>
        <p className="text-[10px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>
          Estilo único para sua conta · clique para baixar
        </p>
      </div>

      {/* ── Active badges showcase ────────────── */}
      <div className="card mb-4 animate-in-delay-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-sm flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}>
            <Award size={15} style={{ color: 'var(--accent-3)' }} /> Meus badges
          </h3>
          <button onClick={() => setShowBadgePicker(true)}
                  className="text-xs transition-colors"
                  style={{ color: 'var(--accent-3)' }}>
            Gerenciar →
          </button>
        </div>
        {activeBadges.length === 0 ? (
          <div className="py-4 text-center" style={{ color: 'var(--text-muted)' }}>
            <p className="text-sm">Nenhum badge selecionado</p>
            <button onClick={() => setShowBadgePicker(true)}
                    className="text-xs mt-1" style={{ color: 'var(--accent-3)' }}>
              + Escolher badges
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeBadges.map(b => (
              <div key={b.id}
                   className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold"
                   style={{ background: b.color+'18', border: `1px solid ${b.color}44`, color: b.color }}
                   title={b.desc}>
                <span>{b.emoji}</span> {b.label}
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {ALL_BADGES.filter(b=>b.unlocked).length} de {ALL_BADGES.length} badges desbloqueados
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {ALL_BADGES.filter(b=>!b.unlocked).map(b => (
              <div key={b.id} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px]"
                   style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                   title={b.desc}>
                <span className="opacity-40">{b.emoji}</span>
                <span className="opacity-60">{b.label}</span>
                <span className="opacity-40">🔒</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Account info ─────────────────────── */}
      <div className="card mb-4 space-y-4 animate-in-delay-2">
        <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
          Informações da conta
        </h3>
        {[
          { icon: Mail,          label: 'E-mail',       value: user.email },
          { icon: Hash,          label: 'Nº USP',       value: user.nusp ?? 'Não informado' },
          { icon: GraduationCap, label: 'Curso',        value: 'Sistemas de Informação' },
          { icon: Calendar,      label: 'Membro desde', value: user.created_at
              ? format(new Date(user.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : '—' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                 style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)' }}>
              <Icon size={14} style={{ color: 'var(--accent-3)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── About ────────────────────────────── */}
      <div className="card mb-6 animate-in-delay-3">
        <h3 className="font-display font-semibold text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Sobre o DaSIboard
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Dashboard acadêmico dos alunos de Sistemas de Informação da EACH‑USP.
          Tarefas, notas, frequência, calendário e entidades do curso em um só lugar.
        </p>
        <div className="flex gap-2 mt-4 flex-wrap">
          {['v2.0.0','FastAPI','React','PostgreSQL'].map(t => (
            <span key={t} className="badge text-[10px]"
                  style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>{t}</span>
          ))}
        </div>
      </div>

      <button onClick={handleLogout} className="btn-danger w-full justify-center animate-in-delay-4">
        <LogOut size={15} /> Sair da conta
      </button>
    </div>
  )
}
