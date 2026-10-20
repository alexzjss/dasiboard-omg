import type { NotificationRow } from './db.js'

export type NotificationContext = {
  actor: { name: string; handle: string } | null
  entityName: string | null
}

const text = (value: unknown) => (typeof value === 'string' ? value : '')

/** Único lugar onde o texto de uma notificação é montado (a lista e o push usam o mesmo). */
export function describeNotification(row: NotificationRow, ctx: NotificationContext): { title: string; body: string; url: string } {
  const actor = ctx.actor?.name.trim().split(/\s+/)[0] || 'Alguém'
  const entity = ctx.entityName ?? 'uma entidade'
  // O id da entidade é o mesmo slug que /entidades/:slug resolve no front.
  const entityUrl = row.entityId ? `/entidades/${row.entityId}` : '/entidades'
  const { payload } = row

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
    case 'announcement':
      return { title: text(payload.title), body: text(payload.body), url: text(payload.link) || '/' }
  }
}
