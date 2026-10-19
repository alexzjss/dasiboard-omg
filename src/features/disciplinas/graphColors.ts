import type { Discipline, Period } from './data'

// Each "chain" is defined by a root discipline code and a colour palette.
// Colors propagate downstream through the prereq graph.
export const GRAPH_CHAINS: { root: string; color: string; label: string }[] = [
  { root: 'ACH2001', color: '#7c5ce8', label: 'Programação' },        // purple
  { root: 'ACH2011', color: '#0ea5a0', label: 'Cálculo' },            // teal
  { root: 'ACH2013', color: '#e86c5c', label: 'Matemática Discreta' },// red-orange
  { root: 'ACH2014', color: '#d97c2e', label: 'Fund. SI' },           // amber
  { root: 'ACH0021', color: '#5b9bd5', label: 'Dados' },              // blue
  { root: 'ACH2063', color: '#7cad58', label: 'Adm/Econ' },           // green
]
export const CHAIN_NEUTRAL = '#525a6e'

export function computeNodeColors(periods: Period[]): Map<string, string> {
  // Build flat discipline map
  const discMap = new Map<string, Discipline>()
  for (const p of periods) for (const d of p.disciplines) discMap.set(d.code, d)

  // BFS propagation: assign color of the first chain that reaches each node
  const colors = new Map<string, string>()

  // Seed roots
  for (const chain of GRAPH_CHAINS) {
    if (discMap.has(chain.root)) colors.set(chain.root, chain.color)
  }

  // Multiple passes to propagate (max depth = 8 semesters)
  let changed = true
  while (changed) {
    changed = false
    for (const p of periods) {
      for (const d of p.disciplines) {
        if (colors.has(d.code)) continue
        if (!d.prereqs) continue
        // Find the first prereq that already has a color
        for (const req of d.prereqs) {
          if (colors.has(req.code)) {
            colors.set(d.code, colors.get(req.code)!)
            changed = true
            break
          }
        }
      }
    }
  }

  // Remaining uncolored nodes
  for (const p of periods) {
    for (const d of p.disciplines) {
      if (!colors.has(d.code)) colors.set(d.code, CHAIN_NEUTRAL)
    }
  }
  return colors
}
