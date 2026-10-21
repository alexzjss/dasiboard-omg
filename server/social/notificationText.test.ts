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

  it('event_submitted com entidade e edição', () => {
    expect(describeNotification(row({ type: 'event_submitted', entityId: 'dasi', payload: { eventId: 'e1', title: 'Palestra' } }), ctx))
      .toEqual({ title: 'Evento para revisar', body: 'Ana propôs "Palestra" em DASI', url: '/calendario?aba=revisar' })
    expect(describeNotification(row({ type: 'event_submitted', payload: { eventId: 'e1', title: 'Aula', editOnly: true } }), ctx))
      .toEqual({ title: 'Edição de evento para revisar', body: 'Ana propôs "Aula"', url: '/calendario?aba=revisar' })
  })

  it('event_approved nas três variantes', () => {
    expect(describeNotification(row({ type: 'event_approved', payload: { eventId: 'e1', title: 'Palestra' } }), ctx))
      .toEqual({ title: 'Evento aprovado', body: '"Palestra" já está no calendário.', url: '/calendario?evento=e1' })
    expect(describeNotification(row({ type: 'event_approved', payload: { eventId: 'e1', title: 'Palestra', adjusted: true } }), ctx).title)
      .toBe('Evento aprovado com ajustes')
    expect(describeNotification(row({ type: 'event_approved', payload: { eventId: 'e1', title: 'Palestra', editOnly: true } }), ctx).title)
      .toBe('Edição aprovada')
  })

  it('event_approved sem eventId vai para /calendario', () => {
    expect(describeNotification(row({ type: 'event_approved', payload: { title: 'Palestra' } }), ctx).url).toBe('/calendario')
  })

  it('event_rejected com motivo, sem motivo e edição', () => {
    expect(describeNotification(row({ type: 'event_rejected', payload: { eventId: 'e1', title: 'Palestra', note: 'Repetido' } }), ctx))
      .toEqual({ title: 'Evento recusado', body: 'Motivo: Repetido', url: '/calendario?aba=minhas' })
    expect(describeNotification(row({ type: 'event_rejected', payload: { eventId: 'e1', title: 'Palestra' } }), ctx))
      .toEqual({ title: 'Evento recusado', body: '"Palestra" não foi aprovado.', url: '/calendario?aba=minhas' })
    expect(describeNotification(row({ type: 'event_rejected', payload: { eventId: 'e1', title: 'Palestra', editOnly: true } }), ctx).title)
      .toBe('Edição recusada')
  })

  it('event_hidden para o autor e para a moderação', () => {
    expect(describeNotification(row({ type: 'event_hidden', payload: { eventId: 'e1', title: 'Palestra' } }), ctx))
      .toEqual({ title: 'Seu evento foi escondido', body: '"Palestra" recebeu denúncias e vai ser revisado.', url: '/calendario?aba=minhas' })
    expect(describeNotification(row({ type: 'event_hidden', payload: { eventId: 'e1', title: 'Palestra', forModerator: true } }), ctx))
      .toEqual({ title: 'Evento denunciado', body: '"Palestra" foi escondido após 3 denúncias.', url: '/calendario?aba=revisar' })
  })

  it('event_reminder de dia inteiro e com horário em São Paulo', () => {
    expect(describeNotification(row({ type: 'event_reminder', payload: { eventId: 'e1', title: 'Feriado', startsAt: '2026-10-22T03:00:00.000Z', allDay: true } }), ctx))
      .toEqual({ title: 'Amanhã: Feriado', body: 'O dia todo.', url: '/calendario?evento=e1' })
    expect(describeNotification(row({ type: 'event_reminder', payload: { eventId: 'e1', title: 'Prova', startsAt: '2026-10-22T17:30:00.000Z', allDay: false } }), ctx))
      .toEqual({ title: 'Amanhã: Prova', body: 'Começa às 14h30.', url: '/calendario?evento=e1' })
    expect(describeNotification(row({ type: 'event_reminder', payload: { eventId: 'e1', title: 'Prova', startsAt: '2026-10-22T17:00:00.000Z', allDay: false } }), ctx).body)
      .toBe('Começa às 14h.')
  })

  it('usa "Alguém" quando o ator não existe mais', () => {
    const missing = { actor: null, entityName: 'DASI' }
    expect(describeNotification(row({ type: 'connection_request' }), missing).body).toBe('Alguém quer se conectar com você.')
    expect(describeNotification(row({ type: 'entity_joined', entityId: 'dasi' }), missing).body).toBe('Alguém entrou na entidade.')
  })
})
