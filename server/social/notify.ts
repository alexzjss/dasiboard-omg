import { logError } from '../lib/errors.js'
import { insertNotifications, type NotificationInput, type NotificationRow } from './db.js'

/** Ligado pela Tarefa 6; até lá não envia nada. Os testes podem espionar. */
export let deliverPush: (rows: NotificationRow[]) => Promise<void> = async () => {}
export function setPushDeliverer(fn: (rows: NotificationRow[]) => Promise<void>) { deliverPush = fn }

/** Grava a notificação para cada destinatário e tenta o push. Nunca lança: a ação principal não pode falhar por isso. */
export async function notify(userIds: string[], input: NotificationInput, opts: { excludeId?: string } = {}): Promise<void> {
  try {
    const recipients = userIds.filter((id) => id !== opts.excludeId)
    if (recipients.length === 0) return
    const rows = await insertNotifications(recipients, input)
    await deliverPush(rows)
  } catch (error) {
    logError('Notifying failed', error)
  }
}
