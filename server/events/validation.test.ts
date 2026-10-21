// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { toSaoPauloDate, validateEventInput, validateEventPatch, validateRange, validateReport, validateReview } from './validation.js'

const now = new Date('2026-10-21T15:00:00.000Z')
const base = { scope: 'usp', title: 'Semana de recepção', kind: 'event', startsAt: '2026-11-02T13:00:00-03:00' }
const input = (over: Record<string, unknown> = {}) => validateEventInput({ ...base, ...over }, now)
const errorOf = (r: { ok: boolean; error?: string }) => (r.ok ? null : r.error)

describe('validateEventInput', () => {
  it('aceita o mínimo e preenche os padrões', () => {
    const r = input()
    expect(r).toEqual({ ok: true, value: {
      scope: 'usp', scopeValue: null, title: 'Semana de recepção', kind: 'event', startsAt: '2026-11-02T16:00:00.000Z', endsAt: null,
      allDay: false, description: null, location: null, link: null, visibility: 'public',
    } })
  })
  it('rejeita corpo inválido e chaves desconhecidas', () => {
    expect(validateEventInput(null, now).ok).toBe(false)
    expect(validateEventInput([], now).ok).toBe(false)
    expect(errorOf(input({ status: 'approved' }))).toBe('Campo desconhecido')
    expect(errorOf(input({ createdBy: 'x' }))).toBe('Campo desconhecido')
  })
  it('título: 1 a 80 após trim', () => {
    expect(input({ title: '  oi  ' })).toMatchObject({ ok: true, value: { title: 'oi' } })
    expect(input({ title: '   ' }).ok).toBe(false)
    expect(input({ title: 'a'.repeat(80) }).ok).toBe(true)
    expect(input({ title: 'a'.repeat(81) }).ok).toBe(false)
    expect(input({ title: 5 }).ok).toBe(false)
  })
  it('descrição ≤ 1000 e local ≤ 120; vazio vira null', () => {
    expect(input({ description: 'a'.repeat(1000) }).ok).toBe(true)
    expect(input({ description: 'a'.repeat(1001) }).ok).toBe(false)
    expect(input({ location: 'a'.repeat(120) }).ok).toBe(true)
    expect(input({ location: 'a'.repeat(121) }).ok).toBe(false)
    expect(input({ description: '  ', location: '' })).toMatchObject({ value: { description: null, location: null } })
  })
  it('link: só https, sem credenciais, ≤ 300', () => {
    expect(input({ link: 'https://each.usp.br/x' })).toMatchObject({ ok: true, value: { link: 'https://each.usp.br/x' } })
    expect(input({ link: '' })).toMatchObject({ value: { link: null } })
    for (const link of ['http://x.com', 'javascript:alert(1)', '//x.com', '/rota', 'https://u:p@x.com', 'https://user@x.com', 'https://x.com/a b', `https://x.com/${'a'.repeat(300)}`, 'nada', 5]) {
      expect(input({ link }).ok, String(link)).toBe(false)
    }
  })
  it('kind, scope e visibility só dos enums', () => {
    expect(input({ kind: 'party' }).ok).toBe(false)
    expect(input({ scope: 'world' }).ok).toBe(false)
    expect(input({ visibility: 'secret' }).ok).toBe(false)
    for (const kind of ['event', 'meeting', 'exam', 'assignment', 'deadline', 'holiday']) expect(input({ kind }).ok).toBe(true)
  })

  describe('scopeValue por escopo', () => {
    it('usp exige nulo', () => {
      expect(input({ scopeValue: 'X' }).ok).toBe(false)
      expect(input({ scopeValue: null }).ok).toBe(true)
    })
    it('class normaliza para maiúsculas e valida o padrão', () => {
      expect(input({ scope: 'class', scopeValue: ' ach2001 ' })).toMatchObject({ ok: true, value: { scopeValue: 'ACH2001' } })
      for (const v of ['', 'ab', 'ACH 2001', 'ACH-2001', 'A'.repeat(13), null, undefined]) expect(input({ scope: 'class', scopeValue: v }).ok, String(v)).toBe(false)
    })
    it('entity segue ENTITY_ID_PATTERN', () => {
      expect(input({ scope: 'entity', scopeValue: 'dasi-each' }).ok).toBe(true)
      for (const v of ['DASI', 'a b', '', 'a'.repeat(41), undefined]) expect(input({ scope: 'entity', scopeValue: v }).ok, String(v)).toBe(false)
    })
    it('cohort: 4 dígitos entre 2000 e ano atual + 1', () => {
      expect(input({ scope: 'cohort', scopeValue: '2000' }).ok).toBe(true)
      expect(input({ scope: 'cohort', scopeValue: '2027' }).ok).toBe(true)
      for (const v of ['1999', '2028', '24', 'abcd', '20240']) expect(input({ scope: 'cohort', scopeValue: v }).ok, v).toBe(false)
    })
    it('campus e curso: 1 a 80 caracteres', () => {
      expect(input({ scope: 'campus', scopeValue: 'EACH' }).ok).toBe(true)
      expect(input({ scope: 'course', scopeValue: 'Sistemas de Informação' }).ok).toBe(true)
      expect(input({ scope: 'campus', scopeValue: '' }).ok).toBe(false)
      expect(input({ scope: 'course', scopeValue: 'a'.repeat(81) }).ok).toBe(false)
      expect(input({ scope: 'course', scopeValue: 'a\nb' }).ok).toBe(false)
    })
  })

  it('visibility members só com entity', () => {
    expect(input({ scope: 'entity', scopeValue: 'dasi', visibility: 'members' }).ok).toBe(true)
    expect(input({ scope: 'class', scopeValue: 'ACH2001', visibility: 'members' }).ok).toBe(false)
    expect(input({ visibility: 'members' }).ok).toBe(false)
  })

  describe('datas', () => {
    it('exige ISO com offset e normaliza para UTC', () => {
      expect(input({ startsAt: '2026-11-02T10:00:00Z' })).toMatchObject({ value: { startsAt: '2026-11-02T10:00:00.000Z' } })
      expect(input({ startsAt: '2026-11-02T10:00-03:00' })).toMatchObject({ value: { startsAt: '2026-11-02T13:00:00.000Z' } })
      for (const v of ['2026-11-02T10:00:00', '2026-11-02', 'amanhã', '2026-02-30T10:00:00Z', '2026-13-01T10:00:00Z', 5, null]) expect(input({ startsAt: v }).ok, String(v)).toBe(false)
    })
    it('fim ≥ início; fim igual ao início vale', () => {
      expect(input({ endsAt: '2026-11-02T13:00:00-03:00' }).ok).toBe(true)
      expect(errorOf(input({ endsAt: '2026-11-02T12:59:00-03:00' }))).toBe('O fim não pode ser antes do início')
      expect(input({ endsAt: null })).toMatchObject({ value: { endsAt: null } })
    })
    it('duração máxima de 31 dias', () => {
      expect(input({ endsAt: '2026-12-03T13:00:00-03:00' }).ok).toBe(true)
      expect(input({ endsAt: '2026-12-03T13:00:01-03:00' }).ok).toBe(false)
    })
    it('início: no máximo 1 dia no passado e 2 anos à frente', () => {
      expect(input({ startsAt: '2026-10-20T15:00:00Z' }).ok).toBe(true)
      expect(input({ startsAt: '2026-10-20T14:59:00Z' }).ok).toBe(false)
      expect(input({ startsAt: '2028-10-21T15:00:00Z' }).ok).toBe(true)
      expect(input({ startsAt: '2028-10-21T15:01:00Z' }).ok).toBe(false)
    })
  })

  describe('dia inteiro e fuso (Review Focus 9)', () => {
    it('YYYY-MM-DD vira meia-noite de São Paulo', () => {
      const r = input({ allDay: true, startsAt: '2026-10-21', endsAt: '2026-10-22' })
      expect(r).toMatchObject({ ok: true, value: { allDay: true, startsAt: '2026-10-21T03:00:00.000Z', endsAt: '2026-10-22T03:00:00.000Z' } })
      if (r.ok) expect(toSaoPauloDate(r.value.startsAt)).toBe('2026-10-21')
    })
    it('dia inteiro não aceita horário e horário não aceita só a data', () => {
      expect(input({ allDay: true, startsAt: '2026-11-02T10:00:00Z' }).ok).toBe(false)
      expect(input({ allDay: false, startsAt: '2026-11-02' }).ok).toBe(false)
      expect(input({ allDay: true, startsAt: '2026-02-30' }).ok).toBe(false)
      expect(input({ allDay: 'sim' }).ok).toBe(false)
    })
    it('dia inteiro de hoje ainda é aceito (meia-noite de SP já passou)', () => {
      expect(input({ allDay: true, startsAt: '2026-10-21' }).ok).toBe(true)
    })
  })
})

