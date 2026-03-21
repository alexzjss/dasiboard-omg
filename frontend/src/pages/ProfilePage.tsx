import { useAuthStore } from '@/store/authStore'
import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  User, Mail, Hash, Calendar, GraduationCap, LogOut,
  Download, RefreshCw, Award, X, Check, Code2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@/utils/api'

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

// ── Titles ────────────────────────────────────────────────────────────────────
const TITLES = [
  'Explorador Incansável','Arquiteto de Sonhos','Nômade Digital',
  'Construtor do Futuro','Caçador de Bugs','Artesão do Código',
  'Viajante entre Mundos','Filósofo dos Pixels','Guardião da Stack',
  'Detetive de Dados','Mago das Abstrações','Pesquisador Curioso',
  'Estrategista Criativo','Desbravador de APIs','Artista do Terminal',
  'Navegador de Incertezas','Alquimista Digital','Construtor Obstinado',
  'Sonhador Pragmático','Engenheiro de Possibilidades','Entusiasta Nato',
  'Pensador Lateral','Hacker de Soluções','Curador de Conhecimento',
  'Montador de Sistemas','Visonário Técnico','Explorador de Fronteiras',
]

// ── Areas & Languages ────────────────────────────────────────────────────────
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

// ── Badge definitions ─────────────────────────────────────────────────────────
export interface Badge {
  id: string; emoji: string; label: string; desc: string
  color: string; unlocked: boolean
}

export const buildBadges = (opts: {
  hasBoards: boolean
  hasLanguage: boolean
  hasPassedSubject: boolean
  memberSlugs: string[]
}): Badge[] => [
  { id: 'pioneer',   emoji: '🚀', label: 'Pioneiro',    desc: 'Membro fundador do DaSIboard',            color: '#f59e0b', unlocked: true },
  { id: 'coder',     emoji: '💻', label: 'Dev',         desc: 'Selecionou uma linguagem principal',      color: '#6366f1', unlocked: opts.hasLanguage },
  { id: 'eisenhower',emoji: '📋', label: 'Eisenhower',  desc: 'Criou um quadro Kanban',                  color: '#22c55e', unlocked: opts.hasBoards },
  { id: 'night_owl', emoji: '🦉', label: 'Coruja',      desc: 'Aprovado em pelo menos uma disciplina',   color: '#a855f7', unlocked: opts.hasPassedSubject },
  { id: 'dasi',      emoji: '🎓', label: 'DASI',        desc: 'Membro do Diretório Acadêmico',           color: '#ec4899', unlocked: opts.memberSlugs.includes('dasi') },
  { id: 'hype',      emoji: '🤖', label: 'HypE',        desc: 'Membro do HypE (Dados & IA)',             color: '#f97316', unlocked: opts.memberSlugs.includes('hype') },
  { id: 'conway',    emoji: '🎮', label: 'Conway',      desc: 'Membro do Conway Game Studio',            color: '#10b981', unlocked: opts.memberSlugs.includes('conway') },
  { id: 'sintese',   emoji: '💼', label: 'Síntese Jr.', desc: 'Membro da Síntese Jr.',                   color: '#ef4444', unlocked: opts.memberSlugs.includes('sintese') },
  { id: 'shell',     emoji: '💀', label: 'Shell',       desc: 'Membro da EACH in the Shell',             color: '#00cc44', unlocked: opts.memberSlugs.includes('each-in-shell') },
  { id: 'pet',       emoji: '📚', label: 'PET-SI',      desc: 'Membro do PET-SI',                        color: '#4d67f5', unlocked: opts.memberSlugs.includes('pet-si') },
  { id: 'lab_minas', emoji: '🔬', label: 'Lab Minas',   desc: 'Membro do Lab das Minas',                 color: '#f472b6', unlocked: opts.memberSlugs.includes('lab-minas') },
  { id: 'grace',     emoji: '🌸', label: 'GrACE',       desc: 'Membro do GrACE',                         color: '#e879f9', unlocked: opts.memberSlugs.includes('grace') },
  { id: 'semana_si', emoji: '🎪', label: 'SemanaSI',    desc: 'Membro da Semana de SI',                  color: '#a855f7', unlocked: opts.memberSlugs.includes('semana-si') },
  { id: 'codelab',   emoji: '⚙️', label: 'CodeLab',     desc: 'Membro do CodeLab Leste',                 color: '#06b6d4', unlocked: opts.memberSlugs.includes('codelab') },
]

