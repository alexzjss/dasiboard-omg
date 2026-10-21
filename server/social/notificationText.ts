import type { NotificationRow } from './db.js'

export type NotificationContext = {
  actor: { name: string; handle: string } | null
  entityName: string | null
}

const text = (value: unknown) => (typeof value === 'string' ? value : '')

const SAO_PAULO = 'America/Sao_Paulo'
const hourFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: SAO_PAULO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** Hora de início em São Paulo: "às 14h" ou "às 14h30". Null se a data não for válida. */
function formatStartTime(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const parts = hourFormat.formatToParts(date)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value)
  return minute ? `às ${hour}h${String(minute).padStart(2, '0')}` : `às ${hour}h`
}

/** Único lugar onde o texto de uma notificação é montado (a lista e o push usam o mesmo). */
export function describeNotification(row: NotificationRow, ctx: NotificationContext): { title: string; body: string; url: string } {
  const actor = ctx.actor?.name.trim().split(/\s+/)[0] || 'Alguém'
  const entity = ctx.entityName ?? 'uma entidade'
  // O id da entidade é o mesmo slug que /entidades/:slug resolve no front.
  const entityUrl = row.entityId ? `/entidades/${row.entityId}` : '/entidades'
  const { payload } = row
  // Sem eventId, o link cai na página geral do calendário.
  const eventId = text(payload.eventId)
  const eventUrl = eventId ? `/calendario?evento=${eventId}` : '/calendario'

  switch (row.type) {
    case 'connection_request':
      return { title: 'Novo pedido de conexão', body: `${actor} quer se conectar com você.`, url: '/perfil#pedidos' }
    case 'connection_accepted':
      return { title: 'Conexão aceita', body: `${actor} aceitou seu pedido.`, url: ctx.actor ? `/comunidade/${ctx.actor.handle}` : '/comunidade' }
    case 'entity_joined':
      return { title: `Novo membro em ${entity}`, body: `${actor} entrou na entidade.`, url: entityUrl }
    case 'entity_role_changed': {
      const title = text(payload.title).trim()
      if (title) return { title: `Novo cargo em ${entity}`, body: `Agora você é ${title}.`, url: entityUrl }
      if (payload.role === 'admin') return { title: `Você agora é admin de ${entity}`, body: '', url: entityUrl }
      return { title: `Você não é mais admin de ${entity}`, body: '', url: entityUrl }
    }
    case 'entity_removed':
      return { title: `Você saiu de ${entity}`, body: 'Um admin removeu você da entidade.', url: '/entidades' }
    case 'badge_awarded':
      return { title: `Nova badge: ${text(payload.label)}`, body: 'Ela já aparece no seu perfil.', url: '/perfil' }
    case 'event_submitted': {
      const title = text(payload.title)
      const scope = row.entityId ? ` em ${entity}` : ''
      return {
        title: payload.editOnly === true ? 'Edição de evento para revisar' : 'Evento para revisar',
        body: `${actor} propôs "${title}"${scope}`,
        url: '/calendario?aba=revisar',
      }
    }
    case 'event_approved': {
      const title = text(payload.title)
      const heading = payload.editOnly === true ? 'Edição aprovada' : payload.adjusted === true ? 'Evento aprovado com ajustes' : 'Evento aprovado'
      return { title: heading, body: `"${title}" já está no calendário.`, url: eventUrl }
    }
    case 'event_rejected': {
      const title = text(payload.title)
      const note = text(payload.note).trim()
      return {
        title: payload.editOnly === true ? 'Edição recusada' : 'Evento recusado',
        body: note ? `Motivo: ${note}` : `"${title}" não foi aprovado.`,
        url: '/calendario?aba=minhas',
      }
    }
    case 'event_hidden': {
      const title = text(payload.title)
      if (payload.forModerator === true) return { title: 'Evento denunciado', body: `"${title}" foi escondido após 3 denúncias.`, url: '/calendario?aba=revisar' }
      return { title: 'Seu evento foi escondido', body: `"${title}" recebeu denúncias e vai ser revisado.`, url: '/calendario?aba=minhas' }
    }
    case 'event_reminder': {
      const title = text(payload.title)
      const startTime = typeof payload.startsAt === 'string' ? formatStartTime(payload.startsAt) : null
      let when = 'Começa em breve.'
      if (payload.allDay === true) when = 'O dia todo.'
      else if (startTime) when = `Começa ${startTime}.`
      return { title: `Amanhã: ${title}`, body: when, url: eventUrl }
    }
    case 'announcement':
      return { title: text(payload.title), body: text(payload.body), url: text(payload.link) || '/' }
  }
}
