import { Router } from 'express'
import { route } from '../lib/errors.js'
import { isAllowedOrigin } from '../lib/middleware.js'
import { requireSession } from '../lib/session.js'
import { getEntity, getMembership, getPersonByHandle, isActiveMember, setMemberRole } from '../social/db.js'
import { isValidHandle } from '../social/handles.js'
import { loadViewer, requireSuperadmin } from '../social/guards.js'
import { ENTITY_ID_PATTERN } from '../social/validation.js'

const router = Router()

// Superadmin only: promote or demote an admin of the entity in the route.
router.put('/api/admin/entities/:id/admins/:handle', isAllowedOrigin, requireSession, loadViewer, requireSuperadmin, route('Changing admin failed', async (req, res) => {
  const entityId = String(req.params.id ?? '')
  const handle = String(req.params.handle ?? '')
  const admin = req.body?.admin
  if (typeof admin !== 'boolean') return res.status(400).json({ error: 'Informe { "admin": true | false }' })
  if (!ENTITY_ID_PATTERN.test(entityId) || !(await getEntity(entityId))) return res.status(404).json({ error: 'Entidade não encontrada' })
  const target = isValidHandle(handle) ? await getPersonByHandle(handle) : null
  if (!target) return res.status(404).json({ error: 'Aluno não encontrado' })
  const membership = await getMembership(entityId, target.user.id)
  if (!isActiveMember(membership)) return res.status(409).json({ error: 'O aluno precisa ser membro ativo da entidade' })
  await setMemberRole(entityId, target.user.id, admin ? 'admin' : 'member')
  res.json({ entityId, handle, role: admin ? 'admin' : 'member' })
}))

export default router
