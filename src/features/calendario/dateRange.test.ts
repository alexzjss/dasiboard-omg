import { describe, expect, it } from 'vitest'
import { agendaRange, eventDays, monthGridRange, saoPauloDateKey, toApiIso } from './dateRange'

describe('monthGridRange', () => {
  it('começa no domingo anterior ao dia 1 e cobre 6 semanas (fim exclusivo)', () => {
    // Setembro/2026 começa numa terça: o grid vai de domingo 30/08 até 10/10 (42 dias).
    const { from, to } = monthGridRange(2026, 8)
    expect(toApiIso(from)).toBe('2026-08-30T00:00:00.000-03:00')
    expect(toApiIso(to)).toBe('2026-10-11T00:00:00.000-03:00')
    expect((to.getTime() - from.getTime()) / 86_400_000).toBe(42)
  })

  it('vira o mês sem depender do fuso do navegador', () => {
    // Outubro/2026 começa numa quinta: primeira célula é domingo 27/09.
    const { from, to } = monthGridRange(2026, 9)
    expect(toApiIso(from)).toBe('2026-09-27T00:00:00.000-03:00')
    expect(toApiIso(to)).toBe('2026-11-08T00:00:00.000-03:00')
  })

  it('um mês que começa no domingo não recua uma semana', () => {
    // Fevereiro/2026 começa numa domingo (01/02).
    const { from } = monthGridRange(2026, 1)
    expect(toApiIso(from)).toBe('2026-02-01T00:00:00.000-03:00')
  })
})

describe('agendaRange', () => {
  it('começa na meia-noite de São Paulo do dia de hoje, por 30 dias por padrão', () => {
    const { from, to } = agendaRange(new Date('2026-10-21T15:00:00-03:00'))
    expect(toApiIso(from)).toBe('2026-10-21T00:00:00.000-03:00')
    expect(toApiIso(to)).toBe('2026-11-20T00:00:00.000-03:00')
  })

  it('às 23h30 em São Paulo ainda é o mesmo dia (em UTC já é o dia seguinte)', () => {
    const { from } = agendaRange(new Date('2026-10-21T23:30:00-03:00'), 7)
    expect(toApiIso(from)).toBe('2026-10-21T00:00:00.000-03:00')
  })
})

describe('toApiIso', () => {
  it('formata com o offset de São Paulo', () => {
    expect(toApiIso(new Date('2026-10-22T02:30:00Z'))).toBe('2026-10-21T23:30:00.000-03:00')
  })
})

describe('saoPauloDateKey', () => {
  it('lê o dia no fuso de São Paulo', () => {
    expect(saoPauloDateKey('2026-10-22T02:30:00.000Z')).toBe('2026-10-21')
    expect(saoPauloDateKey('2026-10-21T03:00:00.000Z')).toBe('2026-10-21')
  })
})

describe('eventDays', () => {
  it('evento de dia inteiro vindo como meia-noite de São Paulo cai no próprio dia', () => {
    expect(eventDays({ startsAt: '2026-10-21T03:00:00.000Z', endsAt: null, allDay: true })).toEqual(['2026-10-21'])
  })

  it('evento às 23h30 de São Paulo (dia seguinte em UTC) fica no dia local', () => {
    expect(eventDays({ startsAt: '2026-10-21T23:30:00-03:00', endsAt: null, allDay: false })).toEqual(['2026-10-21'])
  })

  it('evento com horário que termina à meia-noite não ocupa o dia seguinte', () => {
    expect(eventDays({ startsAt: '2026-10-21T23:30:00-03:00', endsAt: '2026-10-22T00:00:00-03:00', allDay: false })).toEqual(['2026-10-21'])
  })

  it('evento de 3 dias com horário ocupa os três dias', () => {
    expect(eventDays({ startsAt: '2026-10-20T10:00:00-03:00', endsAt: '2026-10-22T18:00:00-03:00', allDay: false })).toEqual([
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
    ])
  })

  it('evento de dia inteiro de 3 dias inclui o último dia', () => {
    expect(eventDays({ startsAt: '2026-10-20T03:00:00.000Z', endsAt: '2026-10-22T03:00:00.000Z', allDay: true })).toEqual([
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
    ])
  })

  it('atravessa a virada de mês', () => {
    expect(eventDays({ startsAt: '2026-10-30T10:00:00-03:00', endsAt: '2026-11-01T10:00:00-03:00', allDay: false })).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ])
  })
})
