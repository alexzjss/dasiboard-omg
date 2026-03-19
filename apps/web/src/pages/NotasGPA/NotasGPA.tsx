import { useState } from 'react'
import { useGPA, useUpsertGrade } from '../../api/hooks'
import { PageHeader, Spinner } from '../../components/ui/index'

// Fluxograma curricular completo de SI — USP/EACH
// IDs sincronizados com o gpa_defaults.json original
const SEMESTERS = [
  { id: 1, label: '1º Semestre', disciplines: [
    { id: 'dACH0041', name: 'Resolução de Problemas I', credits: 8 },
    { id: 'dACH0021', name: 'Tratamento e Análise de Dados e Informações', credits: 4 },
    { id: 'dACH2001', name: 'Introdução à Programação', credits: 4 },
    { id: 'dACH2011', name: 'Cálculo I', credits: 4 },
    { id: 'dACH2014', name: 'Fundamentos de Sistemas de Informação', credits: 4 },
    { id: 'dACH0131', name: 'Ciências da Natureza — Ciência, Cultura e Sociedade', credits: 4 },
    { id: 'dACH0111', name: 'Ciências da Natureza — Ciências da Vida', credits: 4 },
    { id: 'dACH0141', name: 'Sociedade, Multiculturalismo e Direitos', credits: 4 },
  ]},
  { id: 2, label: '2º Semestre', disciplines: [
    { id: 'dACH2010', name: 'Introdução à Análise de Algoritmos', credits: 4 },
    { id: 'dACH2012', name: 'Cálculo II', credits: 4 },
    { id: 'dACH2013', name: 'Matemática Discreta I', credits: 4 },
    { id: 'dACH2023', name: 'Algoritmos e Estruturas de Dados I', credits: 4 },
    { id: 'dACH2033', name: 'Matrizes, Vetores e Geometria Analítica', credits: 4 },
  ]},
  { id: 3, label: '3º Semestre', disciplines: [
    { id: 'dACH2003', name: 'Computação Orientada a Objetos', credits: 4 },
    { id: 'dACH2024', name: 'Algoritmos e Estruturas de Dados II', credits: 4 },
    { id: 'dACH2034', name: 'Organização e Arquitetura de Computadores I', credits: 4 },
    { id: 'dACH2063', name: 'Introdução à Administração e Economia para Computação', credits: 4 },
    { id: 'dACH2053', name: 'Introdução à Estatística', credits: 4 },
  ]},
  { id: 4, label: '4º Semestre', disciplines: [
    { id: 'dACH2004', name: 'Bancos de Dados 1', credits: 4 },
    { id: 'dACH2015', name: 'Redes de Computadores', credits: 4 },
    { id: 'dACH2036', name: 'Métodos Quantitativos para Análise Multivariada', credits: 4 },
    { id: 'dACH2044', name: 'Sistemas Operacionais', credits: 4 },
    { id: 'dACH2045', name: 'Organização e Arquitetura de Computadores II', credits: 4 },
  ]},
  { id: 5, label: '5º Semestre', disciplines: [
    { id: 'dACH2005', name: 'Análise, Projeto e Interface Humano-Computador', credits: 4 },
    { id: 'dACH2016', name: 'Inteligência Artificial', credits: 4 },
    { id: 'dACH2025', name: 'Bancos de Dados 2', credits: 4 },
    { id: 'dACH2043', name: 'Introdução à Teoria da Computação', credits: 4 },
    { id: 'dACH2147', name: 'Desenvolvimento de Sistemas de Informação Distribuídos', credits: 4 },
  ]},
  { id: 6, label: '6º Semestre', disciplines: [
    { id: 'dACH2006', name: 'Resolução de Problemas II', credits: 4 },
    { id: 'dACH2047', name: 'Engenharia de Sistemas de Informação I', credits: 4 },
    { id: 'dACH2055', name: 'Análise de Sistemas de Informação', credits: 4 },
    { id: 'dACH2148', name: 'Empreendedorismo e Inovação em TI', credits: 4 },
  ]},
  { id: 7, label: '7º Semestre (Optativas)', disciplines: [
    { id: 'dACH2007', name: 'Resolução de Problemas III (TCC)', credits: 8 },
    { id: 'opt1', name: 'Optativa 1', credits: 4 },
    { id: 'opt2', name: 'Optativa 2', credits: 4 },
    { id: 'opt3', name: 'Optativa 3', credits: 4 },
    { id: 'opt4', name: 'Optativa 4', credits: 4 },
  ]},
  { id: 8, label: '8º Semestre', disciplines: [
    { id: 'dACH2008', name: 'Resolução de Problemas IV (TCC)', credits: 8 },
  ]},
]

