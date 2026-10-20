import { Router } from 'express'
import { route } from '../lib/errors.js'
import { isAllowedOrigin } from '../lib/middleware.js'
import { rateLimit } from '../lib/rateLimit.js'
import { requireSession } from '../lib/session.js'
import { avatarObjectExists, avatarPublicUrl, createAvatarUploadUrl, getUserBySub, removeAvatarObjects, setAvatarPath } from '../social/db.js'
import { loadViewer, viewerOf } from '../social/guards.js'

const router = Router()
const authedWrite = [isAllowedOrigin, requireSession, loadViewer]
const EXTENSIONS: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }

router.post('/api/me/avatar/upload-url', ...authedWrite, rateLimit('avatar', 10, 10 * 60_000), route('Creating avatar upload url failed', async (req, res) => {
  const contentType = typeof req.body?.contentType === 'string' ? req.body.contentType : ''
  const ext = Object.hasOwn(EXTENSIONS, contentType) ? EXTENSIONS[contentType] : null
  if (!ext) return res.status(400).json({ error: 'Formato de imagem não suportado' })
  const path = `${viewerOf(res).id}/${Date.now().toString(36)}.${ext}`
  const { signedUrl } = await createAvatarUploadUrl(path)
  res.json({ uploadUrl: signedUrl, path })
}))

router.put('/api/me/avatar', ...authedWrite, route('Saving avatar failed', async (req, res) => {
  const viewer = viewerOf(res)
  const path = req.body?.path
  // The folder must be the viewer's own id: this is what stops someone from claiming another person's file.
  if (typeof path !== 'string' || !new RegExp(`^${viewer.id}/[a-z0-9]+\\.(webp|png|jpg)$`).test(path)) return res.status(400).json({ error: 'Foto inválida' })
  if (!(await avatarObjectExists(path))) return res.status(404).json({ error: 'Envie a foto antes de confirmar' })
  await setAvatarPath(viewer.id, path)
  await removeAvatarObjects(viewer.id, path)
  res.json({ picture: avatarPublicUrl(path) })
}))

router.delete('/api/me/avatar', ...authedWrite, route('Removing avatar failed', async (req, res) => {
  const viewer = viewerOf(res)
  await setAvatarPath(viewer.id, null)
  await removeAvatarObjects(viewer.id, null)
  const user = await getUserBySub(req.user!.sub)
  res.json({ picture: user?.picture ?? null })
}))

export default router
