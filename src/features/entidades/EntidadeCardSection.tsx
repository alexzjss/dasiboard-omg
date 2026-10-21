import type { Entidade } from './data'
import { EntityCard } from './EntityCard'
import { useEntityMembers } from './useEntityMembers'

/** Carta da entidade acima da lista de membros. Some enquanto carrega e se a lista falhar (evita "0 membros" falso). */
export function EntidadeCardSection({ entidade }: { entidade: Entidade }) {
  const state = useEntityMembers(entidade.id)
  if (state.status !== 'ready') return null
  return <EntityCard entidade={entidade} members={state.members} />
}
