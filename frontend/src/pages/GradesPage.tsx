import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Plus, Trash2, BookOpen, TrendingUp, ChevronDown, ChevronRight,
  Award, AlertTriangle, X, Minus, Save, CheckCircle2, Clock, Lock,
  GitBranch, LayoutGrid, List,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/utils/api'
import clsx from 'clsx'

// ─────────────────────── Types ───────────────────────────────────────────────
interface Grade   { id: string; label: string; value: number; weight: number; max_value: number }
interface Subject { id: string; code: string; name: string; professor?: string; semester: string; color: string; grades: Grade[]; total_classes: number; attended: number }
type FluxoStatus = 'locked'|'available'|'in-progress'|'passed'|'failed'|'weak-passed'
interface FluxoState { code: string; status: FluxoStatus; grade?: number; absences?: number; totalClasses?: number }
type PrereqRule = { code: string; weak?: boolean }
interface SubjectDef { code: string; name: string; abbr: string; semester: number; credits: number; optional?: boolean; prereqs: PrereqRule[]; color?: string }

const PASS_GRADE = 5, WEAK_PASS_GRADE = 3
const SEMESTERS = [1,2,3,4,5,6,7,8]

// ─────────────────────── Curriculum data ─────────────────────────────────────
const SUBJECTS: SubjectDef[] = [
  { code:'ACH2001', name:'Introdução à Programação', abbr:'IP', semester:1, credits:4, prereqs:[], color:'#6366f1' },
  { code:'ACH2014', name:'Fundamentos de Sistemas de Informação', abbr:'FSI', semester:1, credits:4, prereqs:[], color:'#8b5cf6' },
  { code:'ACH0021', name:'Tratamento e Análise de Dados', abbr:'TADI', semester:1, credits:2, prereqs:[], color:'#a78bfa' },
  { code:'ACH0041', name:'Resolução de Problemas I', abbr:'RP I', semester:1, credits:2, prereqs:[], color:'#c4b5fd' },
  { code:'ACH2011', name:'Cálculo I', abbr:'CALC I', semester:1, credits:4, prereqs:[], color:'#06b6d4' },
  { code:'ACH0141', name:'SMD – Estado e Sociedade', abbr:'SMD-ES', semester:1, credits:2, optional:true, prereqs:[], color:'#94a3b8' },
  { code:'ACH0151', name:'SMD – Cultura Digital', abbr:'SMD-CD', semester:1, credits:2, optional:true, prereqs:[], color:'#94a3b8' },
  { code:'ACH0161', name:'SMD – Direitos Humanos', abbr:'SMD-DH', semester:1, credits:2, optional:true, prereqs:[], color:'#94a3b8' },
  { code:'ACH2002', name:'Introdução à Análise de Algoritmos', abbr:'IAA', semester:2, credits:4, prereqs:[{code:'ACH2001'}], color:'#6366f1' },
  { code:'ACH2012', name:'Cálculo II', abbr:'CALC II', semester:2, credits:4, prereqs:[{code:'ACH2011'}], color:'#06b6d4' },
  { code:'ACH2013', name:'Matemática Discreta I', abbr:'MD I', semester:2, credits:4, prereqs:[], color:'#0ea5e9' },
  { code:'ACH2023', name:'Algoritmos e Estruturas de Dados I', abbr:'AED I', semester:2, credits:4, prereqs:[{code:'ACH2001'}], color:'#6366f1' },
  { code:'ACH2033', name:'Matrizes, Vetores e Geometria Analítica', abbr:'MVGA', semester:2, credits:4, prereqs:[], color:'#0ea5e9' },
  { code:'ACH2003', name:'Computação Orientada a Objetos', abbr:'COO', semester:3, credits:4, prereqs:[{code:'ACH2002'}], color:'#6366f1' },
  { code:'ACH2024', name:'Algoritmos e Estruturas de Dados II', abbr:'AED II', semester:3, credits:4, prereqs:[{code:'ACH2023'}], color:'#6366f1' },
  { code:'ACH2034', name:'Organização e Arquitetura de Computadores I', abbr:'OAC I', semester:3, credits:4, prereqs:[{code:'ACH2013'}], color:'#0ea5e9' },
  { code:'ACH2063', name:'Introdução à Administração e Economia', abbr:'IAEC', semester:3, credits:4, prereqs:[], color:'#10b981' },
  { code:'ACH2053', name:'Introdução à Estatística', abbr:'IE', semester:3, credits:4, prereqs:[{code:'ACH2012', weak:true}], color:'#06b6d4' },
  { code:'ACH2107', name:'Desafios de Programação I', abbr:'DESI', semester:3, credits:2, optional:true, prereqs:[{code:'ACH2023', weak:true}], color:'#f59e0b' },
  { code:'ACH2004', name:'Banco de Dados I', abbr:'BD I', semester:4, credits:4, prereqs:[{code:'ACH2003'}], color:'#8b5cf6' },
  { code:'ACH2036', name:'Métodos Quantitativos Multivariados', abbr:'MQAM', semester:4, credits:4, prereqs:[{code:'ACH2053', weak:true}], color:'#06b6d4' },
  { code:'ACH2055', name:'Organização e Arq. de Computadores II', abbr:'OAC II', semester:4, credits:4, prereqs:[{code:'ACH2034'}], color:'#0ea5e9' },
  { code:'ACH2026', name:'Redes de Computadores', abbr:'RC', semester:4, credits:4, prereqs:[{code:'ACH2034', weak:true}], color:'#0ea5e9' },
  { code:'ACH2044', name:'Sistemas Operacionais', abbr:'SO', semester:4, credits:4, prereqs:[{code:'ACH2024'}], color:'#6366f1' },
  { code:'ACH2005', name:'Análise, Projeto e IHC', abbr:'IHC', semester:5, credits:4, prereqs:[{code:'ACH2003'}], color:'#ec4899' },
  { code:'ACH2016', name:'Inteligência Artificial', abbr:'IA', semester:5, credits:4, prereqs:[{code:'ACH2024'},{code:'ACH2053', weak:true}], color:'#8b5cf6' },
  { code:'ACH2025', name:'Banco de Dados II', abbr:'BD II', semester:5, credits:4, prereqs:[{code:'ACH2004'}], color:'#8b5cf6' },
  { code:'ACH2043', name:'Introdução à Teoria da Computação', abbr:'ITC', semester:5, credits:4, prereqs:[{code:'ACH2013'}], color:'#0ea5e9' },
  { code:'ACH2147', name:'Desenvolvimento de Sistemas Distribuídos', abbr:'DSID', semester:5, credits:4, prereqs:[{code:'ACH2004', weak:true},{code:'ACH2026', weak:true}], color:'#10b981' },
  { code:'ACH2006', name:'Engenharia de Sistemas de Informação I', abbr:'ESI I', semester:6, credits:4, prereqs:[{code:'ACH2005'}], color:'#ec4899' },
  { code:'ACH0042', name:'Resolução de Problemas II', abbr:'RP II', semester:6, credits:2, prereqs:[{code:'ACH0041'}], color:'#c4b5fd' },
  { code:'ACH2027', name:'Gestão de Projetos de TI', abbr:'GPTI', semester:6, credits:4, prereqs:[{code:'ACH2063', weak:true}], color:'#10b981' },
  { code:'ACH2008', name:'Empreendedorismo em Informática', abbr:'EI', semester:6, credits:4, prereqs:[], color:'#f59e0b' },
  { code:'ACH0102', name:'Psicologia, Educação e Temas Contemporâneos', abbr:'PETC', semester:6, credits:2, optional:true, prereqs:[], color:'#94a3b8' },
  { code:'MAC0216', name:'Técnicas de Programação I', abbr:'TP I', semester:6, credits:4, optional:true, prereqs:[{code:'ACH2024', weak:true}], color:'#f59e0b' },
  { code:'ACH2017', name:'Projeto Supervisionado de Graduação I', abbr:'PSG I', semester:7, credits:4, prereqs:[{code:'ACH2006'}], color:'#ef4444' },
  { code:'ACH2007', name:'Engenharia de Sistemas de Informação II', abbr:'ESI II', semester:7, credits:4, prereqs:[{code:'ACH2006'}], color:'#ec4899' },
  { code:'ACH2076', name:'Segurança da Informação', abbr:'SEG', semester:7, credits:4, optional:true, prereqs:[{code:'ACH2044', weak:true}], color:'#ef4444' },
  { code:'ACH2077', name:'Soluções Web com Software Livre', abbr:'WSL', semester:7, credits:4, optional:true, prereqs:[{code:'ACH2147', weak:true}], color:'#10b981' },
  { code:'ACH2117', name:'Computação Gráfica', abbr:'CG', semester:7, credits:4, optional:true, prereqs:[{code:'ACH2024', weak:true}], color:'#8b5cf6' },
  { code:'ACH2177', name:'Introdução à Ciência de Dados', abbr:'ICD', semester:7, credits:4, optional:true, prereqs:[{code:'ACH2016', weak:true}], color:'#8b5cf6' },
  { code:'ACH2157', name:'Computação Física e Aplicações', abbr:'CFA', semester:7, credits:4, optional:true, prereqs:[{code:'ACH2044', weak:true}], color:'#f59e0b' },
  { code:'MAC0471', name:'Desenvolvimento para Web', abbr:'DEV WEB', semester:7, credits:4, optional:true, prereqs:[{code:'ACH2147', weak:true}], color:'#10b981' },
  { code:'ACH2018', name:'Projeto Supervisionado de Graduação II', abbr:'PSG II', semester:8, credits:4, prereqs:[{code:'ACH2017'}], color:'#ef4444' },
  { code:'ACH2028', name:'Qualidade de Software', abbr:'QS', semester:8, credits:4, optional:true, prereqs:[{code:'ACH2007', weak:true}], color:'#ec4899' },
  { code:'ACH2038', name:'Laboratório de Redes', abbr:'LAB RC', semester:8, credits:4, optional:true, prereqs:[{code:'ACH2026'}], color:'#0ea5e9' },
  { code:'ACH2086', name:'Fundamentos de Sistemas Hipermídia e Web', abbr:'WEB', semester:8, credits:4, optional:true, prereqs:[{code:'ACH2147', weak:true}], color:'#10b981' },
  { code:'ACH2187', name:'Mineração de Dados', abbr:'MIN', semester:8, credits:4, optional:true, prereqs:[{code:'ACH2177', weak:true}], color:'#8b5cf6' },
  { code:'ACH2096', name:'Laboratório de Sistemas Operacionais', abbr:'LAB SO', semester:8, credits:4, optional:true, prereqs:[{code:'ACH2044'}], color:'#6366f1' },
]