// ── Canvas helpers ────────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r)
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r)
  ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r)
  ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r)
  ctx.closePath()
}

// Cardinal-spline smooth blob — fully random shape
function drawBlob(ctx: CanvasRenderingContext2D, rng: () => number, cx: number, cy: number, baseR: number) {
  const n = 7 + Math.floor(rng() * 6)   // 7–12 points
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    // Dramatically varied radii — creates truly organic shapes
    const r = baseR * (0.45 + rng() * 0.90)
    pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r])
  }
  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const cp1x = p1[0] + (p2[0] - p0[0]) / 5
    const cp1y = p1[1] + (p2[1] - p0[1]) / 5
    const cp2x = p2[0] - (p3[0] - p1[0]) / 5
    const cp2y = p2[1] - (p3[1] - p1[1]) / 5
    if (i === 0) ctx.moveTo(p1[0], p1[1])
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1])
  }
  ctx.closePath()
}

function addNoise(ctx: CanvasRenderingContext2D, rng: () => number, W: number, H: number, alpha: number, count = 5000) {
  for (let i = 0; i < count; i++) {
    const x = rng() * W, y = rng() * H
    const v = Math.floor(rng() * 200)
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * rng()})`
    ctx.fillRect(x, y, 1, 1)
  }
}

// ── Main card drawing function ─────────────────────────────────────────────────
function drawCard(
  canvas: HTMLCanvasElement,
  user: { full_name: string; email: string; nusp?: string; id: string; avatar_url?: string },
  activeBadges: Badge[],
  area: string,
  language: string,
) {
  const W = 960, H = 540
  canvas.width  = W * 2
  canvas.height = H * 2
  canvas.style.width  = W + 'px'
  canvas.style.height = H + 'px'
  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2)

  const rngBlob  = seededRng(user.id + '-blob')
  const rngColor = seededRng(user.id + '-hue')

  // Seeded hue across full rainbow
  const hue     = Math.floor(rngColor() * 360)
  const sat     = 70 + Math.floor(rngColor() * 20)
  const blobLit = 50 + Math.floor(rngColor() * 20)
  const bgLit   = 96 + Math.floor(rngColor() * 3)

  const bgColor    = `hsl(${hue},${Math.floor(sat * 0.12)}%,${bgLit}%)`
  const inkColor   = `hsl(${hue},60%,18%)`       // dark solid — no alpha concat
  const inkFaint   = `hsl(${hue},40%,55%)`        // muted info text
  const blobMain   = `hsl(${hue},${sat}%,${blobLit}%)`
  const blobShift  = `hsl(${(hue+28)%360},${sat-8}%,${blobLit-14}%)`
  const accentPill = `hsl(${hue},${sat}%,${Math.max(blobLit-28,18)}%)`

  // ── 1. Clear canvas ─────────────────────────────────
  ctx.clearRect(0, 0, W, H)

  // ── 2. Card background (clipped to rounded rect) ────
  ctx.save()
  roundRect(ctx, 0, 0, W, H, 24)
  ctx.clip()

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, W, H)

  // ── 3. Blob ─────────────────────────────────────────
  const blobCx = W * (0.60 + rngBlob() * 0.22)
  const blobCy = H * (0.05 + rngBlob() * 0.18)
  const blobR  = H * (0.75 + rngBlob() * 0.28)

  const grad = ctx.createRadialGradient(
    blobCx - blobR * 0.28, blobCy - blobR * 0.22, blobR * 0.04,
    blobCx + blobR * 0.08, blobCy + blobR * 0.08, blobR * 1.1
  )
  grad.addColorStop(0,    blobMain)
  grad.addColorStop(0.55, blobShift)
  grad.addColorStop(1,   `hsl(${(hue+28)%360},${sat-8}%,${blobLit-14}%,0)`)

  drawBlob(ctx, rngBlob, blobCx, blobCy, blobR)
  ctx.fillStyle = grad
  ctx.fill()

  // Grain clipped to blob
  ctx.save()
  drawBlob(ctx, seededRng(user.id + '-blob'), blobCx, blobCy, blobR)
  ctx.clip()
  addNoise(ctx, seededRng(user.id + '-grain'), W, H * 0.70, 0.05, 5000)
  ctx.restore()

  // Subtle grain over whole card
  addNoise(ctx, seededRng(user.id + '-bg-grain'), W, H, 0.016, 2500)

  ctx.restore() // ← restore from card clip

  // ── 4. Avatar (above name) ──────────────────────────
  const avatarSize = 96
  const textX = 48
  const avatarY = Math.round(H * 0.22)

  if (user.avatar_url) {
    const img = new Image()
    img.src = user.avatar_url
    const cx = textX + avatarSize / 2
    const cy = avatarY + avatarSize / 2
    const r  = avatarSize / 2
    // Clip and draw
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, textX, avatarY, avatarSize, avatarSize)
    ctx.restore()
    // Border using blob color for visual harmony with the colored region
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r + 2.5, 0, Math.PI * 2)
    ctx.strokeStyle = blobMain
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.restore()
  }

  // ── 5. Text — name ──────────────────────────────────
  const textY = user.avatar_url
    ? avatarY + avatarSize + 28
    : Math.round(H * 0.56)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  const parts     = user.full_name.trim().split(/\s+/)
  const firstName = parts[0] ?? ''
  const lastName  = parts.slice(1).join(' ')

  // First name bold
  ctx.font      = `800 46px sans-serif`
  ctx.fillStyle = inkColor
  ctx.fillText(firstName, textX, textY)
  const fnW = ctx.measureText(firstName).width

  // Last name — light, same line or wrapped
  if (lastName) {
    ctx.font      = `300 46px sans-serif`
    ctx.fillStyle = inkFaint
    const spaceW = ctx.measureText(' ').width
    if (fnW + spaceW + ctx.measureText(lastName).width < W - textX * 2) {
      ctx.fillText(lastName, textX + fnW + spaceW, textY)
    } else {
      ctx.fillText(lastName, textX, textY + 52)
    }
  }

  // ── 6. Title ────────────────────────────────────────
  const titleRng  = seededRng(user.id + '-title')
  const titleText = TITLES[Math.floor(titleRng() * TITLES.length)]
  const titleY    = textY + 38

  ctx.font      = `400 16px sans-serif`
  ctx.fillStyle = inkFaint
  ctx.fillText(titleText, textX, titleY)

  // ── 7. USP # and email ──────────────────────────────
  const infoY   = titleY + 28
  const nuspStr = user.nusp ? `#${user.nusp}` : ''
  const infoStr = [nuspStr, user.email].filter(Boolean).join('  ·  ')

  ctx.font      = `400 12px monospace`
  ctx.fillStyle = inkFaint
  ctx.globalAlpha = 0.7
  ctx.fillText(infoStr, textX, infoY)
  ctx.globalAlpha = 1

  // ── 8. Bottom pill: area | language ────────────────
  const bottomY = H - 72
  const aLabel  = area || ''
  const lLabel  = language || ''

  if (aLabel || lLabel) {
    const pillH = 36
    ctx.font = `600 13px sans-serif`
    const aW     = aLabel ? ctx.measureText(aLabel).width + 22 : 0
    const lW     = lLabel ? ctx.measureText(lLabel).width + 22 : 0
    const sepW   = (aLabel && lLabel) ? 10 : 0
    const totalW = aW + sepW + lW
    const px = textX, py = bottomY

    // Pill border
    ctx.strokeStyle = accentPill
    ctx.globalAlpha = 0.55
    ctx.lineWidth   = 1.5
    roundRect(ctx, px, py, totalW, pillH, pillH / 2)
    ctx.stroke()
    ctx.globalAlpha = 1

    // Diagonal stripe separator
    if (aLabel && lLabel) {
      ctx.save()
      ctx.beginPath()
      roundRect(ctx, px + aW, py + 4, sepW, pillH - 8, 2)
      ctx.clip()
      ctx.fillStyle   = accentPill
      ctx.globalAlpha = 0.12
      ctx.fillRect(px + aW, py + 4, sepW, pillH - 8)
      ctx.globalAlpha = 0.4
      ctx.strokeStyle = accentPill
      ctx.lineWidth   = 1
      for (let sx = -pillH; sx < sepW + pillH; sx += 4) {
        ctx.beginPath()
        ctx.moveTo(px + aW + sx,        py + 4)
        ctx.lineTo(px + aW + sx + pillH, py + 4 + pillH)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      ctx.restore()
    }

    // Text labels
    ctx.fillStyle   = accentPill
    ctx.textAlign   = 'center'
    ctx.font        = `600 13px sans-serif`
    ctx.globalAlpha = 1
    if (aLabel) ctx.fillText(aLabel, px + aW / 2, py + pillH / 2 + 5)
    if (lLabel) ctx.fillText(lLabel, px + aW + sepW + lW / 2, py + pillH / 2 + 5)
    ctx.textAlign = 'left'
  }

  // ── 8. Badges (right-aligned) ───────────────────────
  const displayBadges = activeBadges.filter(b => b.unlocked).slice(0, 4)
  if (displayBadges.length > 0) {
    ctx.font      = '20px serif'
    ctx.textAlign = 'right'
    let bx = W - textX
    for (const badge of [...displayBadges].reverse()) {
      ctx.fillText(badge.emoji, bx, bottomY + 24)
      bx -= 28
    }
    ctx.textAlign = 'left'
  }

  // ── 9. Card ID ──────────────────────────────────────
  ctx.font        = `400 9px monospace`
  ctx.fillStyle   = inkColor
  ctx.globalAlpha = 0.25
  ctx.fillText(user.id.replace(/-/g, '').slice(0, 8).toUpperCase(), textX, H - 22)
  ctx.globalAlpha = 1

  // ── 10. Border ──────────────────────────────────────
  ctx.strokeStyle = inkColor
  ctx.globalAlpha = 0.1
  ctx.lineWidth   = 1.5
  roundRect(ctx, 0.75, 0.75, W - 1.5, H - 1.5, 24)
  ctx.stroke()
  ctx.globalAlpha = 1
}
// ── Badge Picker modal ────────────────────────────────────────────────────────
function BadgePicker({ badges, selected, onSave, onClose }: {
  badges: Badge[]; selected: string[]
  onSave: (ids: string[]) => void; onClose: () => void
}) {
  const [sel, setSel] = useState<string[]>(selected)
  const MAX = 4
  const toggle = (id: string) => setSel(p =>
    p.includes(id) ? p.filter(x => x !== id) : p.length < MAX ? [...p, id] : p
  )
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
         style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-y-auto animate-in"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '85dvh', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }} />
        </div>
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>Badges no cartão</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sel.length}/{MAX} · só os selecionados e desbloqueados aparecem</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>
        <div className="px-4 pb-4 grid grid-cols-2 gap-2 mt-1">
          {badges.map(b => (
            <button key={b.id} onClick={() => b.unlocked && toggle(b.id)} disabled={!b.unlocked}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all text-left active:scale-[0.97]"
                    style={{
                      border: `2px solid ${sel.includes(b.id) ? b.color : 'var(--border)'}`,
                      background: sel.includes(b.id) ? b.color + '18' : 'var(--bg-elevated)',
                      opacity: b.unlocked ? 1 : 0.4,
                      cursor: b.unlocked ? 'pointer' : 'not-allowed',
                    }}>
              <span className="text-2xl shrink-0">{b.emoji}</span>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate"
                   style={{ color: sel.includes(b.id) ? b.color : 'var(--text-primary)' }}>{b.label}</p>
                <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {b.unlocked ? b.desc : '🔒 Bloqueado'}
                </p>
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 pb-5 flex gap-2">
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
  const { user, logout, setUser } = useAuthStore()
  const navigate     = useNavigate()
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [area,     setAreaState]     = useState<string>(() => localStorage.getItem('dasiboard-area') ?? '')
  const [language, setLanguageState] = useState<string>(() => localStorage.getItem('dasiboard-lang') ?? '')
  const [activeBadgeIds, setActiveBadgeIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dasiboard-badges') ?? '[]') } catch { return [] }
  })
  const [showBadgePicker, setShowBadgePicker] = useState(false)
  const [avatarLoading,   setAvatarLoading]   = useState(false)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 2MB.'); return }
    setAvatarLoading(true)
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader()
        reader.onload  = () => res(reader.result as string)
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      const { data } = await api.patch('/users/me/avatar', { avatar_url: base64 })
      setUser(data)
      toast.success('Foto atualizada!')
    } catch { toast.error('Erro ao atualizar foto') }
    finally { setAvatarLoading(false); e.target.value = '' }
  }

  const handleRemoveAvatar = async () => {
    setAvatarLoading(true)
    try {
      const { data } = await api.patch('/users/me/avatar', { avatar_url: null })
      setUser(data)
      toast.success('Foto removida')
    } catch { toast.error('Erro ao remover foto') }
    finally { setAvatarLoading(false) }
  }

  // Dynamic unlock state from API
  const [memberSlugs,      setMemberSlugs]      = useState<string[]>([])
  const [hasBoards,        setHasBoards]         = useState(false)
  const [hasPassedSubject, setHasPassedSubject]  = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/entities/').catch(() => ({ data: [] })),
      api.get('/kanban/boards').catch(() => ({ data: [] })),
      api.get('/grades/subjects').catch(() => ({ data: [] })),
    ]).then(([entRes, boardRes, subRes]) => {
      setMemberSlugs((entRes.data as any[]).filter((e: any) => e.is_member).map((e: any) => e.slug))
      setHasBoards((boardRes.data as any[]).length > 0)
      const subjects = subRes.data as any[]
      setHasPassedSubject(subjects.some((s: any) => {
        const tw = s.grades.reduce((a: number, g: any) => a + g.weight, 0)
        if (!tw) return false
        return s.grades.reduce((a: number, g: any) => a + (g.value / g.max_value) * 10 * g.weight, 0) / tw >= 5
      }))
    })
  }, [])

  const badges = useMemo(
    () => buildBadges({ hasBoards, hasLanguage: !!language, hasPassedSubject, memberSlugs }),
    [hasBoards, language, hasPassedSubject, memberSlugs]
  )
  const activeBadges = useMemo(
    () => badges.filter(b => activeBadgeIds.includes(b.id) && b.unlocked),
    [badges, activeBadgeIds]
  )

  const draw = useCallback(() => {
    if (!canvasRef.current || !user) return
    if (user.avatar_url) {
      const img = new Image()
      img.onload = () => {
        try { drawCard(canvasRef.current!, user, activeBadges, area, language) }
        catch (err) { console.error('Card draw error:', err) }
      }
      img.src = user.avatar_url
    } else {
      try { drawCard(canvasRef.current, user, activeBadges, area, language) }
      catch (err) { console.error('Card draw error:', err) }
    }
  }, [user, activeBadges, area, language])

  useEffect(() => { draw() }, [draw])

  const handleLogout = () => { logout(); navigate('/login') }

  const handleDownload = () => {
    if (!canvasRef.current || !user) return
    const a = document.createElement('a')
    a.download = `dasiboard-${user.full_name.toLowerCase().replace(/\s+/g, '-')}.png`
    a.href = canvasRef.current.toDataURL('image/png', 1.0)
    a.click()
  }

  const saveBadges = (ids: string[]) => { localStorage.setItem('dasiboard-badges', JSON.stringify(ids)); setActiveBadgeIds(ids) }
  const saveArea   = (v: string)     => { localStorage.setItem('dasiboard-area', v); setAreaState(v) }
  const saveLang   = (v: string)     => { localStorage.setItem('dasiboard-lang', v); setLanguageState(v) }

  if (!user) return null

  return (
    <div className="px-4 py-4 sm:px-6 md:px-8 md:py-8 max-w-2xl mx-auto w-full">

      {showBadgePicker && (
        <BadgePicker badges={badges} selected={activeBadgeIds} onSave={saveBadges} onClose={() => setShowBadgePicker(false)} />
      )}

      <h1 className="font-display text-2xl font-bold mb-5 flex items-center gap-2 animate-in"
          style={{ color: 'var(--text-primary)' }}>
        <User size={22} style={{ color: 'var(--accent-3)' }} /> Perfil
      </h1>

      {/* ── Card ────────────────────────────────────── */}
      <div className="mb-5 animate-in">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Cartão</p>
          <div className="flex gap-1.5">
            <button onClick={() => setShowBadgePicker(true)} className="btn-ghost text-xs py-1.5 px-2.5 gap-1.5">
              <Award size={12} /> Badges
            </button>
            <button onClick={draw} className="btn-ghost text-xs py-1.5 px-2.5 gap-1.5">
              <RefreshCw size={12} />
            </button>
            <button onClick={handleDownload} className="btn-primary text-xs py-1.5 px-2.5 gap-1.5">
              <Download size={12} /> PNG
            </button>
          </div>
        </div>
        {/* Landscape card — full width, 16:9 */}
        <div className="overflow-hidden rounded-2xl w-full"
             style={{ lineHeight: 0, boxShadow: '0 16px 48px rgba(0,0,0,0.20), 0 4px 12px rgba(0,0,0,0.12)' }}>
          <canvas ref={canvasRef}
                  style={{ display: 'block', width: '100%', height: 'auto', cursor: 'pointer', borderRadius: 16 }}
                  onClick={handleDownload} title="Toque para baixar" />
        </div>
        <p className="text-[10px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>
          Único por conta · toque para baixar
        </p>
      </div>

      {/* ── Área & Linguagem ────────────────────────── */}
      <div className="card mb-4 animate-in-delay-1">
        <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Code2 size={15} style={{ color: 'var(--accent-3)' }} /> Área & Linguagem
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Área de atuação</label>
            <select className="input text-sm" value={area} onChange={(e) => saveArea(e.target.value)}>
              <option value="">Selecionar...</option>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Linguagem principal</label>
            <select className="input text-sm" value={language} onChange={(e) => saveLang(e.target.value)}>
              <option value="">Selecionar...</option>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        {language && (
          <p className="text-xs mt-2.5 flex items-center gap-1.5" style={{ color: 'var(--accent-3)' }}>
            💻 Badge <strong>Dev</strong> desbloqueada!
          </p>
        )}
        {hasBoards && (
          <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: '#22c55e' }}>
            📋 Badge <strong>Eisenhower</strong> desbloqueada!
          </p>
        )}
        {hasPassedSubject && (
          <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: '#a855f7' }}>
            🦉 Badge <strong>Coruja</strong> desbloqueada!
          </p>
        )}
      </div>

      {/* ── Badges ──────────────────────────────────── */}
      <div className="card mb-4 animate-in-delay-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Badges <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>
              ({badges.filter(b => b.unlocked).length}/{badges.length})
            </span>
          </h3>
          <button onClick={() => setShowBadgePicker(true)} className="text-xs" style={{ color: 'var(--accent-3)' }}>
            Editar →
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {badges.map(b => (
            <div key={b.id}
                 className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all"
                 style={{
                   background: b.unlocked ? b.color + '18' : 'var(--bg-elevated)',
                   border: `1px solid ${b.unlocked ? b.color + '44' : 'var(--border)'}`,
                   color: b.unlocked ? b.color : 'var(--text-muted)',
                   opacity: b.unlocked ? 1 : 0.4,
                 }}
                 title={b.desc}>
              <span>{b.emoji}</span>
              <span className="font-semibold">{b.label}</span>
              {!b.unlocked && <span className="text-[9px]">🔒</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Avatar ──────────────────────────────────── */}
      <div className="card mb-4 animate-in-delay-3">
        <h3 className="font-display font-semibold text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Foto de perfil
        </h3>
        <div className="flex items-center gap-4">
          {/* Avatar preview */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
                 style={{ background: 'var(--gradient-btn)', border: '2px solid var(--border)' }}>
              {user.avatar_url
                ? <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                : <span className="text-2xl font-bold text-white font-display">
                    {user.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
              }
            </div>
            {avatarLoading && (
              <div className="absolute inset-0 rounded-full flex items-center justify-center"
                   style={{ background: 'rgba(0,0,0,0.5)' }}>
                <RefreshCw size={16} className="animate-spin text-white" />
              </div>
            )}
          </div>
          {/* Controls */}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
              className="btn-primary text-xs py-1.5 px-3 gap-1.5"
            >
              <Download size={12} /> Enviar foto
            </button>
            {user.avatar_url && (
              <button
                onClick={handleRemoveAvatar}
                disabled={avatarLoading}
                className="btn-ghost text-xs py-1.5 px-3 gap-1.5"
                style={{ color: '#f87171' }}
              >
                <X size={12} /> Remover
              </button>
            )}
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              JPG, PNG ou WebP · máx 2MB
            </p>
          </div>
        </div>
      </div>

      {/* ── Account info ─────────────────────────────── */}
      <div className="card mb-4 space-y-4 animate-in-delay-4">
        <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>Conta</h3>
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

      <button onClick={handleLogout} className="btn-danger w-full justify-center animate-in-delay-4">
        <LogOut size={15} /> Sair da conta
      </button>
    </div>
  )
}
