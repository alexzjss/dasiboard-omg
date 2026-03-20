import { useEffect, useState } from 'react'
import {
  Plus, Trash2, BookOpen, TrendingUp, ChevronDown, ChevronRight,
  Award, AlertTriangle, CheckCircle2, X, Minus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/utils/api'

interface Grade   { id: string; label: string; value: number; weight: number; max_value: number; date?: string; notes?: string }
interface Subject {
  id: string; code: string; name: string; professor?: string
  semester: string; color: string; grades: Grade[]
  total_classes: number; attended: number
}

function weightedAvg(grades: Grade[]) {
  const tw = grades.reduce((a, g) => a + g.weight, 0)
  if (!tw) return null
  return grades.reduce((a, g) => a + (g.value / g.max_value) * 10 * g.weight, 0) / tw
}

// ── Attendance inline widget ──────────────────────────────────────────────────
function AttendanceWidget({ subject, onUpdate }: {
  subject: Subject
  onUpdate: (subjectId: string, total: number, attended: number) => void
}) {
  const absent   = subject.total_classes - subject.attended
  const maxAbs   = subject.total_classes > 0 ? Math.floor(subject.total_classes * 0.3) : 0
  const remaining = Math.max(0, maxAbs - absent)
  const rate     = subject.total_classes > 0 ? (absent / subject.total_classes) * 100 : 0
  const danger   = rate >= 25
  const critical = rate >= 30

  const addAbsence = () => {
    if (absent >= subject.total_classes) return
    onUpdate(subject.id, subject.total_classes, subject.attended - 1)
  }
  const removeAbsence = () => {
    if (absent <= 0) return
    onUpdate(subject.id, subject.total_classes, subject.attended + 1)
  }

  const statusColor = critical ? '#ef4444' : danger ? '#f59e0b' : '#22c55e'
  const pct = subject.total_classes > 0 ? Math.min(100, (absent / subject.total_classes) * 100) : 0
  const r = 17, circ = 2 * Math.PI * r, dash = (pct / 100) * circ

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
         style={{ background: 'var(--bg-elevated)', border: `1px solid ${critical ? 'rgba(239,68,68,0.35)' : danger ? 'rgba(245,158,11,0.25)' : 'var(--border)'}` }}>

      {/* Circular ring */}
      <div className="relative flex items-center justify-center shrink-0" style={{ width: 40, height: 40 }}>
        <svg width={40} height={40} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
          <circle cx={20} cy={20} r={r} fill="none" stroke="var(--border)" strokeWidth={2.5} />
          <circle cx={20} cy={20} r={r} fill="none" stroke={statusColor} strokeWidth={2.5}
                  strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.4s ease' }} />
        </svg>
        <span className="text-[10px] font-bold" style={{ color: statusColor }}>{absent}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {critical
            ? <AlertTriangle size={11} color="#ef4444" />
            : danger
            ? <AlertTriangle size={11} color="#f59e0b" />
            : <CheckCircle2 size={11} color="#22c55e" />}
          <span className="text-xs font-semibold" style={{ color: statusColor }}>
            {critical ? 'FF — Reprovado por faltas' : danger ? 'Atenção às faltas' : 'Frequência ok'}
          </span>
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {absent} falta{absent !== 1 ? 's' : ''} de {maxAbs} máx.
          {!critical && remaining > 0 && (
            <span style={{ color: 'var(--text-secondary)' }}> · ainda pode faltar {remaining}×</span>
          )}
          {subject.total_classes > 0 && (
            <span> · {subject.attended}/{subject.total_classes} aulas</span>
          )}
        </p>
      </div>

      {/* +/- controls */}
      {subject.total_classes > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={removeAbsence}
            disabled={absent <= 0}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            title="Remover falta">
            <Minus size={12} />
          </button>
          <button
            onClick={addAbsence}
            disabled={absent >= subject.total_classes}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
            style={{ background: critical ? 'rgba(239,68,68,0.1)' : 'var(--accent-soft)', border: `1px solid ${critical ? 'rgba(239,68,68,0.3)' : 'var(--accent-1)'}`, color: critical ? '#ef4444' : 'var(--accent-3)' }}
            title="Adicionar falta">
            <Plus size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Subject card ──────────────────────────────────────────────────────────────
function SubjectCard({ subject, onDelete, onAddGrade, onDeleteGrade, onUpdateAttendance }: {
  subject: Subject; onDelete: () => void
  onAddGrade: (id: string, g: Partial<Grade>) => void
  onDeleteGrade: (sid: string, gid: string) => void
  onUpdateAttendance: (id: string, total: number, att: number) => void
}) {
  const [open, setOpen]     = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm]     = useState({ label: '', value: '', weight: '1', max_value: '10' })

  const avg      = weightedAvg(subject.grades)
  const passFail = avg === null ? null : avg >= 5
  const absent   = subject.total_classes - subject.attended
  const maxAbs   = subject.total_classes > 0 ? Math.floor(subject.total_classes * 0.3) : 0
  const failedByAbs = absent > maxAbs && subject.total_classes > 0

  const submit = () => {
    if (!form.label || !form.value) return
    onAddGrade(subject.id, {
      label: form.label, value: parseFloat(form.value),
      weight: parseFloat(form.weight), max_value: parseFloat(form.max_value),
    })
    setForm({ label: '', value: '', weight: '1', max_value: '10' })
    setAdding(false)
  }

  return (
    <div className="card transition-all" style={{ borderLeft: `3px solid ${subject.color}` }}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: subject.color + '22', color: subject.color }}>
              {subject.code}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{subject.semester}</span>
            {failedByAbs && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                ⚠️ FF
              </span>
            )}
          </div>
          <h3 className="font-display font-bold truncate" style={{ color: 'var(--text-primary)' }}>{subject.name}</h3>
          {subject.professor && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>👤 {subject.professor}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="px-2.5 py-2 rounded-xl text-center min-w-[54px]"
               style={{
                 background: avg === null ? 'var(--bg-elevated)' : passFail ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                 border: `1px solid ${avg === null ? 'var(--border)' : passFail ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
               }}>
            <p className="font-display font-bold text-xl leading-none"
               style={{ color: avg === null ? 'var(--text-muted)' : passFail ? '#22c55e' : '#ef4444' }}>
              {avg !== null ? avg.toFixed(1) : '—'}
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>média</p>
          </div>
          <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
            {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Attendance widget — always visible */}
      {subject.total_classes > 0 && (
        <div className="mt-3">
          <AttendanceWidget subject={subject} onUpdate={onUpdateAttendance} />
        </div>
      )}

      {/* Grades */}
      {open && (
        <div className="mt-3 pt-3 space-y-2 animate-in" style={{ borderTop: '1px solid var(--border)' }}>
          {subject.grades.length === 0 && (
            <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>Nenhuma nota cadastrada</p>
          )}
          {subject.grades.map(g => {
            const pct = Math.min(100, (g.value / g.max_value) * 100)
            const gc  = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
            return (
              <div key={g.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl group transition-all"
                   style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{g.label}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>×{g.weight}</span>
                <div className="w-14 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: gc }} />
                </div>
                <span className="font-mono font-bold text-sm shrink-0" style={{ color: 'var(--text-primary)', minWidth: 56, textAlign: 'right' }}>
                  {g.value}<span style={{ color: 'var(--text-muted)' }}>/{g.max_value}</span>
                </span>
                <button onClick={() => onDeleteGrade(subject.id, g.id)}
                        className="opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
          {adding ? (
            <div className="grid grid-cols-2 gap-2 mt-2 p-3 rounded-xl animate-in"
                 style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <input className="input text-sm col-span-2" placeholder="Ex: P1, P2, Trabalho"
                     value={form.label} onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))} />
              <input className="input text-sm" type="number" step="0.1" placeholder="Nota (ex: 8.5)"
                     value={form.value} onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))} />
              <input className="input text-sm" type="number" step="0.1" placeholder="Nota máx (10)"
                     value={form.max_value} onChange={(e) => setForm(f => ({ ...f, max_value: e.target.value }))} />
              <input className="input text-sm" type="number" step="0.1" placeholder="Peso (1)"
                     value={form.weight} onChange={(e) => setForm(f => ({ ...f, weight: e.target.value }))} />
              <div className="flex gap-2">
                <button className="btn-primary text-xs flex-1 justify-center" onClick={submit}>Salvar</button>
                <button className="btn-ghost text-xs" onClick={() => setAdding(false)}>✕</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
                    className="flex items-center gap-1.5 text-xs py-1 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--accent-3)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
              <Plus size={12} /> Adicionar nota
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function GradesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    code: '', name: '', professor: '', semester: '2025.1',
    color: '#8B5CF6', total_classes: '',
  })

  const COLORS = ['#8B5CF6','#4d67f5','#10B981','#F59E0B','#EF4444','#06B6D4','#EC4899']

  useEffect(() => {
    api.get('/grades/subjects')
      .then(({ data }) => setSubjects(data))
      .catch(() => toast.error('Erro ao carregar disciplinas'))
      .finally(() => setLoading(false))
  }, [])

  const createSubject = async () => {
    if (!form.code || !form.name) return
    try {
      const { data } = await api.post('/grades/subjects', {
        ...form,
        total_classes: parseInt(form.total_classes) || 0,
        attended: parseInt(form.total_classes) || 0,  // start fully attended
      })
      setSubjects(prev => [...prev, data])
      setForm({ code: '', name: '', professor: '', semester: '2025.1', color: '#8B5CF6', total_classes: '' })
      setCreating(false)
      toast.success('Disciplina criada!')
    } catch { toast.error('Erro ao criar disciplina') }
  }

  const deleteSubject = async (id: string) => {
    await api.delete(`/grades/subjects/${id}`)
    setSubjects(prev => prev.filter(s => s.id !== id))
    toast.success('Disciplina removida')
  }

  const addGrade = async (subjectId: string, grade: Partial<Grade>) => {
    try {
      const { data } = await api.post(`/grades/subjects/${subjectId}/grades`, grade)
      setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, grades: [...s.grades, data] } : s))
    } catch { toast.error('Erro ao adicionar nota') }
  }

  const deleteGrade = async (subjectId: string, gradeId: string) => {
    await api.delete(`/grades/grades/${gradeId}`)
    setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, grades: s.grades.filter(g => g.id !== gradeId) } : s))
  }

  const updateAttendance = async (subjectId: string, total: number, att: number) => {
    // Clamp: never < 0, never > total
    const clamped = Math.max(0, Math.min(att, total))
    try {
      const { data } = await api.patch(`/grades/subjects/${subjectId}`, { total_classes: total, attended: clamped })
      setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, ...data } : s))
    } catch { toast.error('Erro ao atualizar frequência') }
  }

  const allGrades   = subjects.flatMap(s => s.grades)
  const overallAvg  = weightedAvg(allGrades)
  const passing     = subjects.filter(s => { const a = weightedAvg(s.grades); return a !== null && a >= 5 }).length
  const failingAbs  = subjects.filter(s => {
    const absent = s.total_classes - s.attended
    return s.total_classes > 0 && absent > Math.floor(s.total_classes * 0.3)
  }).length

  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-3xl mx-auto w-full">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2 animate-in"
              style={{ color: 'var(--text-primary)' }}>
            <BookOpen size={22} style={{ color: 'var(--accent-3)' }} /> Disciplinas
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {subjects.length} disciplina{subjects.length !== 1 ? 's' : ''} · notas e frequência
          </p>
        </div>
        {!loading && subjects.length > 0 && (
          <div className="flex gap-2 flex-wrap animate-in-delay-1">
            {overallAvg !== null && (
              <div className="card text-center px-4 py-3"
                   style={{ background: overallAvg >= 5 ? 'linear-gradient(135deg, rgba(34,197,94,0.1), var(--bg-card))' : 'linear-gradient(135deg, rgba(239,68,68,0.1), var(--bg-card))' }}>
                <div className="flex items-center gap-1 mb-1" style={{ color: 'var(--text-muted)' }}>
                  <TrendingUp size={10} /><span className="text-[10px] uppercase tracking-wider">Média</span>
                </div>
                <p className="font-display font-bold text-2xl leading-none"
                   style={{ color: overallAvg >= 5 ? '#22c55e' : '#ef4444' }}>{overallAvg.toFixed(1)}</p>
              </div>
            )}
            <div className="card text-center px-4 py-3">
              <div className="flex items-center gap-1 mb-1" style={{ color: 'var(--text-muted)' }}>
                <Award size={10} /><span className="text-[10px] uppercase tracking-wider">Aprov.</span>
              </div>
              <p className="font-display font-bold text-2xl leading-none" style={{ color: 'var(--text-primary)' }}>
                {passing}<span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>/{subjects.length}</span>
              </p>
            </div>
            {failingAbs > 0 && (
              <div className="card text-center px-4 py-3" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), var(--bg-card))' }}>
                <div className="flex items-center gap-1 mb-1" style={{ color: '#f87171' }}>
                  <AlertTriangle size={10} /><span className="text-[10px] uppercase tracking-wider">FF</span>
                </div>
                <p className="font-display font-bold text-2xl leading-none" style={{ color: '#ef4444' }}>{failingAbs}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create form */}
      {creating ? (
        <div className="card mb-5 animate-in space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Nova disciplina</h3>
            <button onClick={() => setCreating(false)} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
            <div>
              <label className="label">Código</label>
              <input className="input text-sm" placeholder="ACH2041" value={form.code}
                     onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} />
            </div>
            <div>
              <label className="label">Semestre</label>
              <input className="input text-sm" placeholder="2025.1" value={form.semester}
                     onChange={(e) => setForm(f => ({ ...f, semester: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Nome da disciplina</label>
              <input className="input text-sm" placeholder="Ex: Estruturas de Dados" value={form.name}
                     onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Professor(a) <span className="normal-case" style={{ color: 'var(--text-muted)' }}>(opcional)</span></label>
              <input className="input text-sm" placeholder="Nome do professor" value={form.professor}
                     onChange={(e) => setForm(f => ({ ...f, professor: e.target.value }))} />
            </div>
            <div>
              <label className="label">Total de aulas no semestre</label>
              <input type="number" className="input text-sm" placeholder="Ex: 60" value={form.total_classes}
                     onChange={(e) => setForm(f => ({ ...f, total_classes: e.target.value }))} />
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Você começa com 0 faltas. Use os botões +/− depois.
              </p>
            </div>
            <div>
              <label className="label">Cor</label>
              <div className="flex gap-2 mt-1">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                          className="w-7 h-7 rounded-full transition-all"
                          style={{ backgroundColor: c, transform: form.color === c ? 'scale(1.25)' : 'scale(1)', boxShadow: form.color === c ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${c}` : 'none' }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn-primary" onClick={createSubject}>Criar disciplina</button>
            <button className="btn-ghost" onClick={() => setCreating(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} className="btn-primary mb-5">
          <Plus size={15} /> Nova disciplina
        </button>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[0,1,2].map(i => (
            <div key={i} className="card space-y-3">
              <div className="flex gap-3"><div className="shimmer w-20 h-5 rounded" /><div className="shimmer flex-1 h-5 rounded" /></div>
              <div className="shimmer h-14 rounded-xl" />
            </div>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma disciplina cadastrada</p>
          <button onClick={() => setCreating(true)} className="text-xs mt-2 inline-block" style={{ color: 'var(--accent-3)' }}>
            + Adicionar primeira disciplina
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((s, i) => (
            <div key={s.id} className="animate-in" style={{ animationDelay: `${i * 40}ms` }}>
              <SubjectCard
                subject={s} onDelete={() => deleteSubject(s.id)}
                onAddGrade={addGrade} onDeleteGrade={deleteGrade}
                onUpdateAttendance={updateAttendance}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
