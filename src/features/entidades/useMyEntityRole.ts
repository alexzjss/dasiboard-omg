import { useEffect, useState } from 'react'
import { getMyProfile } from '../../lib/socialApi'

export type EntityRoleState = { member: boolean; admin: boolean }

/** Papel do usuário na entidade, pelo perfil próprio. Superadmin conta como admin. Falha ao carregar vale "sem papel", em silêncio. */
export function useMyEntityRole(entidadeId: string): EntityRoleState {
  const [state, setState] = useState<(EntityRoleState & { id: string }) | null>(null)
  useEffect(() => {
    let live = true
    getMyProfile()
      .then((me) => {
        if (!live) return
        const admin = me.isSuperadmin || me.adminOf.includes(entidadeId)
        setState({ id: entidadeId, admin, member: admin || me.entities.some((m) => m.entityId === entidadeId) })
      })
      .catch(() => undefined)
    return () => { live = false }
  }, [entidadeId])
  return state?.id === entidadeId ? state : { member: false, admin: false }
}
