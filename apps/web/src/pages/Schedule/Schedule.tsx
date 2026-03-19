import { useState } from 'react'
import { useSchedule } from '../../api/hooks'
import { PageHeader, Spinner, EmptyState } from '../../components/ui/index'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAYS_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

const TURMA_LABELS: Record<string, string> = {
  '2026102': 'Turma 02 · Diurna',
  '2026104': 'Turma 04 · Noturna',
  '2026194': 'Turma 94 · Noturna',
}

interface Slot {
  id: string; turmaCode: string; semester: number
  dayOfWeek: number; timeStart: string; timeEnd: string
  courseName: string; courseCode?: string; room?: string
  professor?: string; jupiterUrl?: string
}

// Distinct pastel backgrounds per course (cycles)
const PALETTE = [
  'rgba(124,58,237,.12)', 'rgba(59,130,246,.12)', 'rgba(16,185,129,.12)',
  'rgba(245,158,11,.12)', 'rgba(239,68,68,.12)',   'rgba(236,72,153,.12)',
  'rgba(14,165,233,.12)', 'rgba(168,85,247,.12)',  'rgba(20,184,166,.12)',
]

export default function Schedule() {
  const { data: schedule, isLoading } = useSchedule()
  const turmas = Object.keys(schedule ?? {}).sort()
  const [selected, setSelected] = useState<string>('')

  const activeTurma = selected || turmas[0] || ''
  const slots: Slot[] = (schedule?.[activeTurma] ?? []) as Slot[]

  // Assign stable color per course name
  const uniqueCourses = [...new Set(slots.map((s) => s.courseName))]
  const colorMap: Record<string, string> = {}
  uniqueCourses.forEach((c, i) => { colorMap[c] = PALETTE[i % PALETTE.length]! })

  // Group by weekday, skip Sunday (0)
  const byDay: Record<number, Slot[]> = {}
  for (let d = 1; d <= 6; d++) {
    byDay[d] = slots.filter((s) => s.dayOfWeek === d)
  }
  const activeDays = [1, 2, 3, 4, 5, 6].filter((d) => (byDay[d]?.length ?? 0) > 0)

  return (
    <div>
      <PageHeader
        eyebrow="Horários por turma"
        title="Horários de Aula"
        description="Selecione sua turma para ver a grade horária do semestre"
      />

      {isLoading ? (
        <Spinner text="Carregando grade..." />
      ) : turmas.length === 0 ? (
        <EmptyState icon="🗓️" title="Nenhuma grade cadastrada" description="A grade horária ainda não foi importada." />
      ) : (
        <>
          {/* Turma selector */}
          <div className="turma-tabs anim-fade-up stagger-2">
            {turmas.map((t) => (
              <button
                key={t}
                className={`turma-tab ${activeTurma === t ? 'turma-tab--active' : ''}`}
                onClick={() => setSelected(t)}
              >
                <span className="turma-code">{t}</span>
                <span className="turma-label-sm">{TURMA_LABELS[t] ?? t}</span>
              </button>
            ))}
          </div>

          {slots.length === 0 ? (
            <EmptyState icon="📭" title="Nenhuma aula para esta turma" />
          ) : (
            <>
              {/* Stats bar */}
              <div className="schedule-meta anim-fade-up stagger-2">
                <span>{slots.length} aulas semanais</span>
                <span>·</span>
                <span>{uniqueCourses.length} disciplinas</span>
                <span>·</span>
                <span>Semestre {slots[0]?.semester ?? '—'}</span>
              </div>

              {/* Day columns */}
              <div className="schedule-grid anim-fade-up stagger-3">
                {activeDays.map((d) => (
                  <div key={d} className="schedule-day">
                    <div className="schedule-day-header">
                      <span className="day-abbr">{DAYS[d]}</span>
                      <span className="day-full">{DAYS_FULL[d]}</span>
                    </div>
                    <div className="schedule-slots">
                      {(byDay[d] ?? [])
                        .sort((a, b) => a.timeStart.localeCompare(b.timeStart))
                        .map((slot) => (
                          <div
                            key={slot.id}
                            className="schedule-slot"
                            style={{ background: colorMap[slot.courseName] }}
                          >
                            <div className="slot-time">
                              {slot.timeStart} – {slot.timeEnd}
                            </div>
                            <div className="slot-name">{slot.courseName}</div>
                            {slot.courseCode && (
                              <div className="slot-code">{slot.courseCode}</div>
                            )}
                            {slot.room && (
                              <div className="slot-detail">📍 {slot.room}</div>
                            )}
                            {slot.professor && slot.professor !== 'A definir' && (
                              <div className="slot-detail">👤 {slot.professor}</div>
                            )}
                            {slot.jupiterUrl && (
                              <a
                                href={slot.jupiterUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="slot-link"
                              >
                                JupiterWeb ↗
                              </a>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <style>{`
        .turma-tabs { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
        .turma-tab {
          display:flex; flex-direction:column; align-items:flex-start;
          background:var(--glass); border:1px solid var(--glass-border);
          border-radius:10px; padding:8px 14px; cursor:pointer;
          transition:all .15s; min-width:140px;
        }
        .turma-tab:hover { border-color:var(--border); }
        .turma-tab--active { background:var(--primary); border-color:var(--primary); }
        .turma-code { font-size:14px; font-weight:700; color:var(--text); }
        .turma-tab--active .turma-code { color:white; }
        .turma-label-sm { font-size:11px; color:var(--text-muted); margin-top:1px; }
        .turma-tab--active .turma-label-sm { color:rgba(255,255,255,.75); }

        .schedule-meta {
          font-size:12px; color:var(--text-dim); display:flex; gap:6px;
          margin-bottom:16px;
        }
        .schedule-grid {
          display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr));
          gap:12px;
        }
        .schedule-day { display:flex; flex-direction:column; gap:8px; }
        .schedule-day-header {
          display:flex; flex-direction:column; padding:4px 0;
          border-bottom:1px solid var(--glass-border); margin-bottom:2px;
        }
        .day-abbr { font-size:14px; font-weight:700; color:var(--text); }
        .day-full { font-size:10px; color:var(--text-dim); }
        .schedule-slots { display:flex; flex-direction:column; gap:8px; }
        .schedule-slot {
          border:1px solid var(--glass-border); border-radius:10px;
          padding:11px 12px; display:flex; flex-direction:column; gap:3px;
          transition:border-color .15s;
        }
        .schedule-slot:hover { border-color:var(--border); }
        .slot-time {
          font-size:10px; font-weight:600; color:var(--text-dim);
          letter-spacing:.03em; font-variant-numeric:tabular-nums;
        }
        .slot-name { font-size:12px; font-weight:600; color:var(--text); line-height:1.35; }
        .slot-code { font-size:10px; color:var(--text-muted); }
        .slot-detail { font-size:10px; color:var(--text-muted); line-height:1.4; }
        .slot-link {
          font-size:10px; color:var(--primary); text-decoration:none;
          font-weight:500; margin-top:3px; display:inline-block;
        }
        .slot-link:hover { text-decoration:underline; }

        @media (max-width:600px) {
          .schedule-grid { grid-template-columns:1fr; }
        }
      `}</style>
    </div>
  )
}

