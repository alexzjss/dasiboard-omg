import { useState, useCallback } from 'react'
import { BookOpen, CheckCircle2, AlertTriangle, Clock, Lock, ChevronDown, ChevronUp, X, Save, Minus, Plus } from 'lucide-react'
import clsx from 'clsx'

// ── Curriculum data ───────────────────────────────────────────────────────────
// Prerequisites: [strong_prereqs[], weak_prereqs[]]
// Strong: need approval (avg >= 5) | Weak: need >= 3 final grade
type PrereqRule = { code: string; weak?: boolean }

interface SubjectDef {
  code: string
  name: string
  abbr: string
  semester: number
  credits: number
  optional?: boolean
  prereqs: PrereqRule[]
  color?: string
}

const SUBJECTS: SubjectDef[] = [
  // ── Semester 1 ─────────────────────────────────────
  { code:'ACH2001', name:'Introdução à Programação', abbr:'IP', semester:1, credits:4, prereqs:[], color:'#6366f1' },
  { code:'ACH2014', name:'Fundamentos de Sistemas de Informação', abbr:'FSI', semester:1, credits:4, prereqs:[], color:'#8b5cf6' },
  { code:'ACH0021', name:'Tratamento e Análise de Dados', abbr:'TADI', semester:1, credits:2, prereqs:[], color:'#a78bfa' },
  { code:'ACH0041', name:'Resolução de Problemas I', abbr:'RP I', semester:1, credits:2, prereqs:[], color:'#c4b5fd' },
  { code:'ACH2011', name:'Cálculo I', abbr:'CALC I', semester:1, credits:4, prereqs:[], color:'#06b6d4' },
  { code:'ACH0141', name:'Soc., Multicultur. e Direitos – Estado e Sociedade', abbr:'SMD-ES', semester:1, credits:2, optional:true, prereqs:[], color:'#94a3b8' },
  { code:'ACH0151', name:'Soc., Multicultur. e Direitos – Cultura Digital', abbr:'SMD-CD', semester:1, credits:2, optional:true, prereqs:[], color:'#94a3b8' },
  { code:'ACH0161', name:'Soc., Multicultur. e Direitos – Direitos Humanos', abbr:'SMD-DH', semester:1, credits:2, optional:true, prereqs:[], color:'#94a3b8' },
  // ── Semester 2 ─────────────────────────────────────
  { code:'ACH2002', name:'Introdução à Análise de Algoritmos', abbr:'IAA', semester:2, credits:4, prereqs:[{code:'ACH2001'}], color:'#6366f1' },
  { code:'ACH2012', name:'Cálculo II', abbr:'CALC II', semester:2, credits:4, prereqs:[{code:'ACH2011'}], color:'#06b6d4' },
  { code:'ACH2013', name:'Matemática Discreta I', abbr:'MD I', semester:2, credits:4, prereqs:[], color:'#0ea5e9' },
  { code:'ACH2023', name:'Algoritmos e Estruturas de Dados I', abbr:'AED I', semester:2, credits:4, prereqs:[{code:'ACH2001'}], color:'#6366f1' },
  { code:'ACH2033', name:'Matrizes, Vetores e Geometria Analítica', abbr:'MVGA', semester:2, credits:4, prereqs:[], color:'#0ea5e9' },
  // ── Semester 3 ─────────────────────────────────────
  { code:'ACH2003', name:'Computação Orientada a Objetos', abbr:'COO', semester:3, credits:4, prereqs:[{code:'ACH2002'}], color:'#6366f1' },
  { code:'ACH2024', name:'Algoritmos e Estruturas de Dados II', abbr:'AED II', semester:3, credits:4, prereqs:[{code:'ACH2023'}], color:'#6366f1' },
  { code:'ACH2034', name:'Organização e Arquitetura de Computadores I', abbr:'OAC I', semester:3, credits:4, prereqs:[{code:'ACH2013'}], color:'#0ea5e9' },
  { code:'ACH2063', name:'Introdução à Administração e Economia', abbr:'IAEC', semester:3, credits:4, prereqs:[], color:'#10b981' },
  { code:'ACH2053', name:'Introdução à Estatística', abbr:'IE', semester:3, credits:4, prereqs:[{code:'ACH2012', weak:true}], color:'#06b6d4' },
  { code:'ACH2107', name:'Desafios de Programação I', abbr:'DESI', semester:3, credits:2, optional:true, prereqs:[{code:'ACH2023', weak:true}], color:'#f59e0b' },
  // ── Semester 4 ─────────────────────────────────────
  { code:'ACH2004', name:'Banco de Dados I', abbr:'BD I', semester:4, credits:4, prereqs:[{code:'ACH2003'}], color:'#8b5cf6' },
  { code:'ACH2036', name:'Métodos Quantitativos para Análise Multivariada', abbr:'MQAM', semester:4, credits:4, prereqs:[{code:'ACH2053', weak:true}], color:'#06b6d4' },
  { code:'ACH2055', name:'Organização e Arquitetura de Computadores II', abbr:'OAC II', semester:4, credits:4, prereqs:[{code:'ACH2034'}], color:'#0ea5e9' },
  { code:'ACH2026', name:'Redes de Computadores', abbr:'RC', semester:4, credits:4, prereqs:[{code:'ACH2034', weak:true}], color:'#0ea5e9' },
  { code:'ACH2044', name:'Sistemas Operacionais', abbr:'SO', semester:4, credits:4, prereqs:[{code:'ACH2024'}], color:'#6366f1' },
  // ── Semester 5 ─────────────────────────────────────
  { code:'ACH2005', name:'Análise, Projeto e IHC', abbr:'IHC', semester:5, credits:4, prereqs:[{code:'ACH2003'}], color:'#ec4899' },
  { code:'ACH2016', name:'Inteligência Artificial', abbr:'IA', semester:5, credits:4, prereqs:[{code:'ACH2024'},{code:'ACH2053', weak:true}], color:'#8b5cf6' },
  { code:'ACH2025', name:'Banco de Dados II', abbr:'BD II', semester:5, credits:4, prereqs:[{code:'ACH2004'}], color:'#8b5cf6' },
  { code:'ACH2043', name:'Introdução à Teoria da Computação', abbr:'ITC', semester:5, credits:4, prereqs:[{code:'ACH2013'}], color:'#0ea5e9' },
  { code:'ACH2147', name:'Desenvolvimento de Sistemas Distribuídos', abbr:'DSID', semester:5, credits:4, prereqs:[{code:'ACH2004', weak:true},{code:'ACH2026', weak:true}], color:'#10b981' },
  // ── Semester 6 ─────────────────────────────────────
  { code:'ACH2006', name:'Engenharia de Sistemas de Informação I', abbr:'ESI I', semester:6, credits:4, prereqs:[{code:'ACH2005'}], color:'#ec4899' },
  { code:'ACH0042', name:'Resolução de Problemas II', abbr:'RP II', semester:6, credits:2, prereqs:[{code:'ACH0041'}], color:'#c4b5fd' },
  { code:'ACH2027', name:'Gestão de Projetos de TI', abbr:'GPTI', semester:6, credits:4, prereqs:[{code:'ACH2063', weak:true}], color:'#10b981' },
  { code:'ACH2008', name:'Empreendedorismo em Informática', abbr:'EI', semester:6, credits:4, prereqs:[], color:'#f59e0b' },
  { code:'ACH0102', name:'Psicologia, Educação e Temas Contemporâneos', abbr:'PETC', semester:6, credits:2, optional:true, prereqs:[], color:'#94a3b8' },
  { code:'MAC0216', name:'Técnicas de Programação I', abbr:'TP I', semester:6, credits:4, optional:true, prereqs:[{code:'ACH2024', weak:true}], color:'#f59e0b' },
  // ── Semester 7 ─────────────────────────────────────
  { code:'ACH2017', name:'Projeto Supervisionado de Graduação I', abbr:'PSG I', semester:7, credits:4, prereqs:[{code:'ACH2006'}], color:'#ef4444' },
  { code:'ACH2007', name:'Engenharia de Sistemas de Informação II', abbr:'ESI II', semester:7, credits:4, prereqs:[{code:'ACH2006'}], color:'#ec4899' },
  { code:'ACH2076', name:'Segurança da Informação', abbr:'SEG', semester:7, credits:4, optional:true, prereqs:[{code:'ACH2044', weak:true}], color:'#ef4444' },
  { code:'ACH2077', name:'Soluções Web com Software Livre', abbr:'WSL', semester:7, credits:4, optional:true, prereqs:[{code:'ACH2147', weak:true}], color:'#10b981' },
  { code:'ACH2117', name:'Computação Gráfica', abbr:'CG', semester:7, credits:4, optional:true, prereqs:[{code:'ACH2024', weak:true}], color:'#8b5cf6' },
  { code:'ACH2177', name:'Introdução à Ciência de Dados', abbr:'ICD', semester:7, credits:4, optional:true, prereqs:[{code:'ACH2016', weak:true}], color:'#8b5cf6' },
  { code:'ACH2157', name:'Computação Física e Aplicações', abbr:'CFA', semester:7, credits:4, optional:true, prereqs:[{code:'ACH2044', weak:true}], color:'#f59e0b' },
  { code:'MAC0471', name:'Desenvolvimento para Web', abbr:'DEV WEB', semester:7, credits:4, optional:true, prereqs:[{code:'ACH2147', weak:true}], color:'#10b981' },
  // ── Semester 8 ─────────────────────────────────────
  { code:'ACH2018', name:'Projeto Supervisionado de Graduação II', abbr:'PSG II', semester:8, credits:4, prereqs:[{code:'ACH2017'}], color:'#ef4444' },
  { code:'ACH2028', name:'Qualidade de Software', abbr:'QS', semester:8, credits:4, optional:true, prereqs:[{code:'ACH2007', weak:true}], color:'#ec4899' },
  { code:'ACH2038', name:'Laboratório de Redes de Computadores', abbr:'LAB RC', semester:8, credits:4, optional:true, prereqs:[{code:'ACH2026'}], color:'#0ea5e9' },
  { code:'ACH2086', name:'Fundamentos de Sistemas Hipermídia e Web', abbr:'WEB', semester:8, credits:4, optional:true, prereqs:[{code:'ACH2147', weak:true}], color:'#10b981' },
  { code:'ACH2187', name:'Mineração de Dados', abbr:'MIN', semester:8, credits:4, optional:true, prereqs:[{code:'ACH2177', weak:true}], color:'#8b5cf6' },
  { code:'ACH2096', name:'Laboratório de Sistemas Operacionais', abbr:'LAB SO', semester:8, credits:4, optional:true, prereqs:[{code:'ACH2044'}], color:'#6366f1' },
]