function gradeColor(v: number) {
  if (v >= 7) return 'var(--success)'
  if (v >= 5) return 'var(--warning)'
  return 'var(--danger)'
}

function calcSemAvg(
  disciplines: { id: string; credits: number }[],
  gradeMap: Record<string, number | null>,
) {
  const graded = disciplines.filter((d) => gradeMap[d.id] != null)
  if (!graded.length) return null
  const tw = graded.reduce((s, d) => s + d.credits, 0)
  const ws = graded.reduce((s, d) => s + gradeMap[d.id]! * d.credits, 0)
  return Math.round((ws / tw) * 100) / 100
}

export default function NotasGPA() {
  const { data, isLoading } = useGPA()
  const upsert = useUpsertGrade()

  // Start with only semester 1 expanded
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>(
    Object.fromEntries(SEMESTERS.slice(1).map((s) => [s.id, true])),
  )

  const gradeMap: Record<string, number | null> = {}
  if (data?.grades) {
    for (const g of data.grades) gradeMap[g.disciplineId] = g.grade
  }

  function handleChange(
    disciplineId: string,
    value: string,
    credits: number,
    semester: number,
  ) {
    const grade = value === '' ? null : parseFloat(value)
    if (grade !== null && (grade < 0 || grade > 10)) return
    upsert.mutate({ disciplineId, grade, credits, semester })
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader eyebrow="Desempenho acadêmico" title="Notas & GPA" />
        <Spinner text="Carregando notas..." />
      </div>
    )
  }

  const gpa = data?.gpa

  return (
    <div>
      <PageHeader
        eyebrow="Desempenho acadêmico"
        title="Notas & GPA"
        description="Registre suas notas por disciplina e acompanhe sua média geral ao longo do curso."
      />

      {/* GPA card */}
      <div className="gpa-summary anim-fade-up stagger-2">
        <div className="gpa-main">
          <div className="gpa-label">Média Geral Ponderada</div>
          <div
            className="gpa-number"
            style={{ color: gpa != null ? gradeColor(gpa) : 'var(--text-dim)' }}
          >
            {gpa != null ? gpa.toFixed(2) : '—'}
          </div>
          <div className="gpa-sub">calculado sobre notas lançadas</div>
        </div>
        <div className="gpa-legend">
          {[
            { range: '≥ 7,0', color: 'var(--success)', label: 'Aprovado' },
            { range: '≥ 5,0', color: 'var(--warning)', label: 'Em risco' },
            { range: '< 5,0', color: 'var(--danger)',  label: 'Reprovado' },
          ].map((item) => (
            <div key={item.label} className="gpa-legend-item">
              <span style={{ color: item.color, fontWeight: 700, fontSize: 13 }}>{item.range}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Semester blocks */}
      <div className="semesters anim-fade-up stagger-3">
        {SEMESTERS.map((sem) => {
          const avg = calcSemAvg(sem.disciplines, gradeMap)
          const isOpen = !collapsed[sem.id]
          const gradedCount = sem.disciplines.filter((d) => gradeMap[d.id] != null).length

          return (
            <div key={sem.id} className="sem-block">
              {/* Header */}
              <button
                className="sem-header"
                onClick={() =>
                  setCollapsed((c) => ({ ...c, [sem.id]: !c[sem.id] }))
                }
              >
                <span className="sem-label">{sem.label}</span>
                <span className="sem-progress">
                  {gradedCount}/{sem.disciplines.length} cursadas
                </span>
                {avg != null && (
                  <span className="sem-avg" style={{ color: gradeColor(avg) }}>
                    {avg.toFixed(2)}
                  </span>
                )}
                <span className="sem-chevron">{isOpen ? '▲' : '▼'}</span>
              </button>

              {/* Disciplines */}
              {isOpen && (
                <div className="sem-disciplines">
                  {sem.disciplines.map((d) => {
                    const val = gradeMap[d.id]
                    return (
                      <div key={d.id} className="disc-row">
                        <div className="disc-info">
                          <span className="disc-name">{d.name}</span>
                          <span className="disc-meta">{d.credits} créditos</span>
                        </div>
                        <div className="disc-grade-wrap">
                          {val != null && (
                            <div className="grade-mini-bar">
                              <div
                                className="grade-mini-fill"
                                style={{
                                  width: `${(val / 10) * 100}%`,
                                  background: gradeColor(val),
                                }}
                              />
                            </div>
                          )}
                          <input
                            type="number"
                            min={0} max={10} step={0.1}
                            className="grade-input"
                            value={val ?? ''}
                            placeholder="—"
                            onChange={(e) =>
                              handleChange(d.id, e.target.value, d.credits, sem.id)
                            }
                          />
                          {val != null && (
                            <span
                              className="grade-status"
                              style={{ color: gradeColor(val) }}
                            >
                              {val >= 5 ? '✓' : '✗'}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style>{`
        .gpa-summary {
          display: flex; align-items: center; gap: 32px;
          background: var(--glass); border: 1px solid var(--glass-border);
          border-radius: 16px; padding: 24px 28px; margin-bottom: 28px;
          flex-wrap: wrap;
        }
        .gpa-main { text-align: center; min-width: 120px; }
        .gpa-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); margin-bottom: 6px; }
        .gpa-number { font-size: 56px; font-weight: 800; line-height: 1; margin-bottom: 6px; font-variant-numeric: tabular-nums; }
        .gpa-sub { font-size: 11px; color: var(--text-dim); }
        .gpa-legend { display: flex; flex-direction: column; gap: 8px; }
        .gpa-legend-item { display: flex; align-items: center; gap: 10px; }

        .semesters { display: flex; flex-direction: column; gap: 10px; }
        .sem-block {
          background: var(--glass); border: 1px solid var(--glass-border);
          border-radius: 12px; overflow: hidden;
        }
        .sem-header {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 18px; width: 100%;
          background: none; border: none; cursor: pointer;
          color: var(--text); transition: background .15s; text-align: left;
        }
        .sem-header:hover { background: rgba(255,255,255,.03); }
        .sem-label { flex: 1; font-size: 14px; font-weight: 600; }
        .sem-progress { font-size: 12px; color: var(--text-dim); }
        .sem-avg { font-size: 18px; font-weight: 700; min-width: 40px; text-align: right; }
        .sem-chevron { font-size: 11px; color: var(--text-dim); flex-shrink: 0; }

        .sem-disciplines { border-top: 1px solid var(--glass-border); }
        .disc-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 10px 18px;
          border-bottom: 1px solid var(--glass-border);
          transition: background .1s;
        }
        .disc-row:last-child { border-bottom: none; }
        .disc-row:hover { background: rgba(255,255,255,.02); }
        .disc-info { flex: 1; min-width: 0; }
        .disc-name {
          display: block; font-size: 13px; color: var(--text);
          line-height: 1.4; white-space: nowrap; overflow: hidden;
          text-overflow: ellipsis;
        }
        .disc-meta { display: block; font-size: 11px; color: var(--text-dim); margin-top: 1px; }
        .disc-grade-wrap { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .grade-mini-bar {
          width: 56px; height: 4px; background: var(--glass-border);
          border-radius: 2px; overflow: hidden; flex-shrink: 0;
        }
        .grade-mini-fill { height: 100%; border-radius: 2px; transition: width .4s; }
        .grade-input {
          width: 62px; background: var(--bg2);
          border: 1px solid var(--glass-border); border-radius: 6px;
          padding: 5px 8px; color: var(--text); font-size: 13px;
          text-align: center; font-variant-numeric: tabular-nums;
          transition: border-color .15s;
        }
        .grade-input:focus { outline: none; border-color: var(--primary); }
        .grade-input::placeholder { color: var(--text-dim); }
        .grade-status { font-size: 14px; width: 16px; text-align: center; }

        @media (max-width: 600px) {
          .gpa-summary { flex-direction: column; gap: 16px; }
          .gpa-legend { flex-direction: row; flex-wrap: wrap; gap: 12px; }
          .disc-name { white-space: normal; }
          .grade-mini-bar { display: none; }
        }
      `}</style>
    </div>
  )
}
