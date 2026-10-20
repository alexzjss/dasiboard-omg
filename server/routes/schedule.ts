import { Router } from 'express'
import { deleteSchedule, getSchedule, saveSchedule, type ScheduleEntry } from '../db.js'
import { fetchJupiterSchedule } from '../jupiter.js'
import { logError } from '../lib/errors.js'
import { isAllowedOrigin } from '../lib/middleware.js'
import { rateLimit } from '../lib/rateLimit.js'
import { requireSession } from '../lib/session.js'
import { syncAutoBadgesAndNotify } from '../social/achievements.js'
import { getUserBySub } from '../social/db.js'

const router = Router()

// Importing a schedule can earn a badge; failing to award it must not fail the import.
async function syncBadgesFor(sub: string) {
  try {
    const user = await getUserBySub(sub)
    if (user) await syncAutoBadgesAndNotify(user.id)
  } catch (error) { logError('Syncing automatic badges failed', error) }
}

router.get('/api/schedule', requireSession, async (req, res) => {
  try { res.json(await getSchedule(req.user!.sub)) }
  catch (error) { logError('Loading schedule failed', error); res.status(503).json({ error: 'Não foi possível carregar a grade horária' }) }
})

router.put('/api/schedule', isAllowedOrigin, requireSession, async (req, res) => {
  const entries = req.body?.entries
  if (!Array.isArray(entries) || entries.length > 200) return res.status(400).json({ error: 'A grade horária é inválida' })
  const validEntries = entries.every((entry: ScheduleEntry) => Number.isInteger(entry.weekday) && entry.weekday >= 0 && entry.weekday <= 6
    && /^\d{2}:\d{2}$/.test(entry.startsAt) && /^\d{2}:\d{2}$/.test(entry.endsAt)
    && typeof entry.title === 'string' && typeof entry.code === 'string' && typeof entry.room === 'string' && typeof entry.building === 'string')
  if (!validEntries) return res.status(400).json({ error: 'A grade horária é inválida' })
  try {
    const saved = await saveSchedule(req.user!.sub, entries)
    await syncBadgesFor(req.user!.sub)
    res.json(saved)
  }
  catch (error) { logError('Saving schedule failed', error); res.status(503).json({ error: 'Não foi possível salvar a grade horária' }) }
})

router.delete('/api/schedule', isAllowedOrigin, requireSession, async (req, res) => {
  try {
    await deleteSchedule(req.user!.sub)
    res.status(204).end()
  } catch (error) {
    logError('Deleting schedule failed', error)
    res.status(503).json({ error: 'Não foi possível remover a grade horária' })
  }
})

router.post('/api/schedule/jupiter', isAllowedOrigin, requireSession, rateLimit('jupiter', 5, 10 * 60_000), async (req, res) => {
  const codpes = typeof req.body?.codpes === 'string' ? req.body.codpes.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const codpgm = typeof req.body?.codpgm === 'string' ? req.body.codpgm.trim() : ''
  if (!/^\d{1,10}$/.test(codpes) || !password || !/^\d+$/.test(codpgm)) return res.status(400).json({ error: 'Informe número USP, senha e programa.' })
  try {
    const entries = await fetchJupiterSchedule(codpes, password, codpgm)
    if (req.user) {
      const saved = await saveSchedule(req.user.sub, entries)
      await syncBadgesFor(req.user.sub)
      return res.json(saved)
    }
    res.json({ entries, importedAt: null })
  } catch (error) {
    logError('Jupiter import failed', error)
    res.status(502).json({ error: error instanceof Error ? error.message : 'Não foi possível consultar o JupiterWeb' })
  }
})

export default router
