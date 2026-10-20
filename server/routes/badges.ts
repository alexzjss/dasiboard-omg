import { Router, type Request, type Response } from 'express'
import { route } from '../lib/errors.js'
import { isAllowedOrigin } from '../lib/middleware.js'
import { rateLimit } from '../lib/rateLimit.js'
import { requireSession } from '../lib/session.js'
import {
  archiveBadgeDefinition, awardBadge, createBadgeDefinition, getBadgeDefinition, getMembership, getPersonByHandle, isActiveMember, listBadgeDefinitions, revokeBadge,
  type BadgeDefinition, type EntityRow,
} from '../social/db.js'
import { isBadgeColor, isBadgeIcon } from '../social/badgeCatalog.js'
import { isValidHandle } from '../social/handles.js'
import { loadViewer, requireEntityAdmin, requireSuperadmin, viewerOf } from '../social/guards.js'

const router = Router()
const authed = [requireSession, loadViewer]
const authedWrite = [isAllowedOrigin, requireSession, loadViewer]
const limit = rateLimit('badges', 60, 10 * 60_000)
const DEFINITION_NOT_FOUND = { error: 'Badge não encontrada' }
const MEMBER_NOT_FOUND = { error: 'Membro não encontrado' }
const PERSON_NOT_FOUND = { error: 'Aluno não encontrado' }

type NewDefinition = { label: string; description: string | null; icon: BadgeDefinition['icon']; color: BadgeDefinition['color'] }

function parseDefinition(body: unknown): { ok: true; value: NewDefinition } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, error: 'Dados inválidos' }
  const { label, description, icon, color } = body as Record<string, unknown>
  const cleanLabel = typeof label === 'string' ? label.trim() : ''
  if (cleanLabel.length < 1 || cleanLabel.length > 40) return { ok: false, error: 'O nome da badge deve ter de 1 a 40 caracteres' }
  if (description !== undefined && description !== null && typeof description !== 'string') return { ok: false, error: 'Descrição inválida' }
  const cleanDescription = typeof description === 'string' ? description.trim() : ''
  if (cleanDescription.length > 140) return { ok: false, error: 'A descrição deve ter no máximo 140 caracteres' }
  if (!isBadgeIcon(icon)) return { ok: false, error: 'Ícone inválido' }
  if (!isBadgeColor(color)) return { ok: false, error: 'Cor inválida' }
  return { ok: true, value: { label: cleanLabel, description: cleanDescription || null, icon, color } }
}

// scope: null for the admin catalogue, an entity id for that entity's catalogue.
const scopeOf = (entityId: string | null) => (entityId === null ? ({ kind: 'admin_award', entityId: null } as const) : ({ kind: 'entity_award', entityId } as const))

async function ownedDefinition(req: Request, entityId: string | null) {
  const def = await getBadgeDefinition(String(req.params.defId ?? ''))
  return def && def.kind === scopeOf(entityId).kind && def.entityId === entityId ? def : null
}

const list = (entityId: string | null) => async (_req: Request, res: Response) => {
  res.json({ definitions: await listBadgeDefinitions(entityId === null ? { kind: 'admin_award' } : { entityId }) })
}

const create = (entityIdOf: (res: Response) => string | null) => async (req: Request, res: Response) => {
  const parsed = parseDefinition(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  const definition = await createBadgeDefinition({ ...parsed.value, ...scopeOf(entityIdOf(res)), createdBy: viewerOf(res).id })
  res.status(201).json({ definition })
}

const archive = (entityIdOf: (res: Response) => string | null) => async (req: Request, res: Response) => {
  const def = await ownedDefinition(req, entityIdOf(res))
  if (!def) return res.status(404).json(DEFINITION_NOT_FOUND)
  await archiveBadgeDefinition(def.id)
  res.status(204).end()
}

const grant = (entityIdOf: (res: Response) => string | null) => async (req: Request, res: Response) => {
  const entityId = entityIdOf(res)
  const def = await ownedDefinition(req, entityId)
  if (!def) return res.status(404).json(DEFINITION_NOT_FOUND)
  const handle = String(req.params.handle ?? '')
  const target = isValidHandle(handle) ? await getPersonByHandle(handle) : null
  if (!target) return res.status(404).json(entityId === null ? PERSON_NOT_FOUND : MEMBER_NOT_FOUND)
  if (entityId !== null && !isActiveMember(await getMembership(entityId, target.user.id))) return res.status(404).json(MEMBER_NOT_FOUND)
  await awardBadge(target.user.id, { kind: def.kind, sourceId: def.id, label: def.label, icon: def.icon, color: def.color, entityId: def.entityId })
  res.status(204).end()
}

const revoke = (entityIdOf: (res: Response) => string | null) => async (req: Request, res: Response) => {
  const def = await ownedDefinition(req, entityIdOf(res))
  if (!def) return res.status(404).json(DEFINITION_NOT_FOUND)
  const handle = String(req.params.handle ?? '')
  const target = isValidHandle(handle) ? await getPersonByHandle(handle) : null
  if (!target) return res.status(404).json(PERSON_NOT_FOUND)
  await revokeBadge(target.user.id, def.kind, def.id)
  res.status(204).end()
}

const adminScope = () => null
const entityScope = (res: Response) => (res.locals.entity as EntityRow).id

router.get('/api/admin/badges', ...authed, requireSuperadmin, route('Listing badges failed', list(null)))
router.post('/api/admin/badges', ...authedWrite, requireSuperadmin, limit, route('Creating badge failed', create(adminScope)))
router.delete('/api/admin/badges/:defId', ...authedWrite, requireSuperadmin, limit, route('Archiving badge failed', archive(adminScope)))
router.put('/api/admin/badges/:defId/holders/:handle', ...authedWrite, requireSuperadmin, limit, route('Granting badge failed', grant(adminScope)))
router.delete('/api/admin/badges/:defId/holders/:handle', ...authedWrite, requireSuperadmin, limit, route('Revoking badge failed', revoke(adminScope)))

router.get('/api/entities/:id/badges', ...authed, requireEntityAdmin, route('Listing badges failed', async (req, res) => list(entityScope(res))(req, res)))
router.post('/api/entities/:id/badges', ...authedWrite, requireEntityAdmin, limit, route('Creating badge failed', create(entityScope)))
router.delete('/api/entities/:id/badges/:defId', ...authedWrite, requireEntityAdmin, limit, route('Archiving badge failed', archive(entityScope)))
router.put('/api/entities/:id/badges/:defId/holders/:handle', ...authedWrite, requireEntityAdmin, limit, route('Granting badge failed', grant(entityScope)))
router.delete('/api/entities/:id/badges/:defId/holders/:handle', ...authedWrite, requireEntityAdmin, limit, route('Revoking badge failed', revoke(entityScope)))

export default router
