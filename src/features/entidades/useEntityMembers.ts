import { useEffect, useState } from 'react'
import { listEntityMembers, type EntityMember } from '../../lib/socialApi'

type Result = { id: string; members: EntityMember[] } | { id: string; error: true }

export type EntityMembersState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; members: EntityMember[] }

/** Membros ativos de uma entidade, pelo id (não pelo slug). Troca de id cancela a busca anterior. */
export function useEntityMembers(id: string): EntityMembersState {
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    listEntityMembers(id, controller.signal)
      .then((members) => {
        if (!controller.signal.aborted) setResult({ id, members })
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ id, error: true })
      })
    return () => controller.abort()
  }, [id])

  if (!result || result.id !== id) return { status: 'loading' }
  if ('error' in result) return { status: 'error' }
  return { status: 'ready', members: result.members }
}
