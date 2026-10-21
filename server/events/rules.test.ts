// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { canCancel, canEdit, canModerate, canReport, canSubmit, canView, initialStatus, reviewTransition, splitEdit } from './rules.js'
import type { EventActor, EventRecord, EventScope, ScopeRef } from './types.js'

const actor = (over: Partial<EventActor> = {}): EventActor => ({
  userId: 'u1', isSuperadmin: false, campus: 'EACH', course: 'Sistemas de Informação', entryYear: 2024,
  classCodes: new Set(['ACH2001']), memberships: new Map([['dasi', 'member'], ['atletica', 'admin']]), ...over,
})
const event = (over: Partial<EventRecord> = {}): EventRecord => ({
  id: 'e1', scope: 'usp', scopeValue: null, title: 'Prova', description: null, kind: 'exam', startsAt: '2026-11-10T13:00:00.000Z', endsAt: null,
  allDay: false, location: null, link: null, visibility: 'public', status: 'approved', createdBy: 'author', pendingChanges: null, source: 'user',
  reviewedBy: null, reviewedAt: null, reviewNote: null, createdAt: '2026-10-21T00:00:00.000Z', updatedAt: '2026-10-21T00:00:00.000Z', ...over,
})
const ref = (scope: EventScope, scopeValue: string | null): ScopeRef => ({ scope, scopeValue })

describe('tabela de permissões (pode propor / modera / entra como)', () => {
  // [escopo, valor do próprio, valor de outro, modera quem não é superadmin?]
  const rows: [EventScope, string | null, string | null][] = [
    ['usp', null, null],
    ['campus', 'EACH', 'IME'],
    ['course', 'Sistemas de Informação', 'Direito'],
    ['cohort', '2024', '2020'],
    ['class', 'ACH2001', 'ACH9999'],
    ['entity', 'dasi', 'outra'],
  ]
  for (const [scope, own, other] of rows) {
    it(`${scope}: aluno do escopo propõe`, () => expect(canSubmit(actor(), ref(scope, own))).toBe(true))
    if (other !== null) it(`${scope}: aluno de fora não propõe`, () => expect(canSubmit(actor(), ref(scope, other))).toBe(false))
    it(`${scope}: superadmin propõe e modera`, () => {
      const root = actor({ isSuperadmin: true, campus: null, course: null, entryYear: null, classCodes: new Set(), memberships: new Map() })
      expect(canSubmit(root, ref(scope, other ?? own))).toBe(true)
      expect(canModerate(root, ref(scope, other ?? own))).toBe(true)
    })
    it(`${scope}: aluno comum não modera`, () => {
      // 'atletica' é admin, mas só vale para a própria entidade
      expect(canModerate(actor(), ref(scope, own))).toBe(false)
    })
    it(`${scope}: entra como ${scope === 'class' ? 'approved' : 'pending'} para o aluno`, () => {
      expect(initialStatus(actor(), ref(scope, own))).toBe(scope === 'class' ? 'approved' : 'pending')
    })
  }

  it('sem perfil preenchido não propõe em campus, curso ou turma', () => {
    const blank = actor({ campus: null, course: null, entryYear: null })
    expect(canSubmit(blank, ref('campus', 'EACH'))).toBe(false)
    expect(canSubmit(blank, ref('course', 'Sistemas de Informação'))).toBe(false)
    expect(canSubmit(blank, ref('cohort', 'null'))).toBe(false)
  })

  it('admin da entidade modera e publica na hora a própria entidade; membro comum espera', () => {
    expect(canModerate(actor(), ref('entity', 'atletica'))).toBe(true)
    expect(initialStatus(actor(), ref('entity', 'atletica'))).toBe('approved')
    expect(canModerate(actor(), ref('entity', 'dasi'))).toBe(false)
    expect(initialStatus(actor(), ref('entity', 'dasi'))).toBe('pending')
  })

  it('superadmin que propõe em usp/campus aprova na hora', () => {
    expect(initialStatus(actor({ isSuperadmin: true }), ref('usp', null))).toBe('approved')
  })
})

describe('Review Focus 1: propor fora do próprio escopo', () => {
  it('matéria que o aluno não cursa', () => expect(canSubmit(actor(), ref('class', 'ACH2002'))).toBe(false))
  it('entidade de que saiu (fora de memberships)', () => expect(canSubmit(actor({ memberships: new Map() }), ref('entity', 'dasi'))).toBe(false))
  it('scopeValue nulo nunca passa fora de usp', () => {
    for (const scope of ['campus', 'course', 'cohort', 'class', 'entity'] as const) expect(canSubmit(actor(), ref(scope, null))).toBe(false)
  })
})

