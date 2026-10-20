import { Router } from 'express'
import { route } from '../lib/errors.js'
import { isAllowedOrigin } from '../lib/middleware.js'
import { rateLimit } from '../lib/rateLimit.js'
import { requireSession } from '../lib/session.js'
import {
  findEntityByCodeHash, getEntity, getMembership, getPersonByHandle, isActiveMember, joinEntity, leaveEntity, listMembers, setEntityCodeHash, setMemberTitle,
  type EntityRow,
} from '../social/db.js'
import { isValidHandle } from '../social/handles.js'
import { loadViewer, requireEntityAdmin, viewerOf } from '../social/guards.js'
import { generateInviteCode, hashInviteCode, normalizeInviteCode } from '../social/inviteCode.js'
import { notify } from '../social/notify.js'
import { personMini } from '../social/presenters.js'
import { ENTITY_ID_PATTERN, MAX_TITLE_LENGTH } from '../social/validation.js'

const router = Router()
const authed = [requireSession, loadViewer]
const authedWrite = [isAllowedOrigin, requireSession, loadViewer]
const ENTITY_NOT_FOUND = { error: 'Entidade não encontrada' }
// One answer for malformed, unknown and rotated codes so nothing can be inferred from the response.
const INVALID_CODE = { error: 'Código inválido' }

// Per (ip, user) 5 attempts per 10 minutes, wrong or right.
router.post('/api/entities/join', ...authedWrite, rateLimit('join', 5, 10 * 60_000), route('Joining entity failed', async (req, res) => {
  const viewer = viewerOf(res)
  const code = normalizeInviteCode(req.body?.code)
  if (!code) return res.status(404).json(INVALID_CODE)
  const entity = await findEntityByCodeHash(hashInviteCode(code))
  if (!entity) return res.status(404).json(INVALID_CODE)
  if (!isActiveMember(await getMembership(entity.id, viewer.id))) {
    await joinEntity(entity, viewer.id)
    const admins = (await listMembers(entity.id)).filter((m) => m.role === 'admin').map((m) => m.person.user.id)
    await notify(admins, { type: 'entity_joined', actorId: viewer.id, entityId: entity.id }, { excludeId: viewer.id })
  }
  res.json({ entity: { id: entity.id, name: entity.name } })
}))

router.delete('/api/entities/:id/membership', ...authedWrite, route('Leaving entity failed', async (req, res) => {
  const viewer = viewerOf(res)
  const entityId = String(req.params.id ?? '')
  if (!ENTITY_ID_PATTERN.test(entityId)) return res.status(404).json(ENTITY_NOT_FOUND)
  if (!isActiveMember(await getMembership(entityId, viewer.id))) return res.status(404).json({ error: 'Você não participa desta entidade' })
  await leaveEntity(entityId, viewer.id)
  res.status(204).end()
}))

router.get('/api/entities/:id/members', ...authed, route('Listing members failed', async (req, res) => {
  const entityId = String(req.params.id ?? '')
  if (!ENTITY_ID_PATTERN.test(entityId) || !(await getEntity(entityId))) return res.status(404).json(ENTITY_NOT_FOUND)
  const members = await listMembers(entityId)
  res.json({ members: members.map(({ person, role, joinedAt, title }) => ({ ...personMini(person), role, joinedAt, title })) })
}))

router.post('/api/entities/:id/invite-code', ...authedWrite, requireEntityAdmin, rateLimit('invite-code', 10, 10 * 60_000), route('Generating invite code failed', async (_req, res) => {
  const entity = res.locals.entity as EntityRow
  let code = generateInviteCode()
  // Collisions across entities would make a code ambiguous; practically impossible, but cheap to rule out.
  for (let attempt = 0; attempt < 5 && (await findEntityByCodeHash(hashInviteCode(code))); attempt++) code = generateInviteCode()
  await setEntityCodeHash(entity.id, hashInviteCode(code))
  res.setHeader('Cache-Control', 'no-store')
  res.json({ code }) // the only time the plain code is ever returned
}))

router.put('/api/entities/:id/members/:handle/title', ...authedWrite, requireEntityAdmin, route('Setting title failed', async (req, res) => {
  const entity = res.locals.entity as EntityRow
  const raw = req.body?.title
  if (raw !== null && typeof raw !== 'string') return res.status(400).json({ error: 'Cargo inválido' })
  const title = raw === null ? null : raw.trim() || null
  if (title && title.length > MAX_TITLE_LENGTH) return res.status(400).json({ error: `O cargo deve ter no máximo ${MAX_TITLE_LENGTH} caracteres` })
  const viewer = viewerOf(res)
  const handle = String(req.params.handle ?? '')
  const target = isValidHandle(handle) ? await getPersonByHandle(handle) : null
  if (!target || !isActiveMember(await getMembership(entity.id, target.user.id))) return res.status(404).json({ error: 'Membro não encontrado' })
  const previous = (await listMembers(entity.id)).find((m) => m.person.user.id === target.user.id)?.title ?? null
  await setMemberTitle(entity.id, target.user.id, title)
  if (title && title !== previous) await notify([target.user.id], { type: 'entity_role_changed', actorId: viewer.id, entityId: entity.id, payload: { title } })
  res.json({ handle: target.profile.handle, title })
}))

router.delete('/api/entities/:id/members/:handle', ...authedWrite, requireEntityAdmin, route('Removing member failed', async (req, res) => {
  const viewer = viewerOf(res)
  const entity = res.locals.entity as EntityRow
  const handle = String(req.params.handle ?? '')
  const target = isValidHandle(handle) ? await getPersonByHandle(handle) : null
  const membership = target ? await getMembership(entity.id, target.user.id) : null
  if (!target || !isActiveMember(membership)) return res.status(404).json({ error: 'Membro não encontrado' })
  if (target.user.id === viewer.id) return res.status(400).json({ error: 'Use "sair da entidade" para remover a si mesmo' })
  // Only a superadmin may remove another admin.
  if (membership.role === 'admin' && !viewer.isSuperadmin) return res.status(403).json({ error: 'Acesso negado' })
  await leaveEntity(entity.id, target.user.id)
  await notify([target.user.id], { type: 'entity_removed', actorId: viewer.id, entityId: entity.id })
  res.status(204).end()
}))

export default router
