import { describe, expect, it } from 'vitest'
import type { NotificationRow } from './db.js'
import { describeNotification } from './notificationText.js'

const row = (over: Partial<NotificationRow>): NotificationRow => ({
  id: 'n1', userId: 'u1', type: 'connection_request', actorId: 'a1', entityId: null, payload: {}, createdAt: '2026-10-20T00:00:00Z', readAt: null, ...over,
})
const ana = { name: 'Ana Souza', handle: 'ana1' }
const ctx = { actor: ana, entityName: 'DASI' }

describe('describeNotification', () => {
  it('connection_request', () => {
    expect(describeNotification(row({ type: 'connection_request' }), ctx)).toEqual({ title: 'Novo pedido de conexão', body: 'Ana quer se conectar com você.', url: '/perfil#pedidos' })
  })

  it('connection_accepted', () => {
    expect(describeNotification(row({ type: 'connection_accepted' }), ctx)).toEqual({ title: 'Conexão aceita', body: 'Ana aceitou seu pedido.', url: '/comunidade/ana1' })
  })

  it('entity_joined', () => {
    expect(describeNotification(row({ type: 'entity_joined', entityId: 'dasi' }), ctx)).toEqual({ title: 'Novo membro em DASI', body: 'Ana entrou na entidade.', url: '/entidades/dasi' })
  })

  it('entity_role_changed com cargo', () => {
    expect(describeNotification(row({ type: 'entity_role_changed', entityId: 'dasi', payload: { title: 'Tesoureira' } }), ctx))
      .toEqual({ title: 'Novo cargo em DASI', body: 'Agora você é Tesoureira.', url: '/entidades/dasi' })
  })

  it('entity_role_changed para admin e membro', () => {
    expect(describeNotification(row({ type: 'entity_role_changed', entityId: 'dasi', payload: { role: 'admin' } }), ctx))
      .toEqual({ title: 'Você agora é admin de DASI', body: '', url: '/entidades/dasi' })
    expect(describeNotification(row({ type: 'entity_role_changed', entityId: 'dasi', payload: { role: 'member' } }), ctx))
      .toEqual({ title: 'Você não é mais admin de DASI', body: '', url: '/entidades/dasi' })
  })

  it('entity_removed', () => {
    expect(describeNotification(row({ type: 'entity_removed', entityId: 'dasi' }), ctx)).toEqual({ title: 'Você saiu de DASI', body: 'Um admin removeu você da entidade.', url: '/entidades' })
  })

  it('badge_awarded', () => {
    expect(describeNotification(row({ type: 'badge_awarded', payload: { label: 'Monitora' } }), ctx)).toEqual({ title: 'Nova badge: Monitora', body: 'Ela já aparece no seu perfil.', url: '/perfil' })
  })

  it('announcement com e sem link', () => {
    expect(describeNotification(row({ type: 'announcement', payload: { title: 'Aviso', body: 'Texto', link: '/entidades/dasi' } }), ctx)).toEqual({ title: 'Aviso', body: 'Texto', url: '/entidades/dasi' })
    expect(describeNotification(row({ type: 'announcement', payload: { title: 'Aviso', body: 'Texto' } }), ctx).url).toBe('/')
  })

  it('usa "Alguém" quando o ator não existe mais', () => {
    const missing = { actor: null, entityName: 'DASI' }
    expect(describeNotification(row({ type: 'connection_request' }), missing).body).toBe('Alguém quer se conectar com você.')
    expect(describeNotification(row({ type: 'entity_joined', entityId: 'dasi' }), missing).body).toBe('Alguém entrou na entidade.')
  })
})