const SEMESTERS = [1,2,3,4,5,6,7,8]

// ── Subject status types ──────────────────────────────────────────────────────
type SubjectStatus = 'locked' | 'available' | 'in-progress' | 'passed' | 'failed' | 'weak-passed'

interface SubjectState {
  code: string
  status: SubjectStatus
  grade?: number       // 0–10
  absences?: number
  totalClasses?: number
}

const PASS_GRADE = 5
const WEAK_PASS_GRADE = 3

function getStatus(code: string, states: Record<string, SubjectState>, allDefs: SubjectDef[]): SubjectStatus {
  const state = states[code]
  if (state?.status && state.status !== 'locked' && state.status !== 'available') {
    return state.status
  }
  const def = allDefs.find(s => s.code === code)
  if (!def) return 'locked'

  // Check prerequisites
  for (const prereq of def.prereqs) {
    const pState = states[prereq.code]
    const pStatus = pState?.status
    const grade = pState?.grade ?? 0
    if (!prereq.weak) {
      // Strong prerequisite: must have passed (grade >= 5)
      if (pStatus !== 'passed' && pStatus !== 'weak-passed') return 'locked'
    } else {
      // Weak prerequisite: grade >= 3 or passed
      if (pStatus === 'passed' || pStatus === 'weak-passed') continue
      if ((pStatus === 'failed' || pStatus === 'in-progress') && grade >= WEAK_PASS_GRADE) continue
      return 'locked'
    }
  }
  return state?.status ?? 'available'
}