describe('Review Focus 2: admin de uma entidade moderando outra', () => {
  it('não modera nem vê pendente de outra entidade', () => {
    const outra = event({ scope: 'entity', scopeValue: 'dasi', status: 'pending' })
    const admin = actor({ memberships: new Map([['atletica', 'admin']]) })
    expect(canModerate(admin, outra)).toBe(false)
    expect(canView(admin, outra, { otherClasses: false })).toBe(false)
  })
  it('ex-admin (fora de memberships) não modera', () => {
    expect(canModerate(actor({ memberships: new Map() }), ref('entity', 'atletica'))).toBe(false)
  })
})

describe('canView', () => {
  const o = { otherClasses: false }
  it('autor vê o próprio evento em qualquer status', () => {
    for (const status of ['pending', 'approved', 'rejected', 'cancelled', 'hidden'] as const) {
      expect(canView(actor({ userId: 'author' }), event({ status }), o)).toBe(true)
    }
  })
  it('moderador vê qualquer status do seu escopo', () => {
    const e = event({ scope: 'entity', scopeValue: 'atletica', status: 'rejected' })
    expect(canView(actor(), e, o)).toBe(true)
    expect(canView(actor({ isSuperadmin: true }), event({ status: 'hidden' }), o)).toBe(true)
  })
  it('os demais só veem approved', () => {
    for (const status of ['pending', 'rejected', 'cancelled', 'hidden'] as const) expect(canView(actor(), event({ status }), o)).toBe(false)
    expect(canView(actor(), event(), o)).toBe(true)
  })
  it('createdBy nulo (importado) não dá acesso de autor', () => {
    expect(canView(actor({ userId: '' }), event({ createdBy: null, status: 'pending' }), o)).toBe(false)
  })
  it('matéria: só quem cursa, ou com o filtro "outras matérias"', () => {
    const e = event({ scope: 'class', scopeValue: 'ACH2002' })
    expect(canView(actor(), e, o)).toBe(false)
    expect(canView(actor(), e, { otherClasses: true })).toBe(true)
    expect(canView(actor(), event({ scope: 'class', scopeValue: 'ACH2001' }), o)).toBe(true)
  })
  it('matéria escondida não aparece nem com o filtro', () => {
    expect(canView(actor(), event({ scope: 'class', scopeValue: 'ACH2002', status: 'hidden' }), { otherClasses: true })).toBe(false)
  })
  it('entidade "members": só membros ou moderador; "public": todos', () => {
    const interno = event({ scope: 'entity', scopeValue: 'dasi', visibility: 'members' })
    expect(canView(actor(), interno, o)).toBe(true)
    expect(canView(actor({ memberships: new Map() }), interno, o)).toBe(false)
    expect(canView(actor({ memberships: new Map(), isSuperadmin: true }), interno, o)).toBe(true)
    expect(canView(actor({ memberships: new Map() }), { ...interno, visibility: 'public' }, o)).toBe(true)
  })
  it('usp, campus, curso e turma aprovados são públicos', () => {
    const stranger = actor({ campus: null, course: null, entryYear: null, classCodes: new Set(), memberships: new Map() })
    for (const [scope, value] of [['usp', null], ['campus', 'IME'], ['course', 'Direito'], ['cohort', '2001']] as const) {
      expect(canView(stranger, event({ scope, scopeValue: value }), o)).toBe(true)
    }
  })
})

describe('Review Focus 4: canReport', () => {
  const cls = event({ scope: 'class', scopeValue: 'ACH2001' })
  it('colega da matéria denuncia', () => expect(canReport(actor(), cls)).toBe(true))
  it('autor não denuncia o próprio evento', () => expect(canReport(actor({ userId: 'author' }), cls)).toBe(false))
  it('quem não cursa não denuncia', () => expect(canReport(actor({ classCodes: new Set() }), cls)).toBe(false))
  it('superadmin que não cursa também não denuncia', () => expect(canReport(actor({ isSuperadmin: true, classCodes: new Set() }), cls)).toBe(false))
  it('só em matéria aprovada', () => {
    for (const status of ['pending', 'rejected', 'cancelled', 'hidden'] as const) expect(canReport(actor(), { ...cls, status })).toBe(false)
  })
  it('fora de matéria não há denúncia', () => {
    expect(canReport(actor(), event({ scope: 'entity', scopeValue: 'dasi' }))).toBe(false)
    expect(canReport(actor(), event())).toBe(false)
  })
})

