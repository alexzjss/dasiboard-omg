import { useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { ColegasLink } from './ColegasLink'
import { DRIVE_URLS, type Discipline, type Period } from './data'
import { CHAIN_NEUTRAL, GRAPH_CHAINS, computeNodeColors } from './graphColors'

const COL_W = 148
const PAD_X = 16
const HEADER_H = 60
const ROW_H = 116
const DOT_ZONE = 44

type Placed = { disc: Discipline; semester: number; x: number; y: number; diameter: number }

function transitive(start: string, edges: Map<string, string[]>) {
  const seen = new Set<string>()
  const stack = [...(edges.get(start) ?? [])]
  while (stack.length) {
    const code = stack.pop()!
    if (seen.has(code)) continue
    seen.add(code)
    stack.push(...(edges.get(code) ?? []))
  }
  return seen
}

/** Constelação: cada disciplina é uma estrela (tamanho = créditos), pré-requisitos viram linhas, uma coluna por semestre. */
export function DisciplinasGraph({ periods }: { periods: Period[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const colors = useMemo(() => computeNodeColors(periods), [periods])

  const { placed, byCode, lines, width, height, prereqsOf, unlocksOf } = useMemo(() => {
    const placed: Placed[] = []
    const byCode = new Map<string, Placed>()
    let maxRows = 0
    periods.forEach((period, semester) => {
      maxRows = Math.max(maxRows, period.disciplines.length)
      period.disciplines.forEach((disc, row) => {
        const item: Placed = {
          disc, semester,
          x: PAD_X + semester * COL_W + COL_W / 2,
          y: HEADER_H + row * ROW_H + DOT_ZONE / 2,
          diameter: Math.min(38, 12 + (disc.credAula + disc.credTrab) * 3.2),
        }
        placed.push(item)
        byCode.set(disc.code, item)
      })
    })
    const prereqsOf = new Map<string, string[]>()
    const unlocksOf = new Map<string, string[]>()
    const lines: { from: string; to: string }[] = []
    for (const { disc } of placed) {
      for (const req of disc.prereqs ?? []) {
        if (!byCode.has(req.code)) continue
        lines.push({ from: req.code, to: disc.code })
        prereqsOf.set(disc.code, [...(prereqsOf.get(disc.code) ?? []), req.code])
        unlocksOf.set(req.code, [...(unlocksOf.get(req.code) ?? []), disc.code])
      }
    }
    return { placed, byCode, lines, width: PAD_X * 2 + periods.length * COL_W, height: HEADER_H + maxRows * ROW_H + 8, prereqsOf, unlocksOf }
  }, [periods])

  const before = useMemo(() => (selected ? transitive(selected, prereqsOf) : new Set<string>()), [selected, prereqsOf])
  const after = useMemo(() => (selected ? transitive(selected, unlocksOf) : new Set<string>()), [selected, unlocksOf])
  const chosen = selected ? byCode.get(selected)?.disc : undefined
  const chosenDrive = chosen ? DRIVE_URLS[chosen.code] : undefined

  function stateOf(code: string) {
    if (!selected) return ''
    if (code === selected) return 'is-selected'
    if (before.has(code)) return 'is-before'
    if (after.has(code)) return 'is-after'
    return 'is-dim'
  }

  function lineState(from: string, to: string) {
    if (!selected) return ''
    const inBefore = (from === selected || before.has(from)) && (to === selected || before.has(to))
    const inAfter = (to === selected || after.has(to)) && (from === selected || after.has(from))
    return inBefore || inAfter ? 'is-lit' : 'is-dim'
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') setSelected(null)
  }

  return (
    <div className="const" onKeyDown={onKeyDown}>
      <div className={`const-detail${chosen ? ' has-selection' : ''}`} aria-live="polite">
        {chosen ? (
          <>
            <div className="const-detail-head">
              <div>
                <span className="const-detail-code mono">{chosen.code}</span>
                <h3>{chosen.name}</h3>
              </div>
              <button type="button" className="const-clear" onClick={() => setSelected(null)}>Limpar</button>
            </div>
            <p className="const-detail-meta mono">
              {chosen.credAula}A + {chosen.credTrab}T · {chosen.ch}h
              {chosen.ce ? ` · CE ${chosen.ce}h` : ''}{chosen.cp ? ` · CP ${chosen.cp}h` : ''}{chosen.ext ? ` · EXT ${chosen.ext}h` : ''}
            </p>
            <dl className="const-detail-rel">
              <dt>Antes dela</dt>
              <dd>
                {chosen.prereqs?.length
                  ? chosen.prereqs.map((r) => <span key={r.code} className="const-rel"><span className="mono">{r.code}</span> {r.name} <em>({r.type})</em></span>)
                  : 'Sem pré-requisito. Dá pra pegar de cara.'}
              </dd>
              <dt>Ela libera</dt>
              <dd>
                {unlocksOf.get(chosen.code)?.length
                  ? unlocksOf.get(chosen.code)!.map((code) => <span key={code} className="const-rel"><span className="mono">{code}</span> {byCode.get(code)?.disc.name}</span>)
                  : 'Nenhuma disciplina depende dela.'}
              </dd>
            </dl>
            <div className="const-colegas"><ColegasLink code={chosen.code} /></div>
            {chosenDrive && <a className="const-drive-link" href={chosenDrive} target="_blank" rel="noopener noreferrer">Abrir no DriveEACH ↗</a>}
          </>
        ) : (
          <p className="const-hint">Toca numa estrela pra ver o que vem antes e o que ela libera. O tamanho é o total de créditos; ↗ marca quem tem material no Drive.</p>
        )}
      </div>

      <div className="const-scroll" role="region" aria-label="Constelação de disciplinas. Role para o lado para ver todos os semestres." tabIndex={0}>
        <div className="const-sky" style={{ width, height }}>
          {periods.map((period, i) => (
            <div key={period.label} className="const-col" style={{ left: PAD_X + i * COL_W, width: COL_W, height }}>
              <span className="const-sem mono">{i + 1}º</span>
              <span className="const-sem-label">semestre</span>
            </div>
          ))}
          <svg className="const-lines" width={width} height={height} aria-hidden="true" focusable="false">
            {lines.map(({ from, to }) => {
              const a = byCode.get(from)!, b = byCode.get(to)!
              return (
                <line
                  key={`${from}-${to}`} className={`const-line ${lineState(from, to)}`}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.get(from) ?? CHAIN_NEUTRAL}
                />
              )
            })}
          </svg>
          {placed.map(({ disc, x, y, diameter }) => {
            const hasDrive = Boolean(DRIVE_URLS[disc.code])
            return (
              <button
                key={disc.code}
                type="button"
                className={`const-node ${stateOf(disc.code)}`}
                style={{ left: x - (COL_W - 12) / 2, top: y - DOT_ZONE / 2, width: COL_W - 12, '--star': colors.get(disc.code) ?? CHAIN_NEUTRAL, '--d': `${diameter}px` } as CSSProperties}
                aria-pressed={selected === disc.code}
                onClick={() => setSelected(selected === disc.code ? null : disc.code)}
              >
                <span className="const-dot" aria-hidden="true" />
                <span className="const-code mono">{disc.code}{hasDrive && <span className="const-drive-mark" aria-hidden="true">↗</span>}</span>
                <span className="const-name">{disc.name}</span>
                <span className="sr-only">, {disc.credAula + disc.credTrab} créditos{hasDrive ? ', tem material no Drive' : ''}</span>
              </button>
            )
          })}
        </div>
      </div>

      <ul className="const-legend" aria-label="Cores por trilha">
        {GRAPH_CHAINS.map((chain) => (
          <li key={chain.root}><span className="const-legend-dot" style={{ background: chain.color }} aria-hidden="true" />{chain.label}</li>
        ))}
        <li><span className="const-legend-dot" style={{ background: CHAIN_NEUTRAL }} aria-hidden="true" />Isoladas</li>
      </ul>
    </div>
  )
}