// ── Grade modal ───────────────────────────────────────────────────────────────
function GradeModal({ subject, state, onSave, onClose }: {
  subject: SubjectDef
  state?: SubjectState
  onSave: (s: SubjectState) => void
  onClose: () => void
}) {
  const [grade, setGrade] = useState<string>(state?.grade !== undefined ? String(state.grade) : '')
  const [absences, setAbsences] = useState<string>(state?.absences !== undefined ? String(state.absences) : '0')
  const [totalClasses, setTotalClasses] = useState<string>(state?.totalClasses !== undefined ? String(state.totalClasses) : '')
  const [status, setStatus] = useState<SubjectStatus>(state?.status ?? 'in-progress')

  const gradeNum = parseFloat(grade)
  const absNum = parseInt(absences) || 0
  const totalNum = parseInt(totalClasses) || 0
  const absRate = totalNum > 0 ? (absNum / totalNum) * 100 : 0
  const failedByAbs = absRate >= 30 && totalNum > 0

  const autoStatus = (): SubjectStatus => {
    if (failedByAbs) return 'failed'
    if (!isNaN(gradeNum)) {
      if (gradeNum >= PASS_GRADE) return 'passed'
      if (gradeNum >= WEAK_PASS_GRADE) return 'weak-passed'
      return 'failed'
    }
    return 'in-progress'
  }

  const save = () => {
    onSave({
      code: subject.code,
      status: autoStatus(),
      grade: isNaN(gradeNum) ? undefined : gradeNum,
      absences: absNum,
      totalClasses: totalNum,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
         style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-5 space-y-4"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '90dvh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{subject.code}</p>
            <h3 className="font-display font-bold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>{subject.name}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>
            <X size={15} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Nota final (0–10)</label>
            <input type="number" min="0" max="10" step="0.1" className="input text-sm"
                   placeholder="Ex: 7.5" value={grade}
                   onChange={(e) => setGrade(e.target.value)} />
          </div>
          <div>
            <label className="label">Total de aulas</label>
            <input type="number" min="0" className="input text-sm" value={totalClasses}
                   onChange={(e) => setTotalClasses(e.target.value)} />
          </div>
          <div>
            <label className="label">Faltas</label>
            <div className="flex items-center gap-1">
              <button className="btn-ghost p-2" onClick={() => setAbsences(v => String(Math.max(0, parseInt(v)||0 - 1)))}>
                <Minus size={12} />
              </button>
              <input type="number" min="0" className="input text-sm text-center flex-1" value={absences}
                     onChange={(e) => setAbsences(e.target.value)} />
              <button className="btn-ghost p-2" onClick={() => setAbsences(v => String((parseInt(v)||0) + 1))}>
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Preview status */}
        {grade !== '' && (
          <div className="px-3 py-2 rounded-xl text-sm font-semibold text-center"
               style={{
                 background: failedByAbs || parseFloat(grade) < WEAK_PASS_GRADE
                   ? 'rgba(239,68,68,0.12)' : parseFloat(grade) < PASS_GRADE
                   ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
                 color: failedByAbs || parseFloat(grade) < WEAK_PASS_GRADE
                   ? '#ef4444' : parseFloat(grade) < PASS_GRADE
                   ? '#f59e0b' : '#22c55e',
               }}>
            {failedByAbs ? '⚠️ Reprovado por faltas (FF)' :
             parseFloat(grade) >= PASS_GRADE ? '✅ Aprovado' :
             parseFloat(grade) >= WEAK_PASS_GRADE ? '⚡ Aprovado (req. fraco)' :
             '❌ Reprovado'}
            {!failedByAbs && totalNum > 0 && absNum > 0 && (
              <span className="text-xs ml-2 opacity-70">{absRate.toFixed(0)}% faltas</span>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button className="btn-primary flex-1 justify-center" onClick={save}>
            <Save size={13} /> Salvar
          </button>
          {state?.status && state.status !== 'available' && (
            <button className="btn-ghost" onClick={() => { onSave({ code: subject.code, status: 'available' }); onClose() }}>
              Limpar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Subject node ──────────────────────────────────────────────────────────────
function SubjectNode({ subject, status, state, isHighlighted, isDimmed, onClick }: {
  subject: SubjectDef
  status: SubjectStatus
  state?: SubjectState
  isHighlighted: boolean
  isDimmed: boolean
  onClick: () => void
}) {
  const baseColor = subject.color ?? '#6366f1'

  const bgStyle = (): React.CSSProperties => {
    switch (status) {
      case 'passed':      return { background: 'rgba(34,197,94,0.15)',  borderColor: '#22c55e' }
      case 'weak-passed': return { background: 'rgba(245,158,11,0.15)', borderColor: '#f59e0b' }
      case 'failed':      return { background: 'rgba(239,68,68,0.15)',  borderColor: '#ef4444' }
      case 'in-progress': return { background: baseColor + '22',         borderColor: baseColor }
      case 'available':   return { background: 'var(--bg-elevated)',     borderColor: 'var(--border-light)' }
      case 'locked':      return { background: 'var(--bg-surface)',      borderColor: 'var(--border)', opacity: 0.45 }
    }
  }

  const icon = () => {
    switch (status) {
      case 'passed':      return <CheckCircle2 size={11} color="#22c55e" />
      case 'weak-passed': return <CheckCircle2 size={11} color="#f59e0b" />
      case 'failed':      return <AlertTriangle size={11} color="#ef4444" />
      case 'in-progress': return <Clock size={11} style={{ color: baseColor }} />
      case 'locked':      return <Lock size={11} style={{ color: 'var(--text-muted)' }} />
      default:            return null
    }
  }

  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative w-full text-left px-2.5 py-2 rounded-xl border transition-all select-none',
        status !== 'locked' && 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
        status === 'locked' && 'cursor-default',
        isHighlighted && 'ring-2 ring-offset-1',
        isDimmed && 'opacity-30'
      )}
      style={{
        ...bgStyle(),
        ringColor: baseColor,
        minWidth: 120,
      }}>
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon()}
        <span className="text-[10px] font-mono font-bold truncate"
              style={{ color: status === 'locked' ? 'var(--text-muted)' : baseColor }}>
          {subject.abbr}
        </span>
        {subject.optional && (
          <span className="text-[8px] px-1 rounded" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>opt</span>
        )}
      </div>
      <p className="text-[10px] leading-tight truncate"
         style={{ color: status === 'locked' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
        {subject.name.length > 32 ? subject.name.slice(0, 30) + '…' : subject.name}
      </p>
      {state?.grade !== undefined && (
        <p className="text-[11px] font-bold mt-0.5"
           style={{ color: status === 'passed' ? '#22c55e' : status === 'weak-passed' ? '#f59e0b' : '#ef4444' }}>
          {state.grade.toFixed(1)}
        </p>
      )}
    </button>
  )
}

// ── Fluxogram Page ────────────────────────────────────────────────────────────
export default function FluxogramPage() {
  const [states, setStates] = useState<Record<string, SubjectState>>(() => {
    try { return JSON.parse(localStorage.getItem('dasiboard-fluxogram') ?? '{}') } catch { return {} }
  })
  const [modalSubject, setModalSubject] = useState<SubjectDef | null>(null)
  const [hoveredCode, setHoveredCode] = useState<string | null>(null)

  const saveState = useCallback((newState: SubjectState) => {
    setStates(prev => {
      const updated = { ...prev, [newState.code]: newState }
      localStorage.setItem('dasiboard-fluxogram', JSON.stringify(updated))
      return updated
    })
  }, [])

  // Get effective status for each subject
  const effectiveStatus = (code: string) => getStatus(code, states, SUBJECTS)

  // Compute highlights: when hovering a subject, highlight its prereqs and subjects it unlocks
  const getHighlightedCodes = (code: string): Set<string> => {
    const set = new Set<string>()
    set.add(code)
    // Direct prereqs
    const def = SUBJECTS.find(s => s.code === code)
    def?.prereqs.forEach(p => set.add(p.code))
    // Subjects this unlocks
    SUBJECTS.forEach(s => {
      if (s.prereqs.some(p => p.code === code)) set.add(s.code)
    })
    return set
  }

  const highlighted = hoveredCode ? getHighlightedCodes(hoveredCode) : null

  // Stats
  const passed      = Object.values(states).filter(s => s.status === 'passed').length
  const weakPassed  = Object.values(states).filter(s => s.status === 'weak-passed').length
  const failed      = Object.values(states).filter(s => s.status === 'failed').length
  const inProgress  = Object.values(states).filter(s => s.status === 'in-progress').length
  const total       = SUBJECTS.filter(s => !s.optional).length

  const semesterSubjects = (sem: number) => SUBJECTS.filter(s => s.semester === sem)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3"
           style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div>
          <h1 className="font-display font-bold text-lg flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}>
            <BookOpen size={18} style={{ color: 'var(--accent-3)' }} />
            Fluxograma de Disciplinas
          </h1>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            SI · EACH · USP — clique em qualquer disciplina para registrar nota
          </p>
        </div>
        <div className="flex gap-2 flex-wrap text-xs">
          <span className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
            <CheckCircle2 size={11} /> {passed} aprovadas
          </span>
          {weakPassed > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
              ⚡ {weakPassed} req. fraco
            </span>
          )}
          {failed > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
              <AlertTriangle size={11} /> {failed} reprovadas
            </span>
          )}
          {inProgress > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)' }}>
              <Clock size={11} /> {inProgress} em curso
            </span>
          )}
          <span className="px-2 py-1 rounded-lg" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
            {passed + weakPassed}/{total} obrig.
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 shrink-0 flex flex-wrap gap-3 text-[10px]"
           style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        {[
          { color: '#22c55e', label: 'Aprovado (≥5)' },
          { color: '#f59e0b', label: 'Req. fraco (≥3)' },
          { color: '#ef4444', label: 'Reprovado / FF' },
          { color: 'var(--accent-3)', label: 'Em curso' },
          { color: 'var(--border-light)', label: 'Disponível' },
          { color: 'var(--border)', label: 'Bloqueado' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: color, background: color + '40' }} />
            {label}
          </span>
        ))}
        <span className="text-[10px] italic ml-auto" style={{ color: 'var(--text-muted)' }}>
          Passe o mouse em uma disciplina para ver conexões
        </span>
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex gap-3 p-4 min-w-max min-h-full items-start">
          {SEMESTERS.map(sem => (
            <div key={sem} className="flex flex-col gap-2"
                 style={{ minWidth: 148, maxWidth: 160 }}>
              {/* Semester header */}
              <div className="px-3 py-2 rounded-xl text-center font-display font-bold text-xs uppercase tracking-wide shrink-0"
                   style={{ background: 'var(--accent-soft)', color: 'var(--accent-3)', border: '1px solid var(--accent-1)' }}>
                {sem}º sem
              </div>

              {/* Subjects */}
              {semesterSubjects(sem).map(sub => {
                const status = effectiveStatus(sub.code)
                const isH = highlighted ? highlighted.has(sub.code) : false
                const isDimmed = highlighted != null && !highlighted.has(sub.code)
                return (
                  <div key={sub.code}
                       onMouseEnter={() => setHoveredCode(sub.code)}
                       onMouseLeave={() => setHoveredCode(null)}>
                    <SubjectNode
                      subject={sub}
                      status={status}
                      state={states[sub.code]}
                      isHighlighted={isH}
                      isDimmed={isDimmed}
                      onClick={() => status !== 'locked' && setModalSubject(sub)}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Grade modal */}
      {modalSubject && (
        <GradeModal
          subject={modalSubject}
          state={states[modalSubject.code]}
          onSave={saveState}
          onClose={() => setModalSubject(null)}
        />
      )}
    </div>
  )
}
