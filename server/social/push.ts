import { logError } from '../lib/errors.js'
import { deletePushSubscriptionById, getEntitiesByIds, getPeopleByIds, listPushSubscriptions, type NotificationRow, type PushKeys } from './db.js'
import { describeNotification } from './notificationText.js'
import { personMini } from './presenters.js'

export type PushSender = (sub: { endpoint: string; keys: PushKeys }, payload: string) => Promise<{ statusCode: number }>

type Job = { subId: string; endpoint: string; keys: PushKeys; payload: string }

const isGone = (status: unknown) => status === 404 || status === 410

/** Monta o envio de push de uma requisição: concorrência limitada e prazo total (a Vercel Hobby corta em 10 s). */
export function createPushDeliverer(send: PushSender, opts: { concurrency?: number; deadlineMs?: number } = {}) {
  const concurrency = opts.concurrency ?? 20
  const deadlineMs = opts.deadlineMs ?? 6000

  return async function deliver(rows: NotificationRow[]): Promise<void> {
    if (rows.length === 0) return
    const subs = await listPushSubscriptions([...new Set(rows.map((row) => row.userId))])
    if (subs.length === 0) return

    const actorIds = [...new Set(rows.flatMap((row) => (row.actorId ? [row.actorId] : [])))]
    const entityIds = [...new Set(rows.flatMap((row) => (row.entityId ? [row.entityId] : [])))]
    const [people, entities] = await Promise.all([getPeopleByIds(actorIds), getEntitiesByIds(entityIds)])
    const actors = new Map(people.map((person) => [person.user.id, personMini(person)]))
    const entityNames = new Map(entities.map((entity) => [entity.id, entity.name]))

    const jobs: Job[] = []
    for (const row of rows) {
      const { title, body, url } = describeNotification(row, {
        actor: row.actorId ? actors.get(row.actorId) ?? null : null,
        entityName: row.entityId ? entityNames.get(row.entityId) ?? null : null,
      })
      const payload = JSON.stringify({ title, body, url, tag: row.id })
      for (const sub of subs) if (sub.userId === row.userId) jobs.push({ subId: sub.id, endpoint: sub.endpoint, keys: sub.keys, payload })
    }

    let next = 0
    let expired = false
    const worker = async () => {
      while (!expired && next < jobs.length) {
        const job = jobs[next++]
        let status: number | null = null
        try {
          status = (await send({ endpoint: job.endpoint, keys: job.keys }, job.payload)).statusCode
        } catch (error) {
          status = typeof (error as { statusCode?: unknown })?.statusCode === 'number' ? (error as { statusCode: number }).statusCode : null
          if (!isGone(status)) logError('Push send failed', error)
        }
        if (isGone(status)) {
          try { await deletePushSubscriptionById(job.subId) } catch (error) { logError('Deleting dead push subscription failed', error) }
        }
      }
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    const deadline = new Promise<void>((resolve) => {
      timer = setTimeout(() => { expired = true; resolve() }, deadlineMs)
    })
    await Promise.race([Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker)), deadline])
    clearTimeout(timer)
    if (expired && next < jobs.length) logError('Push deadline reached', `${jobs.length - next} of ${jobs.length} not sent`)
  }
}