function getFluxoStatus(code: string, states: Record<string, FluxoState>): FluxoStatus {
  const st = states[code]
  if (st?.status && st.status !== 'locked' && st.status !== 'available') return st.status
  const def = SUBJECTS.find(s => s.code === code)
  if (!def) return 'locked'
  for (const p of def.prereqs) {
    const ps = states[p.code]
    if (!p.weak) { if (ps?.status !== 'passed' && ps?.status !== 'weak-passed') return 'locked' }
    else {
      if (ps?.status === 'passed' || ps?.status === 'weak-passed') continue
      if ((ps?.status === 'failed' || ps?.status === 'in-progress') && (ps?.grade ?? 0) >= WEAK_PASS_GRADE) continue
      return 'locked'
    }
  }
  return st?.status ?? 'available'
}

function weightedAvg(grades: Grade[]): number | null {
  if (!grades.length) return null
  const tw = grades.reduce((a, g) => a + g.weight, 0)
  if (!tw) return null
  return grades.reduce((a, g) => a + (g.value / g.max_value) * 10 * g.weight, 0) / tw
}

// ─────────────────────── Attendance Widget ───────────────────────────────────
function AttendanceWidget({ subject, onUpdate }: {
  subject: Subject; onUpdate: (id: string, total: number, att: number) => void
}) {
  const absent = subject.total_classes - subject.attended
  const maxAbs = Math.floor(subject.total_classes * 0.3)
  const pct = subject.total_classes > 0 ? (absent / subject.total_classes) * 100 : 0
  const remaining = Math.max(0, maxAbs - absent)
  const danger = pct >= 25
  const ff = pct >= 30
  const color = ff ? '#ef4444' : danger ? '#f59e0b' : '#22c55e'
  const circumference = 2 * Math.PI * 14
  const dashOffset = circumference - (Math.min(pct, 100) / 100) * circumference
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" strokeWidth="3" />
          <circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="3"
                  strokeDasharray={circumference} strokeDashoffset={dashOffset}
                  strokeLinecap="round" transform="rotate(-90 18 18)" />
          <text x="18" y="22" textAnchor="middle" fontSize="8" fontWeight="bold" fill={color}>{absent}</text>
        </svg>
        <div>
          <p className="text-[10px] font-semibold" style={{ color }}>
            {ff ? '⚠️ FF' : `${absent} falta${absent !== 1 ? 's' : ''}`}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {remaining > 0 ? `${remaining} restante${remaining !== 1 ? 's' : ''}` : 'limite atingido'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => onUpdate(subject.id, subject.total_classes, subject.attended - 1)} disabled={absent <= 0}><Minus size={10}/></button>
        <span className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>{subject.attended}/{subject.total_classes}</span>
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => onUpdate(subject.id, subject.total_classes, subject.attended + 1)} disabled={subject.attended >= subject.total_classes}><Plus size={10}/></button>
      </div>
    </div>
  )
}