describe('toSaoPauloDate', () => {
  it('usa UTC-3 na virada do dia', () => {
    expect(toSaoPauloDate('2026-10-21T03:00:00.000Z')).toBe('2026-10-21')
    expect(toSaoPauloDate('2026-10-21T02:59:59.000Z')).toBe('2026-10-20')
    expect(toSaoPauloDate('2026-10-22T02:59:59.000Z')).toBe('2026-10-21')
    expect(toSaoPauloDate('2026-10-21T23:30:00-03:00')).toBe('2026-10-21')
  })
})

describe('validateEventPatch', () => {
  const patch = (body: unknown) => validateEventPatch(body, now)
  it('só devolve o que veio', () => {
    expect(patch({ description: 'novo' })).toEqual({ ok: true, value: { description: 'novo' } })
    expect(patch({ title: ' Novo ' })).toEqual({ ok: true, value: { title: 'Novo' } })
    expect(patch({ location: null })).toEqual({ ok: true, value: { location: null } })
  })
  it('Review Focus 5: mudar o escopo dá erro específico', () => {
    const msg = 'Não dá para mudar o escopo; cancele e proponha outro'
    expect(errorOf(patch({ scope: 'usp' }))).toBe(msg)
    expect(errorOf(patch({ scopeValue: 'X', title: 'a' }))).toBe(msg)
    expect(errorOf(patch({ scope: undefined }))).toBe(msg)
  })
  it('rejeita vazio, chaves desconhecidas e valores inválidos', () => {
    expect(errorOf(patch({}))).toBe('Nada para atualizar')
    expect(errorOf(patch({ status: 'approved' }))).toBe('Campo desconhecido')
    expect(patch({ title: '' }).ok).toBe(false)
    expect(patch({ kind: 'x' }).ok).toBe(false)
    expect(patch({ link: 'http://x.com' }).ok).toBe(false)
    expect(patch(null).ok).toBe(false)
  })
  it('datas exigem allDay junto para saber o formato', () => {
    expect(patch({ startsAt: '2026-11-02T10:00:00Z' }).ok).toBe(false)
    expect(patch({ allDay: false, startsAt: '2026-11-02T10:00:00Z' })).toMatchObject({ ok: true, value: { startsAt: '2026-11-02T10:00:00.000Z' } })
    expect(patch({ allDay: true, startsAt: '2026-11-02' })).toMatchObject({ ok: true, value: { startsAt: '2026-11-02T03:00:00.000Z' } })
    expect(patch({ allDay: true }).ok).toBe(true)
  })
  it('aplica as janelas de data quando o início vem', () => {
    expect(patch({ allDay: false, startsAt: '2020-01-01T10:00:00Z' }).ok).toBe(false)
    expect(patch({ allDay: false, startsAt: '2026-11-02T10:00:00Z', endsAt: '2026-11-01T10:00:00Z' }).ok).toBe(false)
  })
})

