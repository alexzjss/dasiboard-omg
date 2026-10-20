import type { NextFunction, Request, Response } from 'express'
import { isSuperadminEmail } from '../lib/config.js'
import { route } from '../lib/errors.js'
import { getEntity, getMembership, getPersonById, getUserBySub, isActiveMember, ensureViewerProfile } from './db.js'
import { ENTITY_ID_PATTERN } from './validation.js'
import type { PersonRecord } from './db.js'

export type Viewer = {
  id: string
  email: string
  name: string
  picture: string | null
  handle: string
  person: PersonRecord
  isSuperadmin: boolean
}

export const NOT_FOUND_PROFILE = { error: 'Perfil não encontrado' }

export const viewerOf = (res: Response) => res.locals.viewer as Viewer

// Runs after requireSession: resolves the logged-in user's row and profile (creating the profile if missing).
export const loadViewer = route('Loading viewer failed', async (req: Request, res: Response, next: NextFunction) => {
  const user = await getUserBySub(req.user!.sub)
  if (!user) return res.status(401).json({ error: 'Invalid or expired session' })
  const person = (await getPersonById(user.id)) ?? (await ensureViewerProfile(user.id, user.email))
  if (!person) return res.status(503).json({ error: 'Perfil indisponível' })
  const viewer: Viewer = { id: user.id, email: user.email, name: user.name, picture: person.user.picture, handle: person.profile.handle, person, isSuperadmin: isSuperadminEmail(user.email) }
  res.locals.viewer = viewer
  next()
})

export function requireSuperadmin(_req: Request, res: Response, next: NextFunction) {
  if (!viewerOf(res).isSuperadmin) return res.status(403).json({ error: 'Acesso negado' })
  next()
}

// Authorizes against the entity named in THIS route (req.params.id), never against "any entity".
// Superadmins pass; everyone else must be an active admin of that very entity.
export const requireEntityAdmin = route('Entity admin check failed', async (req: Request, res: Response, next: NextFunction) => {
  const entityId = String(req.params.id ?? '')
  if (!ENTITY_ID_PATTERN.test(entityId)) return res.status(404).json({ error: 'Entidade não encontrada' })
  const entity = await getEntity(entityId)
  if (!entity) return res.status(404).json({ error: 'Entidade não encontrada' })
  const viewer = viewerOf(res)
  if (!viewer.isSuperadmin) {
    const membership = await getMembership(entity.id, viewer.id)
    if (!isActiveMember(membership) || membership.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' })
  }
  res.locals.entity = entity
  next()
})
