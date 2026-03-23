import { useAuthStore } from '@/store/authStore'
import storage, { STORAGE_KEYS } from '@/utils/storage'
import { useRef, useEffect, useCallback, useState, useMemo, type ChangeEvent } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  User, Mail, Hash, Calendar, GraduationCap, LogOut,
  Download, RefreshCw, X, Check, Code2, Trophy,
  Sparkles, ImagePlus, Trash2, Lock, Star, RotateCw, Maximize2,
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
  hasCreatedRoom?: boolean
  hasSharedNote?: boolean
  entityCount?: number
}): Achievement[] => [

  // ── PERFIL ─────────────────────────────────────────────────────────────────
  { id: 'pioneer',      emoji: '🚀', label: 'Pioneiro',        rarity: 'legendary', category: 'profile',
    desc: 'Membro fundador do DaSIboard',           hint: 'Crie sua conta',            color: '#f59e0b', unlocked: true },
  { id: 'face',         emoji: '📸', label: 'Fotogênico',      rarity: 'common',    category: 'profile',
    desc: 'Adicionou foto de perfil',               hint: 'Faça upload de uma foto',   color: '#ec4899', unlocked: opts.hasAvatar },
  { id: 'identified',   emoji: '🪪', label: 'Identificado',    rarity: 'common',    category: 'profile',
    desc: 'Adicionou número USP',                   hint: 'Informe seu Nº USP',         color: '#8b5cf6', unlocked: opts.hasNusp },
  { id: 'coder',        emoji: '💻', label: 'Desenvolvedor',   rarity: 'common',    category: 'profile',
    desc: 'Selecionou uma linguagem principal',     hint: 'Escolha sua linguagem',    color: '#6366f1', unlocked: opts.hasLanguage },
  { id: 'specialist',   emoji: '🎯', label: 'Especialista',    rarity: 'common',    category: 'profile',
    desc: 'Selecionou uma área de atuação',         hint: 'Escolha sua área',          color: '#06b6d4', unlocked: opts.hasArea },
  { id: 'polyglot',     emoji: '🌐', label: 'Poliglota',       rarity: 'rare',      category: 'profile',
    desc: 'Tem linguagem E área configuradas',      hint: 'Configure perfil completo', color: '#0ea5e9', unlocked: opts.hasLanguage && opts.hasArea },
  { id: 'complete',     emoji: '⭐', label: 'Perfil Completo', rarity: 'epic',      category: 'profile',
    desc: 'Foto, USP, linguagem e área preenchidos',hint: 'Complete todos os campos',  color: '#f59e0b', unlocked: opts.hasAvatar && opts.hasNusp && opts.hasLanguage && opts.hasArea },

  // ── KANBAN ─────────────────────────────────────────────────────────────────
  { id: 'eisenhower',   emoji: '📋', label: 'Eisenhower',      rarity: 'common',    category: 'kanban',
    desc: 'Criou o primeiro quadro Kanban',         hint: 'Crie um quadro em Kanban',  color: '#22c55e', unlocked: opts.hasBoards },
  { id: 'organizer',    emoji: '🗂️', label: 'Organizador',     rarity: 'rare',      category: 'kanban',
    desc: 'Criou 3 ou mais quadros Kanban',         hint: 'Crie pelo menos 3 quadros', color: '#10b981', unlocked: opts.hasMultipleBoards },
  { id: 'architect',    emoji: '🏗️', label: 'Arquiteto',       rarity: 'epic',      category: 'kanban',
    desc: 'Mestre da gestão de projetos',           hint: 'Use o Kanban por semanas',  color: '#14b8a6', unlocked: opts.hasMultipleBoards && opts.hasBoards },

  // ── CALENDÁRIO ─────────────────────────────────────────────────────────────
  { id: 'planner',      emoji: '🗓️', label: 'Planejador',      rarity: 'common',    category: 'kanban',
    desc: 'Criou 5+ eventos no calendário',         hint: 'Adicione 5 eventos',        color: '#f59e0b', unlocked: opts.eventCount >= 5 },
  { id: 'scheduler',    emoji: '📆', label: 'Agendista',       rarity: 'rare',      category: 'kanban',
    desc: 'Criou 15+ eventos no calendário',        hint: 'Adicione 15 eventos',       color: '#f97316', unlocked: opts.eventCount >= 15 },
  { id: 'chronicler',   emoji: '📜', label: 'Cronista',        rarity: 'epic',      category: 'kanban',
    desc: 'Criou 30+ eventos no calendário',        hint: 'Adicione 30 eventos',       color: '#ef4444', unlocked: opts.eventCount >= 30 },

  // ── ACADÊMICO ──────────────────────────────────────────────────────────────
  { id: 'freshman',     emoji: '🎒', label: 'Calouro',         rarity: 'common',    category: 'academic',
    desc: 'Cadastrou a primeira disciplina',        hint: 'Adicione uma matéria',      color: '#6366f1', unlocked: opts.subjectCount >= 1 },
  { id: 'annotator',    emoji: '✏️', label: 'Anotador',        rarity: 'common',    category: 'academic',
    desc: 'Registrou 10+ notas',                   hint: 'Adicione 10 notas',          color: '#f97316', unlocked: opts.gradeCount >= 10 },
  { id: 'scholar',      emoji: '📚', label: 'Estudioso',       rarity: 'rare',      category: 'academic',
    desc: 'Cadastrou 6+ disciplinas',               hint: 'Adicione 6 matérias',       color: '#8b5cf6', unlocked: opts.subjectCount >= 6 },
  { id: 'dean',         emoji: '🏛️', label: 'Decano',          rarity: 'epic',      category: 'academic',
    desc: 'Cadastrou 10+ disciplinas',              hint: 'Adicione 10 matérias',      color: '#6366f1', unlocked: opts.subjectCount >= 10 },
  { id: 'night_owl',    emoji: '🦉', label: 'Coruja',          rarity: 'rare',      category: 'academic',
    desc: 'Aprovado em pelo menos uma disciplina',  hint: 'Registre notas e passe',    color: '#a855f7', unlocked: opts.hasPassedSubject },
  { id: 'honor_roll',   emoji: '🏅', label: 'Honra ao Mérito', rarity: 'epic',      category: 'academic',
    desc: 'Aprovado em 5+ disciplinas',             hint: 'Passe em várias matérias',  color: '#f59e0b', unlocked: opts.hasPassedSubject && opts.subjectCount >= 5 },
  { id: 'survivor',     emoji: '💀', label: 'Sobrevivente',    rarity: 'rare',      category: 'academic',
    desc: 'Reprovado e voltou mais forte',          hint: 'Registre uma reprovação',   color: '#ef4444', unlocked: opts.hasFailedSubject },
  { id: 'phoenix',      emoji: '🔥', label: 'Fênix',           rarity: 'epic',      category: 'academic',
    desc: 'Reprovado E aprovado — persistência total', hint: 'Passe após reprovar',   color: '#f97316', unlocked: opts.hasPassedSubject && opts.hasFailedSubject },
  { id: 'grademaster',  emoji: '📊', label: 'Mestre das Notas',rarity: 'legendary', category: 'academic',
    desc: 'Registrou 30+ avaliações',              hint: 'Adicione muitas notas',      color: '#a855f7', unlocked: opts.gradeCount >= 30 },
  { id: 'semester_all', emoji: '📖', label: 'Semestral',       rarity: 'common',    category: 'academic',
    desc: 'Disciplinas de todo um semestre',        hint: 'Cadastre 5 matérias',       color: '#06b6d4', unlocked: opts.subjectCount >= 5 },

  // ── TEMPO & DEDICAÇÃO ──────────────────────────────────────────────────────
  { id: 'night_coder',  emoji: '🌙', label: 'Coder Noturno',   rarity: 'rare',      category: 'secret',
    desc: 'Usou o app após meia-noite',             hint: '???',                        color: '#6366f1', unlocked: new Date().getHours() >= 0 && new Date().getHours() < 4 },
  { id: 'early_bird',   emoji: '🌅', label: 'Madrugador',      rarity: 'rare',      category: 'secret',
    desc: 'Usou o app antes das 6h da manhã',       hint: '???',                        color: '#f59e0b', unlocked: new Date().getHours() >= 4 && new Date().getHours() < 6 },
  { id: 'weekend',      emoji: '🎉', label: 'Sem Fins',        rarity: 'common',    category: 'secret',
    desc: 'Acessou no fim de semana',               hint: '???',                        color: '#ec4899', unlocked: new Date().getDay() === 0 || new Date().getDay() === 6 },
  { id: 'friday',       emoji: '🍻', label: 'TGIF',            rarity: 'common',    category: 'secret',
    desc: 'Acessou numa sexta-feira',               hint: '???',                        color: '#22c55e', unlocked: new Date().getDay() === 5 },

  // ── ESPECIAL / SECRETO ─────────────────────────────────────────────────────
  { id: 'easter_egg',   emoji: '🥚', label: 'Caçador',         rarity: 'legendary', category: 'secret',
    desc: 'Encontrou um easter egg!',               hint: '???',                        color: '#f59e0b', unlocked: opts.easterEggFound },
  { id: 'hacker',       emoji: '👾', label: 'Hacker',          rarity: 'epic',      category: 'secret',
    desc: 'Explorou além do esperado',              hint: '???',                        color: '#00ff41', unlocked: opts.easterEggFound },
  { id: 'collector',    emoji: '💎', label: 'Colecionador',    rarity: 'legendary', category: 'profile',
    desc: 'Desbloqueou 15+ conquistas',             hint: 'Continue explorando!',       color: '#a855f7',
    unlocked: (() => {
      const base = [opts.hasAvatar, opts.hasNusp, opts.hasLanguage, opts.hasArea,
                    opts.hasBoards, opts.hasMultipleBoards, opts.hasPassedSubject,
                    opts.eventCount >= 5, opts.subjectCount >= 6, opts.gradeCount >= 10].filter(Boolean).length
      return base >= 8
    })() },
  { id: 'veteran',      emoji: '🎖️', label: 'Veterano',        rarity: 'epic',      category: 'profile',
    desc: 'Usuário experiente do DaSIboard',        hint: 'Use o app extensamente',    color: '#f59e0b',
    unlocked: opts.subjectCount >= 8 && opts.eventCount >= 10 && opts.gradeCount >= 15 },
  { id: 'all_rounder',  emoji: '🌟', label: 'Completo',        rarity: 'legendary', category: 'profile',
    desc: 'Usou todas as seções do DaSIboard',      hint: 'Explore tudo!',              color: '#f59e0b',
    unlocked: opts.hasBoards && opts.eventCount >= 5 && opts.subjectCount >= 3 && opts.hasLanguage },
  { id: 'si_spirit',    emoji: '🎓', label: 'Espírito SI',     rarity: 'legendary', category: 'academic',
    desc: 'A essência de Sistemas de Informação',   hint: 'Seja o SI',                  color: '#4d67f5',
    unlocked: opts.hasNusp && opts.hasLanguage && opts.hasArea && opts.hasPassedSubject },

  // ── MARCOS NUMÉRICOS ───────────────────────────────────────────────────────
  { id: 'event5',       emoji: '📅', label: 'Primeiro Prazo',  rarity: 'common',    category: 'kanban',
    desc: 'Primeiro evento criado',                 hint: 'Crie um evento',             color: '#06b6d4', unlocked: opts.eventCount >= 1 },
  { id: 'grade5',       emoji: '✅', label: 'Primeira Nota',   rarity: 'common',    category: 'academic',
    desc: 'Primeira avaliação registrada',          hint: 'Registre uma nota',          color: '#22c55e', unlocked: opts.gradeCount >= 1 },
  { id: 'subject1',     emoji: '📗', label: 'Primeira Aula',   rarity: 'common',    category: 'academic',
    desc: 'Primeira disciplina cadastrada',         hint: 'Cadastre uma matéria',       color: '#10b981', unlocked: opts.subjectCount >= 1 },
  { id: 'marathon',     emoji: '🏃', label: 'Maratonista',     rarity: 'epic',      category: 'academic',
    desc: 'Cadastrou disciplinas de 3+ semestres',  hint: 'Avance nos semestres',       color: '#f97316',
    unlocked: opts.subjectCount >= 12 },
  { id: 'centurion',    emoji: '💯', label: 'Centurião',       rarity: 'legendary', category: 'academic',
    desc: 'Registrou 100+ avaliações',              hint: 'Registre 100 notas',         color: '#ef4444',
    unlocked: opts.gradeCount >= 100 },

  // ── ESTÉTICA / TEMAS ───────────────────────────────────────────────────────
  { id: 'themehunter',  emoji: '🎨', label: 'Caçador de Temas',rarity: 'rare',      category: 'profile',
    desc: 'Explorou a paleta de temas',             hint: 'Troque de tema',             color: '#ec4899', unlocked: true },
  { id: 'minimalist',   emoji: '⬜', label: 'Minimalista',     rarity: 'common',    category: 'profile',
    desc: 'Menos é mais',                           hint: 'Use um tema claro',          color: '#6b7280', unlocked: true },
  { id: 'darkside',     emoji: '🌑', label: 'Lado Sombrio',    rarity: 'common',    category: 'profile',
    desc: 'Do lado escuro da força',                hint: 'Use um tema escuro',         color: '#1e1e2e', unlocked: true },

  // ── SOCIAL ─────────────────────────────────────────────────────────────────
  { id: 'numero_1',   emoji: '🥇', label: 'Número 1',      rarity: 'rare',      category: 'social',
    desc: 'Criou a primeira sala de estudo',    hint: 'Crie uma sala em /room',   color: '#f59e0b', unlocked: !!(opts.hasCreatedRoom) },
  { id: 'cola',       emoji: '📎', label: 'Cola',           rarity: 'common',    category: 'social',
    desc: 'Compartilhou uma nota com colegas',  hint: 'Compartilhe uma nota',     color: '#22c55e', unlocked: !!(opts.hasSharedNote) },
  { id: 'explorador', emoji: '🧭', label: 'Explorador',    rarity: 'epic',      category: 'social',
    desc: 'Membro de 3 ou mais entidades',      hint: 'Entre em 3 entidades',     color: '#a855f7', unlocked: (opts.entityCount ?? 0) >= 3 },
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
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha*rng()})`;  ctx.fillRect(x, y, 1, 1)
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
  const f = (n: number) => { const k = (n+h/30)%12; return l - a*Math.max(Math.min(k-3,9-k,1),-1) }
  return [Math.round(f(0)*255), Math.round(f(8)*255), Math.round(f(4)*255)]
}
function rgbToHsl(r: number, g: number, b: number): [number,number,number] {
  r/=255; g/=255; b/=255
  const max=Math.max(r,g,b), min=Math.min(r,g,b), l=(max+min)/2
  if (max===min) return [0,0,l*100]
  const d=max-min, s=d/(l>0.5?2-max-min:max+min)
  const h=max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4
  return [h*60, s*100, l*100]
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHsl(r, g, b)
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}

function pickBlobPalette(
  userId: string,
  entities: { id: string; color: string; is_member: boolean }[],
  selectedEntityId: string | null,
): { hue: number; sat: number; lit: number } {
  const members = entities.filter(e => e.is_member)
  if (selectedEntityId) {
    const selected = entities.find(e => e.id === selectedEntityId && e.is_member)
    if (selected) {
      const [h, s, l] = hexToHsl(selected.color)
      return { hue: h, sat: s, lit: l }
    }
  }
  if (members.length > 0) {
    const rng = seededRng(userId + '-blob-entity')
    const pick = members[Math.floor(rng() * members.length)]
    const [h, s, l] = hexToHsl(pick.color)
    return { hue: h, sat: s, lit: l }
  }

  const rng = seededRng(userId + '-blob-fallback')
  let hue = Math.floor(rng() * 360)
  let sat = 60 + rng() * 18
  let lit = 46 + rng() * 16

  const entityHues = entities.map(e => hexToHsl(e.color)[0])
  let attempts = 0
  while (entityHues.some(h => hueDistance(h, hue) < 18) && attempts < 12) {
    hue = (hue + 27) % 360
    attempts += 1
  }
  return { hue, sat, lit }
}

function deriveColors(hue: number, sat: number, lit: number) {
  const h2=(hue+40)%360, h3=(hue+85)%360, h4=(hue-30+360)%360
  return {
    c1:`hsl(${hue},${sat}%,${lit}%)`,
    c2:`hsl(${h2},${sat-8}%,${lit-18}%)`,
    c3:`hsl(${h3},${sat-16}%,${Math.max(lit-30,12)}%)`,
    c4:`hsl(${h4},${Math.min(sat+10,100)}%,${Math.min(lit+18,88)}%)`,
    c5:`hsl(${hue},${sat-25}%,${Math.min(lit+32,92)}%)`,
    hue, sat, lit, h2, h3, h4,
  }
}

type CardStyle =
  | 'geometric_rays' | 'layer_stack' | 'wave_lines' | 'holographic'
  | 'boarding_pass'  | 'concentric_shapes' | 'ink_splatter'
  | 'halftone' | 'topographic' | 'neon_glow'

type CardEffect =
  | 'foil_gold' | 'foil_holo' | 'scanlines' | 'vignette'
  | 'chromatic' | 'grain_film' | 'crosshatch' | 'noise_rgb' | 'none'

type ColorScheme = 'vivid' | 'pastel' | 'dark_rich' | 'neon' | 'earth' | 'cold'

function pickCardStyle(userId: string): CardStyle {
  const rng = seededRng(userId+'-stylev3')
  const s: CardStyle[] = ['geometric_rays','layer_stack','wave_lines','holographic',
    'boarding_pass','concentric_shapes','ink_splatter','halftone','topographic','neon_glow']
  return s[Math.floor(rng()*s.length)]
}
function pickCardEffect(userId: string): CardEffect {
  const rng = seededRng(userId+'-effectv2')
  const e: CardEffect[] = ['foil_gold','foil_holo','scanlines','vignette','chromatic',
    'grain_film','crosshatch','noise_rgb','none','foil_holo','foil_gold','none','vignette','scanlines','none']
  return e[Math.floor(rng()*e.length)]
}
function pickColorScheme(userId: string): ColorScheme {
  const rng = seededRng(userId+'-scheme')
  const s: ColorScheme[] = ['vivid','pastel','dark_rich','neon','earth','cold','vivid','vivid']
  return s[Math.floor(rng()*s.length)]
}
function applyColorScheme(hue: number, scheme: ColorScheme, rng: () => number): { sat: number; lit: number } {
  switch(scheme) {
    case 'vivid':     return { sat:75+rng()*18, lit:50+rng()*12 }
    case 'pastel':    return { sat:42+rng()*20, lit:68+rng()*14 }
    case 'dark_rich': return { sat:68+rng()*22, lit:30+rng()*14 }
    case 'neon':      return { sat:90+rng()*10, lit:54+rng()*12 }
    case 'earth':     return { sat:32+rng()*28, lit:40+rng()*20 }
    case 'cold':      return { sat:52+rng()*28, lit:56+rng()*18 }
  }
}

// ── Avatar rendering (circle with border) ─────────────────────────────────────
function drawAvatarCircle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  initials: string,
  cx: number, cy: number, r: number,
  borderColor: string, isDark: boolean,
) {
  // Border ring
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, r+3, 0, Math.PI*2)
  ctx.fillStyle = borderColor; ctx.globalAlpha = 0.9; ctx.fill()
  ctx.globalAlpha = 1; ctx.restore()

  // Clip circle
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.clip()

  if (img) {
    // Draw image fitted inside circle
    const size = r*2
    ctx.drawImage(img, cx-r, cy-r, size, size)
  } else {
    // Initials fallback
    const bg = isDark ? `rgba(255,255,255,0.15)` : `rgba(0,0,0,0.12)`
    ctx.fillStyle = bg; ctx.fillRect(cx-r, cy-r, r*2, r*2)
    ctx.font = `700 ${Math.round(r*0.72)}px sans-serif`
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(initials, cx, cy)
  }
  ctx.restore()
}

// ── QR-code-like pattern (decorative, not scannable) ─────────────────────────
function drawDecorativeQR(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  fgColor: string, rng: () => number,
) {
  const cells = 9
  const cell  = size / cells
  ctx.fillStyle = fgColor

  // Corner squares (mandatory in real QR)
  const corner = (cx: number, cy: number) => {
    ctx.fillRect(cx, cy, cell*3, cell*3)
    ctx.clearRect(cx+cell, cy+cell, cell, cell)
    ctx.fillRect(cx+cell, cy+cell, cell, cell) // center dot
  }
  ctx.save()
  ctx.globalAlpha = 0.85
  corner(x, y); corner(x+size-cell*3, y); corner(x, y+size-cell*3)
  // Random data cells
  for (let r=0; r<cells; r++) {
    for (let c=0; c<cells; c++) {
      if ((r<3&&c<3)||(r<3&&c>5)||(r>5&&c<3)) continue
      if (rng()<0.48) ctx.fillRect(x+c*cell, y+r*cell, cell-0.5, cell-0.5)
    }
  }
  ctx.restore()
}

// ── PORTRAIT card background — Blob-inspired ─────────────────────────────────
type BlobShape = 'blob'|'leaf'|'arch'|'corner'|'hill'|'shield'

function drawShape(
  ctx: CanvasRenderingContext2D,
  W: number, zoneH: number,
  shape: BlobShape,
  rng: () => number,
) {
  const pad = W * 0.06
  ctx.beginPath()

  switch (shape) {
    case 'blob': {
      const cx = W * (0.46 + (rng() - 0.5) * 0.12)
      const cy = zoneH * (0.38 + (rng() - 0.5) * 0.18)
      const rx = W * (0.48 + rng() * 0.18)
      const ry = zoneH * (0.52 + rng() * 0.20)
      const n = 12 + Math.floor(rng() * 4)
      const pts: [number, number][] = []
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2
        const wobble = 0.78 + rng() * 0.38
        pts.push([cx + Math.cos(ang) * rx * wobble, cy + Math.sin(ang) * ry * wobble])
      }
      for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n]
        const p1 = pts[i]
        const p2 = pts[(i + 1) % n]
        const p3 = pts[(i + 2) % n]
        const t = 0.28
        const cp1x = p1[0] + (p2[0] - p0[0]) * t
        const cp1y = p1[1] + (p2[1] - p0[1]) * t
        const cp2x = p2[0] - (p3[0] - p1[0]) * t
        const cp2y = p2[1] - (p3[1] - p1[1]) * t
        if (i === 0) ctx.moveTo(p1[0], p1[1])
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1])
      }
      ctx.closePath()
      break
    }
    case 'leaf': {
      const cx = W * (0.38 + rng() * 0.24)
      const cy = zoneH * (0.08 + rng() * 0.08)
      const rx = W  * (0.52 + rng() * 0.18)
      const ry = zoneH * (0.70 + rng() * 0.20)
      ctx.moveTo(cx, cy)
      ctx.bezierCurveTo(cx + rx, cy, cx + rx, cy + ry, cx, cy + ry)
      ctx.bezierCurveTo(cx - rx * (0.55 + rng()*0.3), cy + ry, cx - rx * (0.55 + rng()*0.3), cy, cx, cy)
      ctx.closePath()
      break
    }
    case 'arch': {
      const left  = pad
      const right = W - pad
      const top   = zoneH * (0.06 + rng() * 0.06)
      const bot   = zoneH * (0.94 + rng() * 0.04)
      const archH = (right - left) * (0.42 + rng() * 0.16)
      const r     = (right - left) / 2
      ctx.moveTo(left, bot)
      ctx.lineTo(left, top + archH)
      ctx.bezierCurveTo(left, top + archH - archH * 0.55, left + r * 0.45, top, left + r, top)
      ctx.bezierCurveTo(left + r + r * 0.45, top, right, top + archH - archH * 0.55, right, top + archH)
      ctx.lineTo(right, bot)
      ctx.closePath()
      break
    }
    case 'corner': {
      const fromRight = rng() > 0.5
      const cx = fromRight ? W * 1.05 : -W * 0.05
      const cy = -zoneH * 0.05
      const r  = W * (0.72 + rng() * 0.28)
      const n  = 10 + Math.floor(rng() * 5)
      const pts: [number, number][] = []
      for (let i = 0; i < n; i++) {
        const base    = (i / n) * Math.PI * 2
        const isOuter = Math.cos(base) * (fromRight ? -1 : 1) > 0 || Math.sin(base) < 0
        const v       = isOuter ? (0.82 + rng() * 0.22) : (0.30 + rng() * 0.55)
        pts.push([cx + Math.cos(base) * r * v, cy + Math.sin(base) * r * v])
      }
      for (let i = 0; i < n; i++) {
        const p0=pts[(i-1+n)%n],p1=pts[i],p2=pts[(i+1)%n],p3=pts[(i+2)%n]
        const t=0.30
        const cp1x=p1[0]+(p2[0]-p0[0])*t, cp1y=p1[1]+(p2[1]-p0[1])*t
        const cp2x=p2[0]-(p3[0]-p1[0])*t, cp2y=p2[1]-(p3[1]-p1[1])*t
        if (i===0) ctx.moveTo(p1[0],p1[1])
        ctx.bezierCurveTo(cp1x,cp1y,cp2x,cp2y,p2[0],p2[1])
      }
      ctx.closePath()
      break
    }
    case 'hill': {
      const hillY = zoneH * (0.30 + rng() * 0.20)
      const amp1  = zoneH * (0.14 + rng() * 0.10)
      const amp2  = zoneH * (0.08 + rng() * 0.08)
      ctx.moveTo(0, zoneH)
      ctx.lineTo(W, zoneH)
      ctx.lineTo(W, hillY + amp2)
      ctx.bezierCurveTo(W*0.75, hillY+amp2-amp2*1.2, W*0.55, hillY-amp1*1.5, W*0.50, hillY-amp1)
      ctx.bezierCurveTo(W*0.45, hillY-amp1*1.5, W*0.25, hillY+amp1*0.8, 0, hillY+amp2*0.5)
      ctx.closePath()
      break
    }
    case 'shield': {
      const cx    = W / 2 + (rng() - 0.5) * W * 0.15
      const top   = zoneH * (0.03 + rng() * 0.06)
      const bot   = zoneH * (0.90 + rng() * 0.08)
      const halfW = W * (0.34 + rng() * 0.14)
      const rnd   = halfW * (0.55 + rng() * 0.30)
      const bodyH = bot - top - rnd
      ctx.moveTo(cx - halfW + rnd, top)
      ctx.lineTo(cx + halfW - rnd, top)
      ctx.bezierCurveTo(cx+halfW, top, cx+halfW, top+rnd, cx+halfW, top+rnd)
      ctx.lineTo(cx+halfW, top+bodyH)
      ctx.bezierCurveTo(cx+halfW, bot-rnd*0.3, cx+halfW*0.4, bot-rnd*0.05, cx, bot)
      ctx.bezierCurveTo(cx-halfW*0.4, bot-rnd*0.05, cx-halfW, bot-rnd*0.3, cx-halfW, top+bodyH)
      ctx.lineTo(cx-halfW, top+rnd)
      ctx.bezierCurveTo(cx-halfW, top, cx-halfW+rnd, top, cx-halfW+rnd, top)
      ctx.closePath()
      break
    }
  }
}

function drawCardBackground(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, zoneH: number,
  _style: CardStyle,
  hue: number, sat: number, lit: number,
  rng: () => number,
  entityBg: { color: string; name: string } | null,
  blobPalette: { hue: number; sat: number; lit: number } | null,
) {
  // ── 1. Always solid cream base — NEVER transparent ────────────────────────
  const cardBase = '#FAFAF5'
  ctx.fillStyle = cardBase
  ctx.fillRect(0, 0, W, H)

  // ── 2. Shape colors come from blob palette (entities or fallback) ──────────
  let blobH = blobPalette?.hue ?? hue
  let blobS = Math.max(blobPalette?.sat ?? sat, 42)
  let blobL = blobPalette?.lit ?? lit
  blobL = Math.min(Math.max(blobL, 32), 64)

  const hi  = `hsl(${blobH}, ${Math.max(blobS-18, 28)}%, ${Math.min(blobL+26, 82)}%)`
  const mid = `hsl(${blobH}, ${blobS}%, ${blobL}%)`
  const low = `hsl(${(blobH+18)%360}, ${Math.min(blobS+8, 88)}%, ${Math.max(blobL-22, 20)}%)`

  // ── 3. Pick shape deterministically from user hue+sat+lit seed ───────────
  const shapeRng  = seededRng(String(hue) + String(Math.round(sat)) + String(Math.round(lit)) + 'shp')
  const shapeRng2 = seededRng(String(hue) + String(Math.round(sat)) + 'shp2')
  const shapes: BlobShape[] = ['blob','blob','leaf','arch','corner','hill','shield']
  const shape = shapes[Math.floor(shapeRng() * shapes.length)]

  // ── 4. Draw shape inside clipped zone ────────────────────────────────────
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, W, zoneH)
  ctx.clip()

  // Fill cream in zone
  ctx.fillStyle = cardBase
  ctx.fillRect(0, 0, W, zoneH)

  // Draw shape with diagonal gradient
  drawShape(ctx, W, zoneH, shape, shapeRng2)
  const grad = ctx.createLinearGradient(W * 0.10, zoneH * 0.04, W * 0.88, zoneH * 0.96)
  grad.addColorStop(0,    hi)
  grad.addColorStop(0.42, mid)
  grad.addColorStop(1,    low)
  ctx.fillStyle = grad
  ctx.fill()

  // ── 5. Grain — pixel-by-pixel BUT clipped by the shape path ──────────────
  // We can't use putImageData (ignores clip) so we use tiny fillRect dots
  const grainRng = seededRng(String(hue) + 'grain2')
  const grainCount = 1800
  ctx.globalAlpha = 0.055
  for (let i = 0; i < grainCount; i++) {
    const gx = grainRng() * W
    const gy = grainRng() * zoneH
    const gv = grainRng()
    ctx.fillStyle = gv > 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)'
    ctx.fillRect(gx, gy, 1.5, 1.5)
  }
  ctx.globalAlpha = 1

  // ── 6. Sheen highlight — re-draw shape then radial gradient overlay ───────
  drawShape(ctx, W, zoneH, shape, seededRng(String(hue) + String(Math.round(sat)) + 'shp2'))
  const sheenX = W * (0.15 + shapeRng() * 0.30)
  const sheenY = zoneH * 0.06
  const sheenR = W * (0.40 + shapeRng() * 0.15)
  const sheen  = ctx.createRadialGradient(sheenX, sheenY, 0, sheenX, sheenY, sheenR)
  sheen.addColorStop(0,   'rgba(255,255,255,0.30)')
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.07)')
  sheen.addColorStop(1,   'rgba(255,255,255,0)')
  ctx.fillStyle    = sheen
  ctx.globalAlpha  = 1
  ctx.fill()

  ctx.restore()  // end clip zone

  // ── 7. Entity border — glowing frame on card edges ONLY ──────────────────
  if (entityBg) {
    const [er,eg,eb] = hexToRgb(entityBg.color)
    const glow = ctx.createLinearGradient(0, 0, W, H)
    glow.addColorStop(0,   `rgba(${er},${eg},${eb},0.70)`)
    glow.addColorStop(0.5, `rgba(${er},${eg},${eb},0.40)`)
    glow.addColorStop(1,   `rgba(${er},${eg},${eb},0.70)`)
    // Thick outer glow
    ctx.strokeStyle = glow
    ctx.lineWidth   = 6
    ctx.globalAlpha = 1
    roundRect(ctx, 3, 3, W-6, H-6, 30)
    ctx.stroke()
    // Crisp inner accent line
    ctx.strokeStyle = `rgba(${er},${eg},${eb},0.65)`
    ctx.lineWidth   = 1.5
    roundRect(ctx, 5, 5, W-10, H-10, 28)
    ctx.stroke()
  }
}

function drawCardEffect(ctx: CanvasRenderingContext2D, W: number, H: number, zoneH: number, effect: CardEffect, hue: number, rng: () => number) {
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,zoneH); ctx.clip()
  switch(effect) {
    case 'foil_gold': {
      const g=ctx.createLinearGradient(0,0,W,zoneH)
      g.addColorStop(0.00,'rgba(255,255,255,0.00)'); g.addColorStop(0.28,'rgba(255,255,255,0.04)')
      g.addColorStop(0.40,'rgba(255,235,140,0.30)'); g.addColorStop(0.48,'rgba(255,255,255,0.44)')
      g.addColorStop(0.56,'rgba(220,200,255,0.24)'); g.addColorStop(0.68,'rgba(255,255,255,0.06)'); g.addColorStop(1.00,'rgba(255,255,255,0.00)')
      ctx.fillStyle=g; ctx.fillRect(0,0,W,zoneH); break
    }
    case 'foil_holo': {
      const nb=5+Math.floor(rng()*4)
      for(let bi=0;bi<nb;bi++){
        const t=bi/nb, bx=t*W+rng()*40-20, bw=40+rng()*80, hh=(bi*55+hue*0.5)%360
        const sg=ctx.createLinearGradient(bx,0,bx+bw,zoneH)
        sg.addColorStop(0,`hsla(${hh},80%,75%,0)`); sg.addColorStop(0.35,`hsla(${hh},80%,75%,0.20)`)
        sg.addColorStop(0.5,`hsla(${(hh+40)%360},85%,80%,0.32)`); sg.addColorStop(0.65,`hsla(${(hh+80)%360},80%,75%,0.20)`); sg.addColorStop(1,`hsla(${hh},80%,75%,0)`)
        ctx.fillStyle=sg; ctx.fillRect(bx,0,bw,zoneH)
      }
      break
    }
    case 'scanlines': { for(let y=0;y<zoneH;y+=3){ctx.fillStyle='rgba(0,0,0,0.10)';ctx.fillRect(0,y,W,1)} break }
    case 'vignette': {
      const vg=ctx.createRadialGradient(W/2,zoneH/2,zoneH*0.15,W/2,zoneH/2,zoneH*0.88)
      vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.48)')
      ctx.fillStyle=vg; ctx.fillRect(0,0,W,zoneH); break
    }
    case 'chromatic': {
      const cgl=ctx.createLinearGradient(0,0,W*0.18,0); cgl.addColorStop(0,'rgba(255,0,0,0.10)'); cgl.addColorStop(1,'rgba(255,0,0,0)'); ctx.fillStyle=cgl; ctx.fillRect(0,0,W,zoneH)
      const cgr=ctx.createLinearGradient(W,0,W*0.82,0); cgr.addColorStop(0,'rgba(0,60,255,0.10)'); cgr.addColorStop(1,'rgba(0,60,255,0)'); ctx.fillStyle=cgr; ctx.fillRect(0,0,W,zoneH); break
    }
    case 'grain_film': addGrain(ctx,rng,W,zoneH,0.10,14000); break
    case 'crosshatch': {
      ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=0.8
      for(let x=-zoneH;x<W+zoneH;x+=8){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+zoneH,zoneH);ctx.stroke()}
      ctx.strokeStyle='rgba(0,0,0,0.06)'; ctx.lineWidth=0.8
      for(let x=-zoneH;x<W+zoneH;x+=8){ctx.beginPath();ctx.moveTo(x,zoneH);ctx.lineTo(x+zoneH,0);ctx.stroke()}
      break
    }
    case 'noise_rgb': {
      const rng2=seededRng('rgb-noise')
      for(let i=0;i<8000;i++){const x=rng2()*W,y=rng2()*zoneH,ch=Math.floor(rng2()*3),a=0.04+rng2()*0.08;ctx.fillStyle=ch===0?`rgba(255,0,0,${a})`:ch===1?`rgba(0,255,0,${a})`:`rgba(0,0,255,${a})`;ctx.fillRect(x+(ch-1)*1.5,y,2,2)}
      break
    }
    case 'none': default: break
  }
  ctx.restore()
}

// ── PORTRAIT card info — reorganized with avatar ───────────────────────────────
function drawPortraitInfo(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, zoneH: number,
  user: { full_name: string; email: string; nusp?: string; id: string; avatar_url?: string },
  avatarImg: HTMLImageElement | null,
  activeAchievements: Achievement[],
  area: string, language: string,
  hue: number, sat: number, lit: number,
  entityBg: { color: string; name: string } | null,
  style: CardStyle,
) {
  // Colors always from user hue
  const ink      = `hsl(${hue}, 55%, 12%)`
  const inkMid   = `hsl(${hue}, 30%, 40%)`
  const inkFaint = `hsl(${hue}, 20%, 58%)`
  const accent   = `hsl(${hue}, ${Math.max(sat, 52)}%, ${Math.max(lit - 8, 26)}%)`

  const padX = W * 0.085
  const padR = W - padX

  // ── Name block ────────────────────────────────────────────────────────────
  const nameParts = user.full_name.trim().split(/\s+/)
  const firstName = nameParts[0] ?? ''
  const lastName  = nameParts.slice(1).join(' ')

  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.globalAlpha  = 1

  const infoTop = zoneH + H * 0.042

  let fnSize = Math.round(W * 0.113)
  ctx.font = `700 ${fnSize}px sans-serif`
  while (ctx.measureText(firstName).width > W - padX * 2.2 && fnSize > 28) {
    fnSize -= 2
    ctx.font = `700 ${fnSize}px sans-serif`
  }
  ctx.fillStyle = ink
  ctx.fillText(firstName, padX, infoTop + fnSize * 0.92)

  const lastNameY = infoTop + fnSize * 0.92 + fnSize * 0.78
  if (lastName) {
    let lnSize = Math.round(W * 0.068)
    ctx.font = `400 ${lnSize}px sans-serif`
    while (ctx.measureText(lastName).width > W - padX * 2.2 && lnSize > 20) {
      lnSize -= 2
      ctx.font = `400 ${lnSize}px sans-serif`
    }
    ctx.fillStyle = inkMid
    ctx.fillText(lastName, padX, lastNameY)
  }

  // Title tagline
  const trng   = seededRng(user.id + '-title')
  const title  = TITLES[Math.floor(trng() * TITLES.length)]
  const titleY = (lastName ? lastNameY : infoTop + fnSize * 0.92) + H * 0.045
  const titleSz = Math.round(W * 0.036)
  ctx.font      = `500 ${titleSz}px monospace`
  ctx.fillStyle = inkFaint
  ctx.globalAlpha = 0.82
  ctx.fillText(title.toUpperCase(), padX, titleY)
  ctx.globalAlpha = 1

  // ── Bottom: Row 1 = tag + achievements, Row 2 = nUSP + EACH label ────────
  const tagH  = H * 0.048
  const row1Y = H * 0.858
  const tagY  = row1Y - tagH * 0.78
  const row2Y = H * 0.924
  const idY   = H * 0.965

  // ── Tag: [  area | language  ] ────────────────────────────────────────────
  // Left segment = area (or 'SI'), Right segment = language (or year)
  // Plain vertical divider — no diagonal hatch lines
  const tagSz  = Math.round(W * 0.034)
  ctx.font     = `600 ${tagSz}px monospace`
  const leftLabel  = area || 'SI'
  const rightLabel = language || String(new Date().getFullYear())
  const leftW  = ctx.measureText(leftLabel).width
  ctx.font     = `500 ${tagSz}px monospace`
  const rightW = ctx.measureText(rightLabel).width
  const tPad   = tagH * 0.48    // horizontal padding inside each segment
  const divW   = Math.max(1.5, W * 0.0022)  // divider width
  const tagTW  = tPad + leftW + tPad + divW + tPad + rightW + tPad

  // Tag outer box
  ctx.strokeStyle = accent
  ctx.lineWidth   = Math.max(1.5, W * 0.0022)
  ctx.globalAlpha = 1
  roundRect(ctx, padX, tagY, tagTW, tagH, tagH * 0.38)
  ctx.stroke()

  // Vertical divider line (plain, no hatch)
  const divX = padX + tPad + leftW + tPad
  ctx.beginPath()
  ctx.moveTo(divX, tagY + tagH * 0.18)
  ctx.lineTo(divX, tagY + tagH * 0.82)
  ctx.strokeStyle = accent
  ctx.lineWidth   = divW
  ctx.globalAlpha = 0.5
  ctx.stroke()
  ctx.globalAlpha = 1

  // Left text: area
  ctx.font         = `600 ${tagSz}px monospace`
  ctx.fillStyle    = accent
  ctx.textBaseline = 'middle'
  ctx.textAlign    = 'left'
  ctx.fillText(leftLabel, padX + tPad, tagY + tagH / 2)

  // Right text: language
  ctx.font      = `500 ${tagSz}px monospace`
  ctx.textAlign = 'left'
  ctx.fillText(rightLabel, divX + divW + tPad, tagY + tagH / 2)

  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  // ── Achievements (right side of row 1) ───────────────────────────────────
  const displayA = activeAchievements.filter(a => a.unlocked).slice(0, 5)
  if (displayA.length > 0) {
    const emojiSz = Math.round(W * 0.052)
    ctx.font         = `${emojiSz}px serif`
    ctx.textBaseline = 'middle'
    ctx.textAlign    = 'right'
    ctx.globalAlpha  = 1
    let ax = padR
    for (const ach of [...displayA].reverse()) {
      ctx.fillText(ach.emoji, ax, tagY + tagH / 2)
      ax -= emojiSz * 1.22
    }
    ctx.textAlign    = 'left'
    ctx.textBaseline = 'alphabetic'
  }

  // ── Row 2: Nº USP (left) + EACH · USP (right) ────────────────────────────
  const metaSz = Math.round(W * 0.030)
  if (user.nusp) {
    ctx.font         = `600 ${metaSz}px monospace`
    ctx.fillStyle    = accent
    ctx.globalAlpha  = 0.80
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(`Nº USP  ${user.nusp}`, padX, row2Y)
    ctx.globalAlpha  = 1
  }

  ctx.font         = `600 ${Math.round(W * 0.030)}px sans-serif`
  ctx.fillStyle    = ink
  ctx.globalAlpha  = 0.40
  ctx.textAlign    = 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('EACH · USP', padR, row2Y)
  ctx.textAlign    = 'left'
  ctx.globalAlpha  = 1

  // ── ID watermark ─────────────────────────────────────────────────────────
  ctx.font         = `400 ${Math.round(W * 0.022)}px monospace`
  ctx.fillStyle    = ink
  ctx.globalAlpha  = 0.09
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(user.id.replace(/-/g, '').slice(0, 8).toUpperCase(), padX, idY)
  ctx.globalAlpha  = 1
}


// ── LANDSCAPE card — Arc treatment (same shape system as portrait) ───────────
function drawLandscapeCard(
  canvas: HTMLCanvasElement,
  user: { full_name: string; email: string; nusp?: string; id: string; avatar_url?: string },
  avatarImg: HTMLImageElement | null,
  activeAchievements: Achievement[],
  area: string, language: string,
  entityBg: { color: string; name: string } | null,
  blobPalette: { hue: number; sat: number; lit: number } | null,
) {
  const W = 920, H = 580
  canvas.width = W * 2; canvas.height = H * 2
  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2)

  // Seed user hue (same as portrait for visual consistency)
  const hue = Math.floor(seededRng(user.id + '-hue')() * 360)
  const { sat, lit } = applyColorScheme(hue, pickColorScheme(user.id), seededRng(user.id + '-scheme-vals'))
  const rngBg = seededRng(user.id + '-bgv3')

  // Always solid cream base
  ctx.clearRect(0, 0, W, H)
  ctx.save()
  roundRect(ctx, 0, 0, W, H, 28)
  ctx.clip()

  const cardBase = '#FAFAF5'
  ctx.fillStyle  = cardBase
  ctx.fillRect(0, 0, W, H)

  // ── Left zone: shape fills left 42% ──────────────────────────────────────
  const leftW = Math.round(W * 0.42)

  // Pick shape same as portrait
  const shapeRng  = seededRng(String(hue) + String(Math.round(sat)) + String(Math.round(lit)) + 'shp')
  const shapeRng2 = seededRng(String(hue) + String(Math.round(sat)) + 'shp2')
  const shapes: BlobShape[] = ['blob','blob','leaf','arch','corner','hill','shield']
  const shape = shapes[Math.floor(shapeRng() * shapes.length)]

  // Colors — blob palette (entities or fallback)
  const blobH = blobPalette?.hue ?? hue
  const blobS = Math.max(blobPalette?.sat ?? sat, 42)
  const blobL = Math.min(Math.max(blobPalette?.lit ?? lit, 32), 64)
  const hi    = `hsl(${blobH}, ${Math.max(blobS - 18, 28)}%, ${Math.min(blobL + 26, 82)}%)`
  const mid   = `hsl(${blobH}, ${blobS}%, ${blobL}%)`
  const low   = `hsl(${(blobH + 18) % 360}, ${Math.min(blobS + 8, 88)}%, ${Math.max(blobL - 22, 20)}%)`

  // Draw shape clipped to left zone
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, leftW, H)
  ctx.clip()

  ctx.fillStyle = cardBase
  ctx.fillRect(0, 0, leftW, H)

  drawShape(ctx, leftW, H, shape, shapeRng2)
  const grad = ctx.createLinearGradient(leftW * 0.08, H * 0.04, leftW * 0.92, H * 0.96)
  grad.addColorStop(0,    hi)
  grad.addColorStop(0.42, mid)
  grad.addColorStop(1,    low)
  ctx.fillStyle = grad
  ctx.fill()

  // Grain (fillRect dots, respects clip)
  const grainRng = seededRng(String(hue) + 'grain2')
  ctx.globalAlpha = 0.05
  for (let i = 0; i < 1200; i++) {
    const gx = grainRng() * leftW, gy = grainRng() * H
    ctx.fillStyle = grainRng() > 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)'
    ctx.fillRect(gx, gy, 1.5, 1.5)
  }
  ctx.globalAlpha = 1

  // Sheen
  drawShape(ctx, leftW, H, shape, seededRng(String(hue) + String(Math.round(sat)) + 'shp2'))
  const sheenX = leftW * (0.18 + shapeRng() * 0.28)
  const sheenY = H * 0.08
  const sheenR = leftW * (0.44 + shapeRng() * 0.16)
  const sheen  = ctx.createRadialGradient(sheenX, sheenY, 0, sheenX, sheenY, sheenR)
  sheen.addColorStop(0,   'rgba(255,255,255,0.28)')
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.06)')
  sheen.addColorStop(1,   'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fill()

  ctx.restore() // end left zone clip

  // ── Avatar in left zone ───────────────────────────────────────────────────
  const avR  = Math.round(H * 0.13)
  const avCx = Math.round(leftW / 2)
  const avCy = Math.round(H * 0.44)
  const initials = user.full_name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase()
  drawAvatarCircle(ctx, avatarImg, initials, avCx, avCy, avR, hi, true)

  // Name below avatar in shape zone (white text on colored shape)
  const nameParts = user.full_name.trim().split(/\s+/)
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.globalAlpha  = 1

  let fnSz = Math.round(leftW * 0.096)
  ctx.font = `700 ${fnSz}px sans-serif`
  while (ctx.measureText(nameParts[0] ?? '').width > leftW * 0.82 && fnSz > 16) {
    fnSz -= 2; ctx.font = `700 ${fnSz}px sans-serif`
  }
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fillText(nameParts[0] ?? '', avCx, avCy + avR + fnSz * 0.95)

  if (nameParts.length > 1) {
    const lnSz = Math.round(fnSz * 0.70)
    ctx.font      = `400 ${lnSz}px sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.62)'
    ctx.fillText(nameParts.slice(1).join(' '), avCx, avCy + avR + fnSz * 0.95 + lnSz * 1.1)
  }

  // Institution micro-label above avatar
  ctx.font         = `500 ${Math.round(leftW * 0.036)}px monospace`
  ctx.fillStyle    = 'rgba(255,255,255,0.55)'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('EACH · USP', avCx, avCy - avR - H * 0.022)

  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  // ── Right zone: info panel ────────────────────────────────────────────────
  const rx     = leftW + W * 0.04
  const rW     = W - rx - W * 0.04
  const ink    = `hsl(${hue}, 55%, 12%)`
  const inkMid = `hsl(${hue}, 28%, 44%)`
  const inkF   = `hsl(${hue}, 18%, 60%)`
  const accent = `hsl(${hue}, ${Math.max(sat, 52)}%, ${Math.max(blobL - 8, 26)}%)`

  // Header label
  ctx.font         = `600 ${Math.round(W * 0.012)}px monospace`
  ctx.fillStyle    = accent
  ctx.globalAlpha  = 0.65
  ctx.fillText('CARTÃO DE ESTUDANTE', rx, H * 0.092)
  ctx.globalAlpha  = 1

  // Full name large
  let bigNameSz = Math.round(W * 0.048)
  ctx.font = `700 ${bigNameSz}px sans-serif`
  while (ctx.measureText(user.full_name).width > rW && bigNameSz > 20) {
    bigNameSz -= 2; ctx.font = `700 ${bigNameSz}px sans-serif`
  }
  ctx.fillStyle = ink
  ctx.fillText(user.full_name.length > 26 ? user.full_name.slice(0, 24) + '…' : user.full_name, rx, H * 0.092 + bigNameSz * 1.1)

  // Title tagline
  const trng   = seededRng(user.id + '-title')
  const title  = TITLES[Math.floor(trng() * TITLES.length)]
  const titleSz = Math.round(W * 0.020)
  ctx.font      = `500 ${titleSz}px monospace`
  ctx.fillStyle = inkMid
  ctx.fillText(title.toUpperCase(), rx, H * 0.092 + bigNameSz * 1.1 + titleSz * 1.5)

  // Divider
  const divY = H * 0.092 + bigNameSz * 1.1 + titleSz * 1.5 + H * 0.04
  ctx.strokeStyle = 'rgba(0,0,0,0.07)'
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(rx, divY)
  ctx.lineTo(W - W * 0.04, divY)
  ctx.stroke()

  // Fields 2×2 grid
  const fields: [string, string][] = [
    ['CURSO', 'Sistemas de Informação'],
    ['UNIDADE', 'EACH – USP'],
    ['ÁREA', area || '—'],
    ['LINGUAGEM', language || '—'],
  ]
  const col1X = rx, col2X = rx + rW * 0.52
  const fieldSzLabel = Math.round(W * 0.013)
  const fieldSzVal   = Math.round(W * 0.022)
  fields.forEach(([label, val], i) => {
    const col = i % 2 === 0 ? col1X : col2X
    const row = Math.floor(i / 2)
    const fy  = divY + H * 0.065 + row * H * 0.18
    ctx.font      = `500 ${fieldSzLabel}px monospace`
    ctx.fillStyle = accent
    ctx.globalAlpha = 0.65
    ctx.fillText(label, col, fy)
    ctx.globalAlpha = 1
    ctx.font      = `600 ${fieldSzVal}px sans-serif`
    ctx.fillStyle = ink
    const maxW = rW * 0.46
    ctx.fillText(val.length > 18 ? val.slice(0, 16) + '…' : val, col, fy + fieldSzVal * 1.2)
  })

  // Bottom strip: tag + nusp + achievements
  const stripY = H * 0.854
  const tagH   = H * 0.072

  // Arc tag [area | language]
  const tagSz    = Math.round(W * 0.018)
  ctx.font       = `600 ${tagSz}px monospace`
  const ll       = area || 'SI'
  const rl       = user.nusp ?? String(new Date().getFullYear())
  const llW      = ctx.measureText(ll).width
  const divW2    = Math.max(1, W * 0.0015)
  const tPad     = tagH * 0.42
  ctx.font       = `500 ${tagSz}px monospace`
  const rlW      = ctx.measureText(rl).width
  const tagTW    = tPad + llW + tPad + divW2 + tPad + rlW + tPad

  ctx.strokeStyle = accent
  ctx.lineWidth   = Math.max(1, W * 0.0016)
  roundRect(ctx, rx, stripY, tagTW, tagH, tagH * 0.35)
  ctx.stroke()

  // Plain vertical divider
  const dvX = rx + tPad + llW + tPad
  ctx.beginPath()
  ctx.moveTo(dvX, stripY + tagH * 0.18)
  ctx.lineTo(dvX, stripY + tagH * 0.82)
  ctx.strokeStyle = accent
  ctx.lineWidth   = divW2
  ctx.globalAlpha = 0.45
  ctx.stroke()
  ctx.globalAlpha = 1

  ctx.font         = `600 ${tagSz}px monospace`
  ctx.fillStyle    = accent
  ctx.textBaseline = 'middle'
  ctx.textAlign    = 'left'
  ctx.fillText(ll, rx + tPad, stripY + tagH / 2)
  ctx.font = `500 ${tagSz}px monospace`
  ctx.fillText(rl, dvX + divW2 + tPad, stripY + tagH / 2)
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'alphabetic'

  // Achievements — right
  const displayA = activeAchievements.filter(a => a.unlocked).slice(0, 5)
  if (displayA.length > 0) {
    const eSz = Math.round(W * 0.034)
    ctx.font         = `${eSz}px serif`
    ctx.textBaseline = 'middle'
    ctx.textAlign    = 'right'
    let ax = W - W * 0.04
    for (const ach of [...displayA].reverse()) {
      ctx.fillText(ach.emoji, ax, stripY + tagH / 2)
      ax -= eSz * 1.3
    }
    ctx.textAlign    = 'left'
    ctx.textBaseline = 'alphabetic'
  }

  // EACH label bottom-right
  ctx.font         = `600 ${Math.round(W * 0.016)}px sans-serif`
  ctx.fillStyle    = ink
  ctx.globalAlpha  = 0.35
  ctx.textAlign    = 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('EACH · USP', W - W * 0.04, H - H * 0.028)

  // ID watermark
  ctx.font         = `400 ${Math.round(W * 0.013)}px monospace`
  ctx.fillStyle    = ink
  ctx.globalAlpha  = 0.08
  ctx.textAlign    = 'left'
  ctx.fillText(user.id.replace(/-/g, '').slice(0, 8).toUpperCase(), rx, H - H * 0.028)
  ctx.globalAlpha  = 1
  ctx.textAlign    = 'left'

  // Entity border effect — on card edges only
  if (entityBg) {
    const [er, eg, eb] = hexToRgb(entityBg.color)
    const glow = ctx.createLinearGradient(0, 0, W, H)
    glow.addColorStop(0,   `rgba(${er},${eg},${eb},0.65)`)
    glow.addColorStop(0.5, `rgba(${er},${eg},${eb},0.38)`)
    glow.addColorStop(1,   `rgba(${er},${eg},${eb},0.65)`)
    ctx.strokeStyle = glow; ctx.lineWidth = 5; ctx.globalAlpha = 1
    roundRect(ctx, 3, 3, W - 6, H - 6, 26); ctx.stroke()
    ctx.strokeStyle = `rgba(${er},${eg},${eb},0.60)`; ctx.lineWidth = 1.5
    roundRect(ctx, 5, 5, W - 10, H - 10, 25); ctx.stroke()
  }

  // Outer border
  ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = 1; ctx.globalAlpha = 1
  roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 28); ctx.stroke()

  ctx.restore()
}