describe('validateRange', () => {
  it('aceita intervalo crescente de até 100 dias', () => {
    expect(validateRange('2026-10-01T00:00:00.000Z', '2026-10-31T00:00:00.000Z')).toEqual({ ok: true, value: { from: '2026-10-01T00:00:00.000Z', to: '2026-10-31T00:00:00.000Z' } })
    expect(validateRange('2026-10-01T00:00:00Z', '2027-01-09T00:00:00Z').ok).toBe(true)
  })
  it('rejeita invertido, igual, longo demais e lixo', () => {
    expect(validateRange('2026-10-31T00:00:00Z', '2026-10-01T00:00:00Z').ok).toBe(false)
    expect(validateRange('2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z').ok).toBe(false)
    expect(validateRange('2026-10-01T00:00:00Z', '2027-01-09T00:00:01Z').ok).toBe(false)
    expect(validateRange('x', '2026-10-01T00:00:00Z').ok).toBe(false)
    expect(validateRange(undefined, undefined).ok).toBe(false)
    expect(validateRange('2026-10-01', '2026-10-05').ok).toBe(false)
  })
})

describe('validateReview', () => {
  const review = (body: unknown) => validateReview(body, now)
  it('decisões válidas, nota opcional', () => {
    expect(review({ decision: 'reject', note: ' sem data ' })).toEqual({ ok: true, value: { decision: 'reject', note: 'sem data', changes: null } })
    for (const decision of ['approve', 'reject', 'restore', 'remove']) expect(review({ decision }).ok).toBe(true)
    expect(review({ decision: 'nuke' }).ok).toBe(false)
    expect(review({}).ok).toBe(false)
    expect(review({ decision: 'approve', extra: 1 }).ok).toBe(false)
  })
  it('nota ≤ 280', () => {
    expect(review({ decision: 'reject', note: 'a'.repeat(280) }).ok).toBe(true)
    expect(review({ decision: 'reject', note: 'a'.repeat(281) }).ok).toBe(false)
  })
  it('changes só com approve e validado como patch (P8)', () => {
    expect(review({ decision: 'approve', changes: { title: 'Ajustado' } })).toMatchObject({ ok: true, value: { changes: { title: 'Ajustado' } } })
    expect(review({ decision: 'reject', changes: { title: 'x' } }).ok).toBe(false)
    expect(review({ decision: 'approve', changes: { scope: 'usp' } }).ok).toBe(false)
    expect(review({ decision: 'approve', changes: { title: '' } }).ok).toBe(false)
    expect(review({ decision: 'approve', changes: {} }).ok).toBe(false)
  })
})

describe('validateReport', () => {
  it('motivo opcional ≤ 200', () => {
    expect(validateReport(undefined)).toEqual({ ok: true, value: { reason: null } })
    expect(validateReport({})).toEqual({ ok: true, value: { reason: null } })
    expect(validateReport({ reason: ' spam ' })).toEqual({ ok: true, value: { reason: 'spam' } })
    expect(validateReport({ reason: 'a'.repeat(200) }).ok).toBe(true)
    expect(validateReport({ reason: 'a'.repeat(201) }).ok).toBe(false)
    expect(validateReport({ reason: 5 }).ok).toBe(false)
    expect(validateReport({ other: 1 }).ok).toBe(false)
    expect(validateReport('x').ok).toBe(false)
  })
})