describe('canEdit / canCancel', () => {
  const mine = actor({ userId: 'author' })
  it('autor e moderador editam e cancelam', () => {
    expect(canEdit(mine, event())).toBe(true)
    expect(canCancel(mine, event({ status: 'pending' }))).toBe(true)
    expect(canEdit(actor({ isSuperadmin: true }), event())).toBe(true)
    expect(canCancel(actor(), event({ scope: 'entity', scopeValue: 'atletica' }))).toBe(true)
  })
  it('terceiros não', () => {
    expect(canEdit(actor(), event())).toBe(false)
    expect(canCancel(actor(), event())).toBe(false)
  })
  it('nunca em cancelled ou rejected, nem para o superadmin', () => {
    for (const status of ['cancelled', 'rejected'] as const) {
      expect(canEdit(mine, event({ status }))).toBe(false)
      expect(canCancel(actor({ isSuperadmin: true }), event({ status }))).toBe(false)
    }
  })
  it('hidden só o moderador', () => {
    expect(canEdit(mine, event({ status: 'hidden' }))).toBe(false)
    expect(canCancel(actor({ isSuperadmin: true }), event({ status: 'hidden' }))).toBe(true)
  })
})

describe('Review Focus 5: splitEdit (P7)', () => {
  const author = actor({ userId: 'author' })
  const approved = event({ scope: 'campus', scopeValue: 'EACH' })
  const patch = { title: 'Outro', kind: 'event' as const, startsAt: '2026-11-11T13:00:00.000Z', endsAt: '2026-11-11T15:00:00.000Z', allDay: true, description: 'novo', location: 'Sala 1', link: 'https://x.com/', visibility: 'public' as const }

  it('aprovado e moderado: descrição/local/link direto, título/data/tipo para revisão', () => {
    const { direct, needsReview } = splitEdit(approved, patch, author)
    expect(direct).toEqual({ description: 'novo', location: 'Sala 1', link: 'https://x.com/' })
    expect(needsReview).toEqual({ title: 'Outro', kind: 'event', startsAt: '2026-11-11T13:00:00.000Z', endsAt: '2026-11-11T15:00:00.000Z', allDay: true })
  })
  it('matéria (sem moderação): tudo vale na hora', () => {
    const { direct, needsReview } = splitEdit(event({ scope: 'class', scopeValue: 'ACH2001' }), patch, author)
    expect(needsReview).toBeNull()
    expect(direct.title).toBe('Outro')
    expect(direct.startsAt).toBe(patch.startsAt)
  })
  it('moderador edita tudo direto', () => {
    expect(splitEdit(approved, patch, actor({ isSuperadmin: true })).needsReview).toBeNull()
    expect(splitEdit(approved, patch, actor({ isSuperadmin: true })).direct.title).toBe('Outro')
  })
  it('pendente: autor ainda edita tudo direto', () => {
    const { direct, needsReview } = splitEdit({ ...approved, status: 'pending' }, patch, author)
    expect(needsReview).toBeNull()
    expect(direct.title).toBe('Outro')
  })
  it('ignora campos que não mudaram, inclusive a mesma data em outro formato', () => {
    const same = splitEdit(approved, { title: approved.title, startsAt: '2026-11-10T10:00:00-03:00', description: null }, author)
    expect(same).toEqual({ direct: {}, needsReview: null })
  })
  it('só campos livres: needsReview fica nulo', () => {
    expect(splitEdit(approved, { description: 'x' }, author)).toEqual({ direct: { description: 'x' }, needsReview: null })
  })
})

describe('reviewTransition', () => {
  const t = (status: EventRecord['status'], decision: Parameters<typeof reviewTransition>[1], pendingChanges: EventRecord['pendingChanges'] = null) =>
    reviewTransition({ status, pendingChanges }, decision)
  it('pending: approve -> approved, reject -> rejected', () => {
    expect(t('pending', 'approve')).toBe('approved')
    expect(t('pending', 'reject')).toBe('rejected')
  })
  it('approved com edição pendente: approve aplica e reject descarta, ambos seguem approved', () => {
    expect(t('approved', 'approve', { title: 'x' })).toBe('approved')
    expect(t('approved', 'reject', { title: 'x' })).toBe('approved')
  })
  it('approved sem edição pendente não tem o que revisar', () => {
    expect(t('approved', 'approve')).toBeNull()
    expect(t('approved', 'reject')).toBeNull()
  })
  it('hidden: restore -> approved, remove -> cancelled', () => {
    expect(t('hidden', 'restore')).toBe('approved')
    expect(t('hidden', 'remove')).toBe('cancelled')
  })
  it('transições inválidas dão null (a segunda decisão simultânea perde)', () => {
    expect(t('rejected', 'approve')).toBeNull()
    expect(t('cancelled', 'approve')).toBeNull()
    expect(t('hidden', 'approve')).toBeNull()
    expect(t('hidden', 'reject')).toBeNull()
    expect(t('pending', 'restore')).toBeNull()
    expect(t('pending', 'remove')).toBeNull()
    expect(t('approved', 'restore')).toBeNull()
  })
})
