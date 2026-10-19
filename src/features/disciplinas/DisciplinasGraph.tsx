import { useLayoutEffect, useRef, useState } from 'react'
import { DRIVE_URLS, type Period } from './data'
import { CHAIN_NEUTRAL, GRAPH_CHAINS, computeNodeColors } from './graphColors'

type EdgeInfo = { fromCode: string; toCode: string; color: string }
type NodeRect = { code: string; x: number; y: number; w: number; h: number }

export function DisciplinasGraph({ periods }: { periods: Period[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState<EdgeInfo[]>([])
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 })
  const colors = useRef(computeNodeColors(periods)).current

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const rects = new Map<string, NodeRect>()

    container.querySelectorAll<HTMLElement>('[data-code]').forEach((el) => {
      const code = el.dataset.code!
      const r = el.getBoundingClientRect()
      rects.set(code, {
        code,
        x: r.left - containerRect.left,
        y: r.top - containerRect.top,
        w: r.width,
        h: r.height,
      })
    })

    const newEdges: EdgeInfo[] = []
    for (const p of periods) {
      for (const d of p.disciplines) {
        if (!d.prereqs) continue
        for (const req of d.prereqs) {
          if (rects.has(req.code) && rects.has(d.code)) {
            newEdges.push({ fromCode: req.code, toCode: d.code, color: colors.get(req.code) ?? CHAIN_NEUTRAL })
          }
        }
      }
    }

    setSvgSize({ w: container.scrollWidth, h: container.scrollHeight })
    setEdges(newEdges)
  }, [periods, colors])

  function buildPath(edge: EdgeInfo) {
    const container = containerRef.current
    if (!container) return ''
    const containerRect = container.getBoundingClientRect()
    const fromEl = container.querySelector<HTMLElement>(`[data-code="${edge.fromCode}"]`)
    const toEl = container.querySelector<HTMLElement>(`[data-code="${edge.toCode}"]`)
    if (!fromEl || !toEl) return ''
    const fr = fromEl.getBoundingClientRect()
    const tr = toEl.getBoundingClientRect()
    // Offset by container's viewport position AND add scroll to get content-space coords
    const ox = containerRect.left - container.scrollLeft
    const oy = containerRect.top - container.scrollTop

    const x1 = fr.right - ox
    const y1 = fr.top - oy + fr.height / 2
    const x2 = tr.left - ox
    const y2 = tr.top - oy + tr.height / 2
    const cx = (x1 + x2) / 2
    return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`
  }

  return (
    <div className="disc-graph-wrap" ref={containerRef}>
      <svg
        className="disc-graph-svg"
        width={svgSize.w}
        height={svgSize.h}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        {edges.map((e) => {
          const d = buildPath(e)
          if (!d) return null
          return (
            <path
              key={`${e.fromCode}-${e.toCode}`}
              d={d}
              stroke={e.color}
              strokeWidth="1.5"
              strokeOpacity="0.55"
              fill="none"
              strokeDasharray="none"
            />
          )
        })}
      </svg>

      <div className="disc-graph-grid">
        {periods.map((period, pIdx) => (
          <div key={period.label} className="disc-graph-col">
            <div className="disc-graph-col-header">
              <span className="disc-graph-sem-num">{pIdx + 1}º</span>
              <span className="disc-graph-sem-label">sem.</span>
            </div>
            <div className="disc-graph-col-nodes">
              {period.disciplines.map((disc) => {
                const color = colors.get(disc.code) ?? CHAIN_NEUTRAL
                const driveUrl = DRIVE_URLS[disc.code]
                return (
                  <div
                    key={disc.code}
                    data-code={disc.code}
                    className={`disc-graph-node${driveUrl ? ' disc-graph-node-linked' : ''}`}
                    style={{ '--node-color': color } as React.CSSProperties}
                    title={driveUrl ? `${disc.code} — ${disc.name}\nClique para abrir no DriveEACH` : `${disc.code} — ${disc.name}\n${disc.credAula}A ${disc.credTrab}T · ${disc.ch}h`}
                    onClick={driveUrl ? () => window.open(driveUrl, '_blank', 'noopener') : undefined}
                    role={driveUrl ? 'link' : undefined}
                    tabIndex={driveUrl ? 0 : undefined}
                    onKeyDown={driveUrl ? (e: React.KeyboardEvent) => e.key === 'Enter' && window.open(driveUrl, '_blank', 'noopener') : undefined}
                  >
                    <span className="disc-graph-node-code">{disc.code}</span>
                    <span className="disc-graph-node-name">{disc.name}</span>
                    {driveUrl && (
                      <span className="disc-graph-node-drive">
                        <svg viewBox="0 0 10 10" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 1.5H1.5a.5.5 0 0 0-.5.5v6a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5V6M6 1h3v3M9 1 4.5 5.5"/></svg>
                        Drive
                      </span>
                    )}
                    {(disc.ce != null && disc.ce > 0 || disc.ext != null && disc.ext! > 0) && (
                      <span className="disc-graph-node-ext">
                        {disc.ce && disc.ce > 0 ? `CE ${disc.ce}h` : ''}
                        {disc.ext && disc.ext > 0 ? ` EXT ${disc.ext}h` : ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="disc-graph-legend">
        {GRAPH_CHAINS.map((chain) => (
          <span key={chain.root} className="disc-graph-legend-item">
            <span className="disc-graph-legend-dot" style={{ background: chain.color }} />
            {chain.label}
          </span>
        ))}
        <span className="disc-graph-legend-item">
          <span className="disc-graph-legend-dot" style={{ background: CHAIN_NEUTRAL }} />
          Isoladas
        </span>
      </div>
    </div>
  )
}