// ─────────────────────── FluxoPopup (unified info modal) ─────────────────────
function FluxoPopup({ def, fluxoStates, subject, onSave, onClose }: {
  def: SubjectDef; fluxoStates: Record<string, FluxoState>
  subject?: Subject   // linked API subject if any
  onSave: (s: FluxoState) => void; onClose: () => void
}) {
  const state = fluxoStates[def.code]
  const [grade,        setGrade]       = useState(state?.grade !== undefined ? String(state.grade) : '')
  const [absences,     setAbsences]    = useState(state?.absences !== undefined ? String(state.absences) : '0')
  const [totalClasses, setTotalCls]    = useState(state?.totalClasses !== undefined ? String(state.totalClasses) : '')

  const gradeNum = parseFloat(grade)
  const absNum   = parseInt(absences) || 0
  const totalNum = parseInt(totalClasses) || 0
  const failedByAbs = totalNum > 0 && (absNum / totalNum) * 100 >= 30
  const autoStatus = (): FluxoStatus => {
    if (failedByAbs) return 'failed'
    if (!isNaN(gradeNum)) {
      if (gradeNum >= PASS_GRADE)      return 'passed'
      if (gradeNum >= WEAK_PASS_GRADE) return 'weak-passed'
      return 'failed'
    }
    return 'in-progress'
  }

  const prereqs = def.prereqs.map(p => {
    const pd = SUBJECTS.find(s => s.code === p.code)
    return { ...p, name: pd?.name ?? p.code, status: getFluxoStatus(p.code, fluxoStates) }
  })
  const unlocks = SUBJECTS.filter(s => s.prereqs.some(p => p.code === def.code))
  const apiAvg  = subject ? weightedAvg(subject.grades) : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
         style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-y-auto animate-in"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '92dvh', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }}/>
        </div>
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded font-bold"
                    style={{ background: (def.color ?? '#6366f1') + '22', color: def.color ?? '#6366f1' }}>
                {def.code}
              </span>
              <span className="text-xs px-2 py-0.5 rounded"
                    style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                {def.semester}º sem · {def.credits} cr
              </span>
              {def.optional && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)' }}>optativa</span>}
            </div>
            <h3 className="font-display font-bold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>{def.name}</h3>
            {subject?.professor && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>👤 {subject.professor}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}><X size={15}/></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* API grades summary — if linked */}
          {subject && subject.grades.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>NOTAS REGISTRADAS</span>
                {apiAvg !== null && (
                  <span className="font-display font-bold text-sm" style={{ color: apiAvg >= 5 ? '#22c55e' : '#ef4444' }}>
                    {apiAvg.toFixed(1)} média
                  </span>
                )}
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {subject.grades.map(g => {
                  const pct = Math.min(100, (g.value / g.max_value) * 100)
                  const gc = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
                  return (
                    <div key={g.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{g.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>×{g.weight}</span>
                      <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: gc }}/>
                      </div>
                      <span className="font-mono text-sm shrink-0" style={{ color: 'var(--text-primary)' }}>
                        {g.value}<span style={{ color: 'var(--text-muted)' }}>/{g.max_value}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Prereqs */}
          {prereqs.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Requisitos</p>
              <div className="flex flex-wrap gap-1.5">
                {prereqs.map(p => (
                  <span key={p.code} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                        style={{ background: p.status === 'passed' ? 'rgba(34,197,94,0.12)' : p.status === 'weak-passed' ? 'rgba(245,158,11,0.12)' : 'var(--bg-elevated)', border: `1px solid ${p.status === 'passed' ? 'rgba(34,197,94,0.3)' : p.status === 'weak-passed' ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`, color: 'var(--text-primary)' }}>
                    {p.status === 'passed' ? '✅' : p.status === 'weak-passed' ? '⚡' : '🔒'}
                    <span className="font-mono text-[10px]">{p.code}</span>
                    {p.weak && <span className="text-[9px] opacity-60">fraco</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Unlocks */}
          {unlocks.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Desbloqueia</p>
              <div className="flex flex-wrap gap-1.5">
                {unlocks.slice(0,8).map(u => (
                  <span key={u.code} className="text-[10px] px-2 py-1 rounded-lg font-mono"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{u.code}</span>
                ))}
                {unlocks.length > 8 && <span className="text-[10px] px-2 py-1" style={{ color: 'var(--text-muted)' }}>+{unlocks.length-8}</span>}
              </div>
            </div>
          )}

          {/* Fluxo grade input */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Status no fluxograma</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Nota final (0–10)</label>
                <input type="number" min="0" max="10" step="0.1" className="input text-sm"
                       placeholder="Ex: 7.5" value={grade} onChange={e => setGrade(e.target.value)}/>
              </div>
              <div>
                <label className="label">Total de aulas</label>
                <input type="number" min="0" className="input text-sm" value={totalClasses} onChange={e => setTotalCls(e.target.value)}/>
              </div>
              <div>
                <label className="label">Faltas</label>
                <div className="flex items-center gap-1">
                  <button className="btn-ghost p-2" onClick={() => setAbsences(v => String(Math.max(0,(parseInt(v)||0)-1)))}><Minus size={12}/></button>
                  <input type="number" min="0" className="input text-sm text-center flex-1" value={absences} onChange={e => setAbsences(e.target.value)}/>
                  <button className="btn-ghost p-2" onClick={() => setAbsences(v => String((parseInt(v)||0)+1))}><Plus size={12}/></button>
                </div>
              </div>
            </div>

            {grade !== '' && (
              <div className="mt-3 px-3 py-2 rounded-xl text-sm font-semibold text-center"
                   style={{ background: failedByAbs || parseFloat(grade) < WEAK_PASS_GRADE ? 'rgba(239,68,68,0.12)' : parseFloat(grade) < PASS_GRADE ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)', color: failedByAbs || parseFloat(grade) < WEAK_PASS_GRADE ? '#ef4444' : parseFloat(grade) < PASS_GRADE ? '#f59e0b' : '#22c55e' }}>
                {failedByAbs ? '⚠️ Reprovado por faltas' : parseFloat(grade) >= PASS_GRADE ? '✅ Aprovado' : parseFloat(grade) >= WEAK_PASS_GRADE ? '⚡ Aprovado (req. fraco)' : '❌ Reprovado'}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button className="btn-primary flex-1 justify-center" onClick={() => {
                onSave({ code: def.code, status: autoStatus(), grade: isNaN(gradeNum) ? undefined : gradeNum, absences: absNum, totalClasses: totalNum })
                onClose()
              }}><Save size={13}/> Salvar no fluxograma</button>
              {state?.status && <button className="btn-ghost" onClick={() => { onSave({ code: def.code, status: 'available' }); onClose() }}>Limpar</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────── Subject Card ────────────────────────────────────────
function SubjectCard({ subject, fluxoDef, fluxoStates, onDelete, onAddGrade, onDeleteGrade, onUpdateAttendance, onOpenFluxo }: {
  subject: Subject; fluxoDef?: SubjectDef; fluxoStates: Record<string, FluxoState>
  onDelete: () => void
  onAddGrade: (id: string, g: Partial<Grade>) => void
  onDeleteGrade: (sid: string, gid: string) => void
  onUpdateAttendance: (id: string, total: number, att: number) => void
  onOpenFluxo: (def: SubjectDef) => void
}) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ label: '', value: '', weight: '1', max_value: '10' })
  const avg = weightedAvg(subject.grades)
  const passFail = avg === null ? null : avg >= 5
  const absent = subject.total_classes - subject.attended
  const failedByAbs = absent > Math.floor(subject.total_classes * 0.3) && subject.total_classes > 0
  const fluxoStatus = fluxoDef ? getFluxoStatus(fluxoDef.code, fluxoStates) : null

  const submit = () => {
    if (!form.label || !form.value) return
    onAddGrade(subject.id, { label: form.label, value: parseFloat(form.value), weight: parseFloat(form.weight), max_value: parseFloat(form.max_value) })
    setForm({ label: '', value: '', weight: '1', max_value: '10' }); setAdding(false)
  }

  return (
    <div className="card transition-all" style={{ borderLeft: `3px solid ${subject.color}` }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: subject.color + '22', color: subject.color }}>{subject.code}</span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{subject.semester}</span>
            {failedByAbs && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>⚠️ FF</span>}
            {/* Fluxo status badge — shows the fluxogram status inline */}
            {fluxoStatus && fluxoStatus !== 'available' && fluxoStatus !== 'locked' && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{
                background: fluxoStatus === 'passed' ? 'rgba(34,197,94,0.12)' : fluxoStatus === 'weak-passed' ? 'rgba(245,158,11,0.12)' : fluxoStatus === 'failed' ? 'rgba(239,68,68,0.12)' : 'var(--accent-soft)',
                color: fluxoStatus === 'passed' ? '#22c55e' : fluxoStatus === 'weak-passed' ? '#f59e0b' : fluxoStatus === 'failed' ? '#ef4444' : 'var(--accent-3)',
                border: `1px solid ${fluxoStatus === 'passed' ? 'rgba(34,197,94,0.3)' : fluxoStatus === 'weak-passed' ? 'rgba(245,158,11,0.3)' : fluxoStatus === 'failed' ? 'rgba(239,68,68,0.3)' : 'var(--accent-1)'}`,
              }}>
                {fluxoStatus === 'passed' ? '✅ Aprovado' : fluxoStatus === 'weak-passed' ? '⚡ Req. fraco' : fluxoStatus === 'failed' ? '❌ Reprovado' : '⏳ Em curso'}
              </span>
            )}
          </div>
          <h3 className="font-display font-bold truncate" style={{ color: 'var(--text-primary)' }}>{subject.name}</h3>
          {subject.professor && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>👤 {subject.professor}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="px-2.5 py-2 rounded-xl text-center min-w-[54px]"
               style={{ background: avg === null ? 'var(--bg-elevated)' : passFail ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${avg === null ? 'var(--border)' : passFail ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            <p className="font-display font-bold text-xl leading-none" style={{ color: avg === null ? 'var(--text-muted)' : passFail ? '#22c55e' : '#ef4444' }}>{avg !== null ? avg.toFixed(1) : '—'}</p>
            <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>média</p>
          </div>
          {fluxoDef && (
            <button onClick={() => onOpenFluxo(fluxoDef)} title="Ver no fluxograma"
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--accent-3)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
              <GitBranch size={14}/>
            </button>
          )}
          <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
            {open ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
            <Trash2 size={13}/>
          </button>
        </div>
      </div>

      {subject.total_classes > 0 && <div className="mt-3"><AttendanceWidget subject={subject} onUpdate={onUpdateAttendance}/></div>}

      {open && (
        <div className="mt-3 pt-3 space-y-2 animate-in" style={{ borderTop: '1px solid var(--border)' }}>
          {subject.grades.length === 0 && <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>Nenhuma nota</p>}
          {subject.grades.map(g => {
            const pct = Math.min(100, (g.value / g.max_value) * 100)
            const gc = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
            return (
              <div key={g.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl group" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0"><span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{g.label}</span></div>
                <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>×{g.weight}</span>
                <div className="w-14 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: gc }}/>
                </div>
                <span className="font-mono font-bold text-sm shrink-0" style={{ color: 'var(--text-primary)', minWidth: 56, textAlign: 'right' }}>
                  {g.value}<span style={{ color: 'var(--text-muted)' }}>/{g.max_value}</span>
                </span>
                <button onClick={() => onDeleteGrade(subject.id, g.id)} className="opacity-0 group-hover:opacity-100 shrink-0" style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
                  <Trash2 size={12}/>
                </button>
              </div>
            )
          })}
          {adding ? (
            <div className="grid grid-cols-2 gap-2 mt-2 p-3 rounded-xl animate-in" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <input className="input text-sm col-span-2" placeholder="Ex: P1, Trabalho" value={form.label} onChange={e => setForm(f => ({...f, label: e.target.value}))}/>
              <input className="input text-sm" type="number" step="0.1" placeholder="Nota" value={form.value} onChange={e => setForm(f => ({...f, value: e.target.value}))}/>
              <input className="input text-sm" type="number" step="0.1" placeholder="Nota máx (10)" value={form.max_value} onChange={e => setForm(f => ({...f, max_value: e.target.value}))}/>
              <input className="input text-sm" type="number" step="0.1" placeholder="Peso (1)" value={form.weight} onChange={e => setForm(f => ({...f, weight: e.target.value}))}/>
              <div className="flex gap-2"><button className="btn-primary text-xs flex-1 justify-center" onClick={submit}>Salvar</button><button className="btn-ghost text-xs" onClick={() => setAdding(false)}>✕</button></div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs py-1 transition-colors" style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--accent-3)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
              <Plus size={12}/> Adicionar nota
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────── Fluxogram mini node ─────────────────────────────────
function FluxoNode({ sub, status, fluxoState, highlighted, dimmed, onClick }: {
  sub: SubjectDef; status: FluxoStatus
  fluxoState?: FluxoState; highlighted: boolean; dimmed: boolean
  onClick: () => void
}) {
  const base = sub.color ?? '#6366f1'
  const bg: React.CSSProperties = (() => {
    switch (status) {
      case 'passed':      return { background: 'rgba(34,197,94,0.18)',  borderColor: '#22c55e' }
      case 'weak-passed': return { background: 'rgba(245,158,11,0.18)', borderColor: '#f59e0b' }
      case 'failed':      return { background: 'rgba(239,68,68,0.18)',  borderColor: '#ef4444' }
      case 'in-progress': return { background: base + '22',             borderColor: base }
      case 'available':   return { background: 'var(--bg-elevated)',    borderColor: 'var(--border-light)' }
      default:            return { background: 'var(--bg-surface)',     borderColor: 'var(--border)', opacity: 0.4 }
    }
  })()
  return (
    <button onClick={onClick} disabled={status === 'locked'}
            className={clsx('w-full text-left px-2 py-1.5 rounded-lg border transition-all text-[10px]', status !== 'locked' && 'hover:scale-[1.03] cursor-pointer', dimmed && 'opacity-25')}
            style={{ ...bg, outline: highlighted ? `2px solid ${base}` : undefined, outlineOffset: highlighted ? '1px' : undefined }}>
      <div className="flex items-center gap-1 mb-0.5">
        {status === 'passed'      && <CheckCircle2 size={9} color="#22c55e"/>}
        {status === 'weak-passed' && <CheckCircle2 size={9} color="#f59e0b"/>}
        {status === 'failed'      && <AlertTriangle size={9} color="#ef4444"/>}
        {status === 'in-progress' && <Clock size={9} style={{ color: base }}/>}
        {status === 'locked'      && <Lock size={9} style={{ color: 'var(--text-muted)' }}/>}
        <span className="font-mono font-bold truncate" style={{ color: status === 'locked' ? 'var(--text-muted)' : base }}>{sub.abbr}</span>
        {sub.optional && <span className="ml-auto shrink-0" style={{ color: 'var(--text-muted)', fontSize: 7 }}>opt</span>}
      </div>
      <p className="leading-tight truncate" style={{ color: status === 'locked' ? 'var(--text-muted)' : 'var(--text-secondary)', fontSize: 9 }}>
        {sub.name.length > 24 ? sub.name.slice(0, 22) + '…' : sub.name}
      </p>
      {fluxoState?.grade !== undefined && (
        <p className="font-bold mt-0.5" style={{ color: status === 'passed' ? '#22c55e' : status === 'weak-passed' ? '#f59e0b' : '#ef4444', fontSize: 10 }}>{fluxoState.grade.toFixed(1)}</p>
      )}
    </button>
  )
}

// ─────────────────────── Main Page ───────────────────────────────────────────
const COLORS = ['#8B5CF6','#4d67f5','#10B981','#F59E0B','#EF4444','#06B6D4','#EC4899']

export default function GradesPage() {
  const [subjects,      setSubjects]      = useState<Subject[]>([])
  const [loading,       setLoading]       = useState(true)
  const [creating,      setCreating]      = useState(false)
  const [view,          setView]          = useState<'split'|'list'>('split')
  const [hoveredCode,   setHoveredCode]   = useState<string | null>(null)
  const [popupDef,      setPopupDef]      = useState<SubjectDef | null>(null)
  const [fluxoStates,   setFluxoStates]   = useState<Record<string, FluxoState>>(() => {
    try { return JSON.parse(localStorage.getItem('dasiboard-fluxogram') ?? '{}') } catch { return {} }
  })
  const [form, setForm] = useState({ code: '', name: '', professor: '', semester: '2025.1', color: '#8B5CF6', total_classes: '' })

  useEffect(() => {
    api.get('/grades/subjects').then(({ data }) => setSubjects(data)).catch(() => toast.error('Erro ao carregar disciplinas')).finally(() => setLoading(false))
  }, [])

  const saveFluxoState = useCallback((s: FluxoState) => {
    setFluxoStates(prev => {
      const u = { ...prev, [s.code]: s }
      localStorage.setItem('dasiboard-fluxogram', JSON.stringify(u))
      return u
    })
  }, [])

  const createSubject = async () => {
    if (!form.code || !form.name) return
    try {
      const { data } = await api.post('/grades/subjects', { ...form, total_classes: parseInt(form.total_classes) || 0, attended: parseInt(form.total_classes) || 0 })
      setSubjects(p => [...p, data]); setForm({ code: '', name: '', professor: '', semester: '2025.1', color: '#8B5CF6', total_classes: '' }); setCreating(false); toast.success('Disciplina criada!')
    } catch { toast.error('Erro ao criar disciplina') }
  }
  const deleteSubject      = async (id: string) => { await api.delete(`/grades/subjects/${id}`); setSubjects(p => p.filter(s => s.id !== id)); toast.success('Disciplina removida') }
  const addGrade           = async (subjectId: string, grade: Partial<Grade>) => {
    try { const { data } = await api.post(`/grades/subjects/${subjectId}/grades`, grade); setSubjects(p => p.map(s => s.id === subjectId ? { ...s, grades: [...s.grades, data] } : s)) } catch { toast.error('Erro ao adicionar nota') }
  }
  const deleteGrade        = async (sid: string, gid: string) => { await api.delete(`/grades/grades/${gid}`); setSubjects(p => p.map(s => s.id === sid ? { ...s, grades: s.grades.filter(g => g.id !== gid) } : s)) }
  const updateAttendance   = async (subjectId: string, total: number, att: number) => {
    const clamped = Math.max(0, Math.min(att, total))
    try { const { data } = await api.patch(`/grades/subjects/${subjectId}`, { total_classes: total, attended: clamped }); setSubjects(p => p.map(s => s.id === subjectId ? { ...s, ...data } : s)) } catch { toast.error('Erro ao atualizar') }
  }

  const allGrades   = subjects.flatMap(s => s.grades)
  const overallAvg  = weightedAvg(allGrades)
  const passing     = subjects.filter(s => { const a = weightedAvg(s.grades); return a !== null && a >= 5 }).length
  const failingAbs  = subjects.filter(s => s.total_classes > 0 && (s.total_classes - s.attended) > Math.floor(s.total_classes * 0.3)).length
  const fluxoPassed = Object.values(fluxoStates).filter(s => s.status === 'passed').length
  const fluxoWeak   = Object.values(fluxoStates).filter(s => s.status === 'weak-passed').length
  const fluxoTotal  = SUBJECTS.filter(s => !s.optional).length

  // Highlighted codes from hover
  const highlighted = useMemo(() => {
    if (!hoveredCode) return null
    const set = new Set<string>([hoveredCode])
    const def = SUBJECTS.find(s => s.code === hoveredCode)
    def?.prereqs.forEach(p => set.add(p.code))
    SUBJECTS.forEach(s => { if (s.prereqs.some(p => p.code === hoveredCode)) set.add(s.code) })
    return set
  }, [hoveredCode])

  // Find linked API subject for a fluxo code
  const linkedSubject = (code: string) => subjects.find(s => s.code === code)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 52px - 60px)' }}>
      {/* ── Header ── */}
      <div className="px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3"
           style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div>
          <h1 className="font-display font-bold text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BookOpen size={18} style={{ color: 'var(--accent-3)' }}/> Disciplinas & Fluxograma
          </h1>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {subjects.length} cadastrada{subjects.length !== 1 ? 's' : ''} · {fluxoPassed + fluxoWeak}/{fluxoTotal} concluídas no fluxo
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Stats */}
          {!loading && subjects.length > 0 && (
            <div className="flex gap-2">
              {overallAvg !== null && <div className="px-3 py-1.5 rounded-xl text-center" style={{ background: overallAvg >= 5 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }}><span className="font-bold text-sm" style={{ color: overallAvg >= 5 ? '#22c55e' : '#ef4444' }}>{overallAvg.toFixed(1)}</span><span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>média</span></div>}
              <div className="px-3 py-1.5 rounded-xl" style={{ background: 'var(--border)' }}><span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{passing}</span><span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>aprov.</span></div>
              {failingAbs > 0 && <div className="px-3 py-1.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.12)' }}><span className="text-sm font-bold" style={{ color: '#ef4444' }}>{failingAbs}</span><span className="text-[10px] ml-1" style={{ color: '#f87171' }}>FF</span></div>}
            </div>
          )}
          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {([['split', LayoutGrid, 'Grade + Lista'] as const, ['list', List, 'Só lista'] as const]).map(([v, Icon, label]) => (
              <button key={v} onClick={() => setView(v)} title={label}
                      className="px-3 py-1.5 flex items-center gap-1.5 text-xs transition-all"
                      style={{ background: view === v ? 'var(--accent-soft)' : 'transparent', color: view === v ? 'var(--accent-3)' : 'var(--text-muted)' }}>
                <Icon size={14}/> <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Legend strip ── */}
      <div className="px-4 py-1.5 shrink-0 flex flex-wrap items-center gap-3 text-[10px]"
           style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        {[['#22c55e','Aprovado'],['#f59e0b','Req. fraco'],['#ef4444','Reprovado/FF'],['var(--accent-3)','Em curso'],['var(--border-light)','Disponível'],['var(--border)','Bloqueado']].map(([color,label]) => (
          <span key={label} className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full border" style={{ borderColor: color, background: color + '40' }}/>{label}
          </span>
        ))}
        <span className="ml-auto italic text-[9px]" style={{ color: 'var(--text-muted)' }}>Passe o mouse para ver conexões · clique para detalhes</span>
      </div>

      {/* ── Content ── */}
      {view === 'split' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Fluxogram */}
          <div className="flex-1 overflow-auto" style={{ borderRight: '1px solid var(--border)', minWidth: 0 }}>
            <div className="flex gap-2 p-3 min-w-max items-start">
              {SEMESTERS.map(sem => (
                <div key={sem} className="flex flex-col gap-1.5" style={{ minWidth: 120, maxWidth: 135 }}>
                  <div className="px-2 py-1.5 rounded-lg text-center font-display font-bold text-[10px] uppercase tracking-wide shrink-0"
                       style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)', border: '1px solid var(--accent-1)' }}>
                    {sem}º
                  </div>
                  {SUBJECTS.filter(s => s.semester === sem).map(sub => {
                    const status = getFluxoStatus(sub.code, fluxoStates)
                    const isLinked = !!linkedSubject(sub.code)
                    return (
                      <div key={sub.code}
                           onMouseEnter={() => setHoveredCode(sub.code)}
                           onMouseLeave={() => setHoveredCode(null)}
                           style={{ position: 'relative' }}>
                        {isLinked && (
                          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full z-10" style={{ background: 'var(--accent-3)', border: '1px solid var(--bg-card)' }}/>
                        )}
                        <FluxoNode
                          sub={sub} status={status}
                          fluxoState={fluxoStates[sub.code]}
                          highlighted={highlighted?.has(sub.code) ?? false}
                          dimmed={highlighted !== null && !(highlighted.has(sub.code))}
                          onClick={() => setPopupDef(sub)}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Subject list */}
          <div className="w-80 xl:w-96 shrink-0 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="px-3 py-3 space-y-2">
                {/* Create button */}
                {creating ? (
                  <div className="card animate-in space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>Nova disciplina</span>
                      <button onClick={() => setCreating(false)} style={{ color: 'var(--text-muted)' }}><X size={15}/></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="label text-xs">Código</label><input className="input text-xs" placeholder="ACH2041" value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value}))}/></div>
                      <div><label className="label text-xs">Semestre</label><input className="input text-xs" placeholder="2025.1" value={form.semester} onChange={e => setForm(f => ({...f, semester: e.target.value}))}/></div>
                      <div className="col-span-2"><label className="label text-xs">Nome</label><input className="input text-xs" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}/></div>
                      <div className="col-span-2"><label className="label text-xs">Professor(a)</label><input className="input text-xs" value={form.professor} onChange={e => setForm(f => ({...f, professor: e.target.value}))}/></div>
                      <div><label className="label text-xs">Total de aulas</label><input type="number" className="input text-xs" value={form.total_classes} onChange={e => setForm(f => ({...f, total_classes: e.target.value}))}/></div>
                      <div><label className="label text-xs">Cor</label><div className="flex gap-1 mt-1 flex-wrap">{COLORS.map(c => (<button key={c} onClick={() => setForm(f => ({...f, color: c}))} className="w-5 h-5 rounded-full" style={{ backgroundColor: c, transform: form.color === c ? 'scale(1.3)' : 'scale(1)', boxShadow: form.color === c ? `0 0 0 2px var(--bg-card), 0 0 0 3px ${c}` : 'none' }}/>))}</div></div>
                    </div>
                    <div className="flex gap-2"><button className="btn-primary text-xs flex-1 justify-center" onClick={createSubject}>Criar</button><button className="btn-ghost text-xs" onClick={() => setCreating(false)}>Cancelar</button></div>
                  </div>
                ) : (
                  <button onClick={() => setCreating(true)} className="btn-primary text-xs w-full justify-center"><Plus size={12}/> Nova disciplina</button>
                )}

                {loading ? (
                  <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="card shimmer h-16"/>)}</div>
                ) : subjects.length === 0 ? (
                  <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    <BookOpen size={28} className="mx-auto mb-2 opacity-30"/>
                    <p className="text-xs">Nenhuma disciplina</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subjects.map(s => (
                      <div key={s.id}
                           onMouseEnter={() => setHoveredCode(s.code)}
                           onMouseLeave={() => setHoveredCode(null)}>
                        <SubjectCard
                          subject={s}
                          fluxoDef={SUBJECTS.find(f => f.code === s.code)}
                          fluxoStates={fluxoStates}
                          onDelete={() => deleteSubject(s.id)}
                          onAddGrade={addGrade}
                          onDeleteGrade={deleteGrade}
                          onUpdateAttendance={updateAttendance}
                          onOpenFluxo={def => setPopupDef(def)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* List-only view */
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 max-w-3xl mx-auto space-y-3">
            {creating ? (
              <div className="card animate-in space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Nova disciplina</h3>
                  <button onClick={() => setCreating(false)} style={{ color: 'var(--text-muted)' }}><X size={16}/></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div><label className="label">Código</label><input className="input text-sm" placeholder="ACH2041" value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value}))}/></div>
                  <div><label className="label">Semestre</label><input className="input text-sm" placeholder="2025.1" value={form.semester} onChange={e => setForm(f => ({...f, semester: e.target.value}))}/></div>
                  <div className="sm:col-span-2"><label className="label">Nome</label><input className="input text-sm" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}/></div>
                  <div className="sm:col-span-2"><label className="label">Professor(a)</label><input className="input text-sm" value={form.professor} onChange={e => setForm(f => ({...f, professor: e.target.value}))}/></div>
                  <div><label className="label">Total de aulas</label><input type="number" className="input text-sm" value={form.total_classes} onChange={e => setForm(f => ({...f, total_classes: e.target.value}))}/></div>
                  <div><label className="label">Cor</label><div className="flex gap-2 mt-1">{COLORS.map(c => (<button key={c} onClick={() => setForm(f => ({...f, color: c}))} className="w-7 h-7 rounded-full" style={{ backgroundColor: c, transform: form.color === c ? 'scale(1.25)' : 'scale(1)', boxShadow: form.color === c ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${c}` : 'none' }}/>))}</div></div>
                </div>
                <div className="flex gap-2"><button className="btn-primary" onClick={createSubject}>Criar disciplina</button><button className="btn-ghost" onClick={() => setCreating(false)}>Cancelar</button></div>
              </div>
            ) : (
              <button onClick={() => setCreating(true)} className="btn-primary"><Plus size={15}/> Nova disciplina</button>
            )}
            {loading ? (
              <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="card shimmer h-20"/>)}</div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                <BookOpen size={40} className="mx-auto mb-3 opacity-30"/>
                <p className="text-sm">Nenhuma disciplina cadastrada</p>
                <button onClick={() => setCreating(true)} className="text-xs mt-2" style={{ color: 'var(--accent-3)' }}>+ Adicionar primeira</button>
              </div>
            ) : (
              <div className="space-y-3">
                {subjects.map(s => (
                  <SubjectCard key={s.id} subject={s}
                               fluxoDef={SUBJECTS.find(f => f.code === s.code)}
                               fluxoStates={fluxoStates}
                               onDelete={() => deleteSubject(s.id)}
                               onAddGrade={addGrade} onDeleteGrade={deleteGrade}
                               onUpdateAttendance={updateAttendance}
                               onOpenFluxo={def => setPopupDef(def)}/>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified popup */}
      {popupDef && (
        <FluxoPopup
          def={popupDef}
          fluxoStates={fluxoStates}
          subject={linkedSubject(popupDef.code)}
          onSave={saveFluxoState}
          onClose={() => setPopupDef(null)}
        />
      )}
    </div>
  )
}
