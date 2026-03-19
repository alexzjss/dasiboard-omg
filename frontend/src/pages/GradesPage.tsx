import { useEffect, useState } from 'react'
import { Plus, Trash2, BookOpen, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/utils/api'
import clsx from 'clsx'

interface Grade   { id: string; label: string; value: number; weight: number; max_value: number; notes?: string }
interface Subject { id: string; code: string; name: string; professor?: string; semester: string; color: string; grades: Grade[] }

function weightedAvg(grades: Grade[]) {
  const totalWeight = grades.reduce((a, g) => a + g.weight, 0)
  if (!totalWeight) return null
  return grades.reduce((a, g) => a + (g.value / g.max_value) * 10 * g.weight, 0) / totalWeight
}

function SubjectCard({ subject, onDelete, onAddGrade, onDeleteGrade }: {
  subject: Subject
  onDelete: () => void
  onAddGrade: (subjectId: string, grade: Partial<Grade>) => void
  onDeleteGrade: (subjectId: string, gradeId: string) => void
}) {
  const [open, setOpen]         = useState(false)
  const [adding, setAdding]     = useState(false)
  const [form, setForm]         = useState({ label: '', value: '', weight: '1', max_value: '10' })

  const avg = weightedAvg(subject.grades)
  const passFail = avg === null ? null : avg >= 5

  const submitGrade = () => {
    if (!form.label || !form.value) return
    onAddGrade(subject.id, {
      label: form.label,
      value: parseFloat(form.value),
      weight: parseFloat(form.weight),
      max_value: parseFloat(form.max_value),
    })
    setForm({ label: '', value: '', weight: '1', max_value: '10' })
    setAdding(false)
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500">{subject.code}</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-500">{subject.semester}</span>
          </div>
          <h3 className="font-display font-bold text-white truncate">{subject.name}</h3>
          {subject.professor && <p className="text-xs text-slate-500 mt-0.5">{subject.professor}</p>}
        </div>

        {/* Average badge */}
        <div className={clsx(
          'px-3 py-1.5 rounded-xl text-center min-w-[56px]',
          avg === null ? 'bg-slate-800' :
          passFail ? 'bg-emerald-900/40 border border-emerald-700/40' : 'bg-red-900/40 border border-red-700/40'
        )}>
          <p className={clsx('font-display font-bold text-lg leading-none',
            avg === null ? 'text-slate-600' : passFail ? 'text-emerald-400' : 'text-red-400'
          )}>
            {avg !== null ? avg.toFixed(1) : '—'}
          </p>
          <p className="text-[9px] text-slate-600 mt-0.5">média</p>
        </div>

        <button onClick={() => setOpen(!open)} className="text-slate-600 hover:text-slate-400 transition-colors">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <button onClick={onDelete} className="text-slate-700 hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Grades list */}
      {open && (
        <div className="mt-4 border-t border-slate-800 pt-4 space-y-2 animate-in">
          {subject.grades.length === 0 && (
            <p className="text-xs text-slate-600 text-center py-2">Nenhuma nota cadastrada</p>
          )}
          {subject.grades.map((g) => (
            <div key={g.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 group">
              <div className="flex-1">
                <span className="text-sm text-slate-300 font-medium">{g.label}</span>
                {g.notes && <p className="text-xs text-slate-600">{g.notes}</p>}
              </div>
              <span className="text-xs text-slate-500">peso {g.weight}</span>
              <span className="font-mono font-bold text-sm text-white">{g.value}/{g.max_value}</span>
              <button
                onClick={() => onDeleteGrade(subject.id, g.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {adding ? (
            <div className="grid grid-cols-2 gap-2 mt-3">
              <input className="input text-sm col-span-2" placeholder="Ex: P1, P2, Trabalho" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
              <input className="input text-sm" type="number" placeholder="Nota (ex: 8.5)" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
              <input className="input text-sm" type="number" placeholder="Nota máx (10)" value={form.max_value} onChange={(e) => setForm((f) => ({ ...f, max_value: e.target.value }))} />
              <input className="input text-sm" type="number" placeholder="Peso (1)" value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} />
              <div className="flex gap-2">
                <button className="btn-primary text-xs flex-1" onClick={submitGrade}>Salvar</button>
                <button className="btn-ghost text-xs" onClick={() => setAdding(false)}>✕</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-brand-400 transition-colors mt-1">
              <Plus size={12} /> Adicionar nota
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function GradesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm]         = useState({ code: '', name: '', professor: '', semester: '2025.1', color: '#8B5CF6' })

  const COLORS = ['#8B5CF6', '#4d67f5', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899']

  useEffect(() => {
    api.get('/grades/subjects')
      .then(({ data }) => setSubjects(data))
      .catch(() => toast.error('Erro ao carregar disciplinas'))
      .finally(() => setLoading(false))
  }, [])

  const createSubject = async () => {
    if (!form.code || !form.name) return
    try {
      const { data } = await api.post('/grades/subjects', form)
      setSubjects((prev) => [...prev, data])
      setForm({ code: '', name: '', professor: '', semester: '2025.1', color: '#8B5CF6' })
      setCreating(false)
    } catch { toast.error('Erro ao criar disciplina') }
  }

  const deleteSubject = async (id: string) => {
    await api.delete(`/grades/subjects/${id}`)
    setSubjects((prev) => prev.filter((s) => s.id !== id))
  }

  const addGrade = async (subjectId: string, grade: Partial<Grade>) => {
    try {
      const { data } = await api.post(`/grades/subjects/${subjectId}/grades`, grade)
      setSubjects((prev) =>
        prev.map((s) => s.id === subjectId ? { ...s, grades: [...s.grades, data] } : s)
      )
    } catch { toast.error('Erro ao adicionar nota') }
  }

  const deleteGrade = async (subjectId: string, gradeId: string) => {
    await api.delete(`/grades/grades/${gradeId}`)
    setSubjects((prev) =>
      prev.map((s) => s.id === subjectId ? { ...s, grades: s.grades.filter((g) => g.id !== gradeId) } : s)
    )
  }

  const allGrades = subjects.flatMap((s) => s.grades)
  const overallAvg = weightedAvg(allGrades)

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen size={22} className="text-violet-400" /> Notas
          </h1>
          <p className="text-slate-500 text-sm mt-1">Suas disciplinas e notas do semestre</p>
        </div>
        {overallAvg !== null && (
          <div className="card text-center px-5">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <TrendingUp size={12} /> Média geral
            </div>
            <p className={clsx('font-display font-bold text-2xl', overallAvg >= 5 ? 'text-emerald-400' : 'text-red-400')}>
              {overallAvg.toFixed(1)}
            </p>
          </div>
        )}
      </div>

      {/* Add subject */}
      {creating ? (
        <div className="card mb-6 animate-in space-y-3">
          <h3 className="font-display font-bold text-white text-sm">Nova disciplina</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Código</label>
              <input className="input text-sm" placeholder="ACH2041" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            </div>
            <div>
              <label className="label">Semestre</label>
              <input className="input text-sm" placeholder="2025.1" value={form.semester} onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Nome</label>
              <input className="input text-sm" placeholder="Nome da disciplina" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Professor(a) <span className="normal-case text-slate-600">(opcional)</span></label>
              <input className="input text-sm" placeholder="Nome do professor" value={form.professor} onChange={(e) => setForm((f) => ({ ...f, professor: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Cor</label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={clsx('w-7 h-7 rounded-full transition-transform', form.color === c && 'scale-125 ring-2 ring-white/30')}
                    style={{ backgroundColor: c }}
                  />
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
        <button onClick={() => setCreating(true)} className="btn-primary mb-6">
          <Plus size={15} /> Nova disciplina
        </button>
      )}

      {/* List */}
      {loading ? (
        <div className="text-slate-600 text-sm text-center py-12">Carregando…</div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16 text-slate-600">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma disciplina cadastrada ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((s) => (
            <SubjectCard
              key={s.id}
              subject={s}
              onDelete={() => deleteSubject(s.id)}
              onAddGrade={addGrade}
              onDeleteGrade={deleteGrade}
            />
          ))}
        </div>
      )}
    </div>
  )
}
