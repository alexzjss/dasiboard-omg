import type { CSSProperties } from 'react'
import type { EventDto, EventKind } from '../../lib/eventsApi'
import { obrigatoriasData, optativasData } from '../disciplinas/data'
import { computeNodeColors } from '../disciplinas/graphColors'

/** Classe CSS (em calendario.css) que define `--ev-color` a partir de um token, por tipo. */
export const kindClass = (kind: EventKind) => `cal-kind-${kind}`

let subjectColors: Map<string, string> | null = null
/** Mesma cor que o grafo de Disciplinas dá à matéria (propaga pelos pré-requisitos). */
export function subjectColor(code: string): string | undefined {
  subjectColors ??= computeNodeColors([...obrigatoriasData, ...optativasData])
  return subjectColors.get(code)
}

/** Provas e entregas de matéria usam a cor da matéria; o resto fica com a cor do tipo (classe CSS). */
export function eventColorStyle(event: Pick<EventDto, 'kind' | 'scope' | 'scopeValue'>): CSSProperties | undefined {
  if ((event.kind !== 'exam' && event.kind !== 'assignment') || event.scope !== 'class' || !event.scopeValue) return undefined
  const color = subjectColor(event.scopeValue)
  return color ? ({ '--ev-color': color } as CSSProperties) : undefined
}
