import { useState } from 'react'
import { useFaltas, useUpsertFalta } from '../../api/hooks'
import { useAuthStore } from '../../stores/authStore'
import { PageHeader, Spinner, Button, Modal, EmptyState } from '../../components/ui/index'
import {
  absencePercent, absenceStatus,
  ABSENCE_STATUS_LABELS, ABSENCE_STATUS_COLORS,
} from '../../utils/index'

interface FormState {
  code: string
  disciplineName: string
  totalClasses: number
  absences: number
}

const EMPTY_FORM: FormState = { code: '', disciplineName: '', totalClasses: 0, absences: 0 }

export default function Faltas() {
  const user = useAuthStore((s) => s.user)
  const { data: absences = [], isLoading } = useFaltas()
  const upsert = useUpsertFalta()

  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  function openModal() {
    setForm(EMPTY_FORM)
    setFormError('')
    setModal(true)
  }

  function save() {
    if (!form.code.trim()) return setFormError('Informe o código da disciplina.')
    if (!form.disciplineName.trim()) return setFormError('Informe o nome da disciplina.')
    if (form.absences > form.totalClasses) return setFormError('Faltas não podem exceder o total de aulas.')
    setFormError('')
    upsert.mutate(
      { code: form.code.trim(), disciplineName: form.disciplineName.trim(), totalClasses: form.totalClasses, absences: form.absences },
      { onSuccess: () => setModal(false) },
    )
  }

  function bump(code: string, disciplineName: string, totalClasses: number, current: number, delta: number) {
    const next = Math.max(0, Math.min(current + delta, totalClasses))
    upsert.mutate({ code, disciplineName, totalClasses, absences: next })
  }

  if (!user) {
    return (
      <div>
        <PageHeader eyebrow="Controle acadêmico" title="Controle de Faltas" />
        <EmptyState icon="🔒" title="Login necessário" description="Faça login para monitorar suas faltas." />
      </div>
    )
  }

  // Summary stats
  const reprovados = absences.filter((a) => absencePercent(a.absences, a.totalClasses) >= 30).length
  const emPerigo   = absences.filter((a) => {
    const p = absencePercent(a.absences, a.totalClasses)
    return p >= 20 && p < 30
  }).length

  return (
    <div>
      <PageHeader
        eyebrow="Controle acadêmico"
        title="Controle de Faltas"
        description="Monitore suas ausências — limite de 30% das aulas para aprovação"
      />

      {/* Summary bar */}
      {absences.length > 0 && (
        <div className="faltas-summary anim-fade-up stagger-2">
          <div className="summary-stat">
            <span className="summary-num">{absences.length}</span>
            <span className="summary-label">disciplinas</span>
          </div>
          {reprovados > 0 && (
            <div className="summary-stat summary-stat--danger">
              <span className="summary-num">{reprovados}</span>
              <span className="summary-label">{reprovados === 1 ? 'reprovada' : 'reprovadas'}</span>
            </div>
          )}
          {emPerigo > 0 && (
            <div className="summary-stat summary-stat--warn">
              <span className="summary-num">{emPerigo}</span>
              <span className="summary-label">em perigo</span>
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 20 }} className="anim-fade-up stagger-2">
        <Button onClick={openModal}>+ Adicionar disciplina</Button>
      </div>

      {isLoading ? (
        <Spinner text="Carregando faltas..." />
      ) : absences.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Nenhuma disciplina cadastrada"
          description="Adicione suas disciplinas para monitorar faltas e evitar reprovações."
        />
      ) : (
        <div className="faltas-grid anim-fade-up stagger-3">
          {absences
            .slice()
            .sort((a, b) => absencePercent(b.absences, b.totalClasses) - absencePercent(a.absences, a.totalClasses))
            .map((abs) => {
              const pct    = absencePercent(abs.absences, abs.totalClasses)
              const status = absenceStatus(pct)
              const color  = ABSENCE_STATUS_COLORS[status]
              const label  = ABSENCE_STATUS_LABELS[status]
              const limit  = Math.floor(abs.totalClasses * 0.3)
              const remaining = Math.max(0, limit - abs.absences)

              return (
                <div key={abs.id} className="falta-card">
                  {/* Header */}
                  <div className="falta-card-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="falta-disc-name">{abs.disciplineName}</div>
                      <div className="falta-disc-code">{abs.disciplineCode}</div>
                    </div>
                    <span className="falta-status-badge" style={{ color }}>
                      {label}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="falta-bar-track">
                    <div
                      className="falta-bar-fill"
                      style={{ width: `${Math.min(100, pct)}%`, background: color }}
                    />
                    {/* 30% limit marker */}
                    <div className="falta-bar-marker" />
                  </div>

                  {/* Stats */}
                  <div className="falta-stats">
                    <span>
                      <strong style={{ color }}>{abs.absences}</strong>
                      {' '}faltas de{' '}
                      <strong>{abs.totalClasses}</strong> aulas
                    </span>
                    <span className="falta-pct">{pct.toFixed(1)}%</span>
                  </div>

                  {remaining > 0 && status !== 'reprovado' && (
                    <div className="falta-remaining">
                      Pode faltar mais{' '}
                      <strong style={{ color: 'var(--text-muted)' }}>{remaining}</strong>{' '}
                      {remaining === 1 ? 'aula' : 'aulas'}
                    </div>
                  )}
                  {status === 'reprovado' && (
                    <div className="falta-remaining" style={{ color: 'var(--danger)' }}>
                      Limite de 30% atingido
                    </div>
                  )}

                  {/* Counter controls */}
                  <div className="falta-controls">
                    <button
                      className="falta-btn"
                      onClick={() => bump(abs.disciplineCode, abs.disciplineName, abs.totalClasses, abs.absences, -1)}
                      disabled={abs.absences === 0 || upsert.isPending}
                      title="Remover 1 falta"
                    >
                      −
                    </button>
                    <span className="falta-counter">{abs.absences}</span>
                    <button
                      className="falta-btn falta-btn--add"
                      onClick={() => bump(abs.disciplineCode, abs.disciplineName, abs.totalClasses, abs.absences, 1)}
                      disabled={abs.absences >= abs.totalClasses || upsert.isPending}
                      title="Adicionar 1 falta"
                    >
                      +
                    </button>
                    <span className="falta-total">/ {abs.totalClasses} aulas</span>
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Add discipline modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Adicionar disciplina" maxWidth={400}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {formError && (
            <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: 'var(--danger)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
              {formError}
            </div>
          )}

          {[
            { key: 'code',           label: 'Código',          placeholder: 'ex: ACH0041', type: 'text' },
            { key: 'disciplineName', label: 'Nome da disciplina', placeholder: 'ex: Resolução de Problemas I', type: 'text' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                {label}
              </label>
              <input
                type={type}
                className="modal-field"
                placeholder={placeholder}
                value={String(form[key as keyof FormState])}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
              />
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { key: 'totalClasses', label: 'Total de aulas' },
              { key: 'absences',     label: 'Faltas atuais' },
            ].map(({ key, label }) => (
              <div key={key} style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
                  {label}
                </label>
                <input
                  type="number" min={0} className="modal-field"
                  value={Number(form[key as keyof FormState])}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, [key]: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            ))}
          </div>

          <Button onClick={save} disabled={upsert.isPending}>
            {upsert.isPending ? 'Salvando…' : 'Salvar disciplina'}
          </Button>
        </div>
      </Modal>

      <style>{`
        .faltas-summary {
          display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;
        }
        .summary-stat {
          display: flex; flex-direction: column; align-items: center;
          background: var(--glass); border: 1px solid var(--glass-border);
          border-radius: 10px; padding: 12px 20px; min-width: 80px;
        }
        .summary-stat--danger { border-color: rgba(239,68,68,.3); background: rgba(239,68,68,.06); }
        .summary-stat--warn   { border-color: rgba(245,158,11,.3); background: rgba(245,158,11,.06); }
        .summary-num { font-size: 24px; font-weight: 800; color: var(--text); }
        .summary-stat--danger .summary-num { color: var(--danger); }
        .summary-stat--warn .summary-num { color: var(--warning); }
        .summary-label { font-size: 11px; color: var(--text-dim); margin-top: 2px; }

        .faltas-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
        .falta-card {
          background: var(--glass); border: 1px solid var(--glass-border);
          border-radius: 12px; padding: 16px;
          display: flex; flex-direction: column; gap: 10px;
          transition: border-color .15s;
        }
        .falta-card:hover { border-color: var(--border); }
        .falta-card-header { display: flex; align-items: flex-start; gap: 8px; }
        .falta-disc-name { font-size: 13px; font-weight: 600; color: var(--text); line-height: 1.3; }
        .falta-disc-code { font-size: 11px; color: var(--text-dim); margin-top: 2px; }
        .falta-status-badge { font-size: 11px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }

        .falta-bar-track {
          height: 6px; background: var(--bg3); border-radius: 3px;
          position: relative; overflow: visible;
        }
        .falta-bar-fill {
          height: 100%; border-radius: 3px;
          transition: width .35s, background .35s;
        }
        .falta-bar-marker {
          position: absolute; top: -3px; bottom: -3px;
          left: 30%; width: 2px; background: rgba(255,255,255,.25);
          border-radius: 1px;
        }

        .falta-stats {
          display: flex; justify-content: space-between;
          font-size: 13px; color: var(--text-muted);
        }
        .falta-pct { font-size: 12px; color: var(--text-dim); }
        .falta-remaining { font-size: 11px; color: var(--text-dim); }

        .falta-controls {
          display: flex; align-items: center; gap: 8px; margin-top: 2px;
        }
        .falta-btn {
          width: 30px; height: 30px; border-radius: 7px;
          border: 1px solid var(--glass-border); background: var(--glass);
          cursor: pointer; font-size: 18px; line-height: 1; color: var(--text-muted);
          display: flex; align-items: center; justify-content: center;
          transition: all .15s;
        }
        .falta-btn:not(:disabled):hover { color: var(--text); background: var(--glass-border); }
        .falta-btn--add:not(:disabled):hover { color: var(--success); }
        .falta-btn:disabled { opacity: .35; cursor: not-allowed; }
        .falta-counter {
          font-size: 16px; font-weight: 700; color: var(--text);
          min-width: 28px; text-align: center; font-variant-numeric: tabular-nums;
        }
        .falta-total { font-size: 12px; color: var(--text-dim); }

        .modal-field {
          width: 100%; background: var(--glass);
          border: 1px solid var(--glass-border); border-radius: 8px;
          padding: 9px 12px; color: var(--text); font-size: 13px;
          font-family: inherit; transition: border-color .15s;
        }
        .modal-field:focus { outline: none; border-color: var(--primary); }
        .modal-field::placeholder { color: var(--text-dim); }

        @media (max-width: 480px) {
          .faltas-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