// ── PORTRAIT main draw ────────────────────────────────────────────────────────
function drawPortraitCard(
  canvas: HTMLCanvasElement,
  user: { full_name: string; email: string; nusp?: string; id: string; avatar_url?: string },
  avatarImg: HTMLImageElement | null,
  activeAchievements: Achievement[],
  area: string, language: string,
  entityBg: { color: string; name: string } | null,
  blobPalette: { hue: number; sat: number; lit: number } | null,
) {
  const W = 680, H = 920
  canvas.width = W*2; canvas.height = H*2
  const ctx = canvas.getContext('2d')!
  ctx.scale(2,2)

  const rngColor  = seededRng(user.id+'-hue')
  const hue       = Math.floor(rngColor()*360)
  const scheme    = pickColorScheme(user.id)
  const rngScheme = seededRng(user.id+'-scheme-vals')
  const { sat, lit } = applyColorScheme(hue, scheme, rngScheme)
  const style  = pickCardStyle(user.id)
  const rngBg  = seededRng(user.id+'-bgv3')
  const zoneH  = H * 0.57

  ctx.clearRect(0,0,W,H)
  ctx.save(); roundRect(ctx,0,0,W,H,32); ctx.clip()
  drawCardBackground(ctx,W,H,zoneH,style,hue,sat,lit,rngBg,entityBg,blobPalette)
  drawPortraitInfo(ctx,W,H,zoneH,user,avatarImg,activeAchievements,area,language,hue,sat,lit,entityBg,style)
  ctx.strokeStyle='rgba(0,0,0,0.08)'; ctx.lineWidth=1; ctx.globalAlpha=1
  roundRect(ctx,0.5,0.5,W-1,H-1,32); ctx.stroke()
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
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const canvasLandRef = useRef<HTMLCanvasElement>(null)
  const [cardVariant, setCardVariant]  = useState<'portrait'|'landscape'>('portrait')
  const [cardFlipped, setCardFlipped]  = useState(false)
  const [avatarImg,   setAvatarImg]    = useState<HTMLImageElement|null>(null)
  const fileInputRef=useRef<HTMLInputElement>(null)

  const [area,setAreaState]=useState<string>(()=>localStorage.getItem(STORAGE_KEYS.area)??"")
  const [language,setLanguageState]=useState<string>(()=>localStorage.getItem(STORAGE_KEYS.lang)??"")
  const [activeAchievIds,setActiveAchievIds]=useState<string[]>(()=>{
    try{return JSON.parse(localStorage.getItem(STORAGE_KEYS.achievements)??"[]")}catch{return[]}
  })
  const [entityBgId,setEntityBgId]=useState<string|null>(()=>localStorage.getItem(STORAGE_KEYS.cardEntity)??null)
  const [showAchievPicker,setShowAchievPicker]=useState(false)
  const [showCardFullscreen,setShowCardFullscreen]=useState(false)
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
    setEasterEggFound(!!localStorage.getItem(STORAGE_KEYS.easterFound))
    // Load server-persisted achievements (merge with localStorage)
    api.get('/users/me/achievements').then(({ data }) => {
      const serverIds: string[] = data.map((a: { id: string }) => a.id)
      const localIds: string[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.achievements) ?? "[]")
      const merged = Array.from(new Set([...localIds, ...serverIds]))
      if (merged.length !== localIds.length) {
        localStorage.setItem(STORAGE_KEYS.achievements, JSON.stringify(merged))
        setActiveAchievIds(merged)
      }
      // If easter egg found server-side, mark locally too
      if (serverIds.includes('easter_egg')) {
        localStorage.setItem('dasiboard-easter-found', '1')
        setEasterEggFound(true)
      }
    }).catch(() => {})
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

  // Social achievement data from localStorage
  const hasCreatedRoom = !!localStorage.getItem('dasiboard-room-created')
  const hasSharedNote  = !!localStorage.getItem('dasiboard-note-shared')
  const entityCount    = (() => { try { return JSON.parse(localStorage.getItem('dasiboard-entity-count') ?? '0') } catch { return 0 } })()

  const achievements=useMemo(()=>buildAchievements({
    hasBoards, hasMultipleBoards:hasMultiBoards, hasLanguage:!!language,
    hasArea:!!area, hasPassedSubject, hasFailedSubject, hasAvatar:!!user?.avatar_url,
    hasNusp:!!user?.nusp, eventCount, subjectCount, gradeCount,
    loginCount:1, easterEggFound,
    hasCreatedRoom, hasSharedNote, entityCount,
  }),[hasBoards,hasMultiBoards,language,area,hasPassedSubject,hasFailedSubject,user,eventCount,subjectCount,gradeCount,easterEggFound,hasCreatedRoom,hasSharedNote,entityCount])

  // Auto-persist newly unlocked achievements to server
  useEffect(() => {
    const unlocked = achievements.filter(a => a.unlocked).map(a => a.id)
    if (unlocked.length > 0) {
      api.post('/users/me/achievements', { ids: unlocked }).catch(() => {})
    }
  }, [achievements])

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

  const blobPalette = useMemo(() => {
    if (!user) return null
    return pickBlobPalette(user.id, entities, entityBgId)
  }, [user, entities, entityBgId])

  // Load avatar image whenever url changes
  useEffect(() => {
    if (!user?.avatar_url) { setAvatarImg(null); return }
    const img = new Image()
    img.onload  = () => setAvatarImg(img)
    img.onerror = () => setAvatarImg(null)
    img.src = user.avatar_url
  }, [user?.avatar_url])

  const draw = useCallback(() => {
    if (!user) return
    if (canvasRef.current)
        try { drawPortraitCard(canvasRef.current, user, avatarImg, activeAchievements, area, language, entityBgData, blobPalette) }
      catch(err) { console.error('Portrait draw:', err) }
      if (canvasLandRef.current)
        try { drawLandscapeCard(canvasLandRef.current, user, avatarImg, activeAchievements, area, language, entityBgData, blobPalette) }
      catch(err) { console.error('Landscape draw:', err) }
    }, [user, avatarImg, activeAchievements, area, language, entityBgData, blobPalette])

  useEffect(() => { draw() }, [draw])

  const handleAvatarChange=async(e:ChangeEvent<HTMLInputElement>)=>{
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
  const handleDownload = () => {
    if (!user) return
    const canvas = cardVariant === 'portrait' ? canvasRef.current : canvasLandRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.download = `dasiboard-${user.full_name.toLowerCase().replace(/\s+/g,'-')}-${cardVariant}.png`
    a.href = canvas.toDataURL('image/png', 1.0); a.click()
  }

  const saveAchievements=(ids:string[])=>{
    localStorage.setItem(STORAGE_KEYS.achievements,JSON.stringify(ids))
    setActiveAchievIds(ids)
  }
  // Sync newly unlocked achievements to server
  const persistUnlock = (id: string) => {
    api.post('/users/me/achievements', { ids: [id] }).catch(() => {})
  }
  const saveEntityBg=(id:string|null)=>{if(id)localStorage.setItem(STORAGE_KEYS.cardEntity,id);else localStorage.removeItem(STORAGE_KEYS.cardEntity);setEntityBgId(id)}
  const saveArea=(v:string)=>{localStorage.setItem(STORAGE_KEYS.area,v);setAreaState(v)}
  const saveLang=(v:string)=>{localStorage.setItem(STORAGE_KEYS.lang,v);setLanguageState(v)}

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
    <div className="px-4 py-5 sm:px-6 md:px-8 md:py-7 max-w-5xl mx-auto w-full page-mobile">
      {/* Mobile card fullscreen overlay */}
      {showCardFullscreen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center lg:hidden"
             style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}
             onClick={() => setShowCardFullscreen(false)}>
          <div className="w-full px-4" style={{ maxWidth: cardVariant === 'portrait' ? 340 : 560 }}
               onClick={e => e.stopPropagation()}>
            <div style={{
              position: 'relative', width: '100%',
              paddingBottom: cardVariant === 'portrait' ? '135.3%' : '63.04%',
              borderRadius: 28, overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            }}>
              <canvas ref={cardVariant === 'portrait' ? canvasRef : canvasLandRef}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                               borderRadius: 28 }} />
            </div>
            <div className="flex gap-3 mt-4 justify-center">
              <button onClick={handleDownload}
                      className="btn-primary text-sm px-5 py-2.5 gap-2">
                <Download size={15} /> Baixar card
              </button>
              <button onClick={() => setShowCardFullscreen(false)}
                      className="btn-ghost text-sm px-5 py-2.5 gap-2">
                <X size={15} /> Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {showAchievPicker&&<AchievementPicker achievements={achievements} selected={activeAchievIds} onSave={saveAchievements} onClose={()=>setShowAchievPicker(false)}/>}
      {showEntityPicker&&<EntityBgPicker entities={entities} currentEntityId={entityBgId} onSave={saveEntityBg} onClose={()=>setShowEntityPicker(false)}/>}

      {/* Header */}
      <div className="flex items-center gap-5 mb-6 animate-in">
        <div className="relative shrink-0">
          <div className="w-28 h-28 rounded-2xl p-0.5" style={{background:"var(--gradient-btn)",boxShadow:"0 6px 32px var(--accent-glow), 0 0 0 1px var(--accent-1)"}}>
            <div className="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center"
                 style={{background:user.avatar_url?"transparent":"var(--bg-card)"}}>
              {user.avatar_url?<img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover"/>
                :<span className="text-3xl font-bold text-white font-display">{initials}</span>}
            </div>
          </div>
          {avatarLoading&&<div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{background:"rgba(0,0,0,0.5)"}}><RefreshCw size={16} className="animate-spin text-white"/></div>}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl md:text-3xl font-bold truncate tracking-tight" style={{color:"var(--text-primary)"}}>{user.full_name}</h1>
          <p className="text-sm mt-0.5" style={{color:"var(--accent-3)"}}>{userTitle}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{background:"rgba(245,158,11,0.12)",color:"#f59e0b",border:"1px solid rgba(245,158,11,0.25)"}}>
              <Trophy size={11}/> {unlockedCount} conquistas
            </span>
            {entityBgData&&<span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{background:entityBgData.color+"18",color:entityBgData.color,border:`1px solid ${entityBgData.color}30`}}>{entityBgData.name}</span>}
          </div>
        </div>
      </div>

      {/* ── Card section — flip + variant ────────────────────────────── */}
      <div className="mb-5 animate-in">

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1 p-0.5 rounded-xl" style={{background:'var(--bg-elevated)',border:'1px solid var(--border)'}}>
            {(['portrait','landscape'] as const).map(v=>(
              <button key={v} onClick={()=>{setCardVariant(v);setCardFlipped(false)}}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                      style={{
                        background:cardVariant===v?'var(--bg-card)':'transparent',
                        color:cardVariant===v?'var(--text-primary)':'var(--text-muted)',
                        boxShadow:cardVariant===v?'0 1px 4px rgba(0,0,0,0.12)':'none',
                      }}>
                {v==='portrait'?'↕ Retrato':'↔ Paisagem'}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button onClick={()=>setShowEntityPicker(true)} className="btn-ghost text-xs py-1.5 px-2.5 gap-1.5">
              <ImagePlus size={12}/><span className="hidden sm:inline">Fundo</span>
            </button>
            <button onClick={()=>setShowAchievPicker(true)} className="btn-ghost text-xs py-1.5 px-2.5 gap-1.5">
              <Trophy size={12}/><span className="hidden sm:inline">Conquistas</span>
            </button>
            <button onClick={()=>setCardFlipped(f=>!f)} className="btn-ghost text-xs py-1.5 px-2.5 gap-1.5"
                    title="Virar cartão">
              <RotateCw size={12}/><span className="hidden sm:inline">Virar</span>
            </button>
            <button onClick={draw} className="btn-ghost text-xs py-1.5 px-2.5"><RefreshCw size={12}/></button>
            <button onClick={handleDownload} className="btn-primary text-xs py-1.5 px-2.5 gap-1.5">
              <Download size={12}/><span className="hidden sm:inline">PNG</span>
            </button>
          </div>
        </div>

        {/* Card with flip animation */}
        <div className="flex justify-center" style={{perspective:1400}}>
          <div style={{
            width:'100%',
            maxWidth: cardVariant==='portrait' ? 380 : '100%',
            position:'relative',
            transformStyle:'preserve-3d',
            transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition:'transform 0.65s cubic-bezier(0.4,0.2,0.2,1)',
          }}>

            {/* FRONT — portrait or landscape canvas */}
            <div style={{
              position:'relative', width:'100%',
              paddingBottom: cardVariant==='portrait' ? '135.3%' : '63.04%',
              borderRadius:28, overflow:'hidden',
              boxShadow:'0 28px 72px rgba(0,0,0,0.28),0 8px 20px rgba(0,0,0,0.16)',
              backfaceVisibility:'hidden',
              cursor: 'pointer',
            }}
            onClick={() => { if (window.innerWidth < 1024) setShowCardFullscreen(true) }}>
              {/* Portrait canvas */}
              <canvas ref={canvasRef} onClick={handleDownload} title="Clique para baixar"
                      className="profile-card-canvas"
                      style={{
                        position:'absolute', inset:0, width:'100%', height:'100%',
                        display: cardVariant==='portrait' ? 'block' : 'none',
                        cursor:'pointer', borderRadius:28,
                      }}/>
              {/* Landscape canvas */}
              <canvas ref={canvasLandRef} onClick={handleDownload} title="Clique para baixar"
                      className="profile-card-canvas"
                      style={{
                        position:'absolute', inset:0, width:'100%', height:'100%',
                        display: cardVariant==='landscape' ? 'block' : 'none',
                        cursor:'pointer', borderRadius:28,
                      }}/>
            </div>

            {/* BACK — stats & achievements (rotated 180°) */}
            <div style={{
              position:'absolute', inset:0,
              backfaceVisibility:'hidden',
              transform:'rotateY(180deg)',
              borderRadius:28, overflow:'hidden',
              boxShadow:'0 28px 72px rgba(0,0,0,0.28)',
              background:'var(--bg-card)',
              border:'1px solid var(--border)',
              display:'flex', flexDirection:'column',
            }}>
              {/* Back header strip in user color */}
              <div style={{
                height:8, flexShrink:0,
                background:`hsl(${Math.floor(seededRng(user.id+'-hue')()*360)},70%,52%)`,
              }}/>

              <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto">
                {/* User mini-header */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                       style={{background:'var(--bg-elevated)',border:'2px solid var(--border)'}}>
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover"/>
                      : <span className="font-bold text-base" style={{color:'var(--text-muted)'}}>{initials}</span>
                    }
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm" style={{color:'var(--text-primary)'}}>{user.full_name}</p>
                    <p className="text-[10px] font-mono" style={{color:'var(--text-muted)'}}>
                      {user.nusp ? `#${user.nusp}  ·  ` : ''}{user.email}
                    </p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {emoji:'🔥', val:stats.streak,           label:'dias seguidos'},
                    {emoji:'⚡', val:stats.flashcardsAnswered, label:'flashcards'},
                    {emoji:'🍅', val:Math.floor(stats.pomodoroMinutes/25), label:'pomodoros'},
                    {emoji:'📝', val:stats.notesCreated,      label:'notas'},
                    {emoji:'🎯', val:stats.flashcardsAnswered>0?`${Math.round((stats.flashcardsCorrect/stats.flashcardsAnswered)*100)}%`:'—', label:'acertos'},
                    {emoji:'⏱️', val:`${Math.floor(stats.pomodoroMinutes/60)}h`, label:'de estudo'},
                  ].map(({emoji,val,label})=>(
                    <div key={label} className="rounded-xl p-2.5 text-center"
                         style={{background:'var(--bg-elevated)',border:'1px solid var(--border)'}}>
                      <p className="text-base">{emoji}</p>
                      <p className="font-display font-bold text-sm mt-0.5" style={{color:'var(--text-primary)'}}>{val}</p>
                      <p className="text-[9px]" style={{color:'var(--text-muted)'}}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* Achievements strip */}
                {activeAchievements.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{color:'var(--text-muted)'}}>
                      Conquistas no cartão
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeAchievements.filter(a=>a.unlocked).map(a=>(
                        <div key={a.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold"
                             style={{background:a.color+'18',border:`1px solid ${a.color}40`,color:a.color}}>
                          <span>{a.emoji}</span><span>{a.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* QR decorative placeholder */}
                <div className="flex items-center gap-3 mt-auto pt-2" style={{borderTop:'1px solid var(--border)'}}>
                  <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                       style={{background:'var(--bg-elevated)',border:'1px solid var(--border)'}}>
                    {/* Decorative QR pattern in CSS */}
                    <svg width="40" height="40" viewBox="0 0 9 9">
                      <rect x="0" y="0" width="3" height="3" fill="currentColor" style={{color:'var(--text-secondary)'}}/>
                      <rect x="1" y="1" width="1" height="1" fill="var(--bg-elevated)"/>
                      <rect x="6" y="0" width="3" height="3" fill="currentColor" style={{color:'var(--text-secondary)'}}/>
                      <rect x="7" y="1" width="1" height="1" fill="var(--bg-elevated)"/>
                      <rect x="0" y="6" width="3" height="3" fill="currentColor" style={{color:'var(--text-secondary)'}}/>
                      <rect x="1" y="7" width="1" height="1" fill="var(--bg-elevated)"/>
                      {[3,5,4,6,3,7,5,6,4,4,6,5,5,8,7,4,8,6,3,3].map((v,i)=>(
                        i%2===0 ? null : <rect key={i} x={[3,5,4,6,3,7,5,6,4,4,6,5,5,8,7,4,8,6,3,3][i-1]} y={v} width="1" height="1" fill="currentColor" style={{color:'var(--text-secondary)'}}/>
                      ))}
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold" style={{color:'var(--text-primary)'}}>DaSIboard · EACH · USP</p>
                    <p className="text-[9px] font-mono mt-0.5" style={{color:'var(--text-muted)'}}>
                      {user.id.replace(/-/g,'').slice(0,16).toUpperCase()}
                    </p>
                  </div>
                  <button onClick={()=>setCardFlipped(false)} className="ml-auto btn-ghost text-xs py-1 px-2.5 gap-1">
                    <RotateCw size={10}/> Voltar
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        <p className="text-[10px] text-center mt-3" style={{color:'var(--text-muted)'}}>
          {cardFlipped ? 'Verso do cartão — estatísticas e conquistas'
            : `${cardVariant === 'portrait' ? 'Retrato' : 'Paisagem'} · clique para baixar · vire para ver o verso`}
        </p>
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
                {(Object.entries(stats.highScores) as [string, number][]).sort((x,y)=>y[1]-x[1]).slice(0,5).map(([sub,hs])=>(
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
