// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseCatalogPage, parseDisciplinePage, searchCatalog } from './jupiter.js'

const info = (rows: Array<[string, string]>) => `<table>${rows.map(([label, value]) => `<tr><td><b>${label}</b></td><td>${value}</td></tr>`).join('')}</table>`
const timetable = (rows: string[][]) => `<table><tr><td>Horário</td><td></td><td></td><td>Prof(a)</td></tr>${rows.map((cells) => `<tr>${cells.map((c) => `<td><span>${c}</span></td>`).join('')}</tr>`).join('')}</table>`
const vagas = '<table><tr><td>Vagas</td><td>Inscritos</td></tr><tr><td>Obrigatória</td><td>60</td></tr></table>'

// Same shape as obterTurma: layout tables wrapping one info/timetable/vacancy table per section.
const page = `<html><body><table><tr><td>
  <table><tr><td>Disciplina: ACH2001 - Introdução à Programação</td></tr></table>
  <table><tr><td>
    ${info([['Código da Turma:', '2026104 &nbsp;'], ['Início:', '24/02/2026'], ['Fim:', '04/07/2026'], ['Tipo da Turma:', 'Teórica'], ['Observações:', '** TURMA EXTRA** Sala 104 - I1']])}
    ${timetable([['ter', '08:00', '09:45', 'Ana Souza'], ['', '', '', 'Bruno Lima'], ['qui', '10:15', '12:00', 'Ana Souza']])}
    ${vagas}
  </td></tr></table>
  <table><tr><td>
    ${info([['Código da Turma:', '2026194'], ['Código da Turma Teórica:', '2026104'], ['Tipo da Turma:', 'Prática Vinculada'], ['Observações:', '']])}
    ${timetable([['seg', '8:00', '09:45', 'Carla Dias'], ['', '', '11:00', 'Davi Reis'], ['', '14:00', '15:45', 'Carla Dias']])}
  </td></tr></table>
</td></tr></table></body></html>`

describe('parseDisciplinePage', () => {
  const discipline = parseDisciplinePage(page, 'ACH2001')

  it('reads the title and every section', () => {
    expect(discipline.title).toBe('Introdução à Programação')
    expect(discipline.sections.map((s) => s.code)).toEqual(['2026104', '2026194'])
  })

  it('reads type, room and timetable with extra teachers', () => {
    expect(discipline.sections[0]).toMatchObject({
      type: 'Teórica', room: 'Sala 104 - I1', startDate: '24/02/2026', endDate: '04/07/2026',
      slots: [{ weekday: 1, startsAt: '08:00', endsAt: '09:45' }, { weekday: 3, startsAt: '10:15', endsAt: '12:00' }],
      teachers: ['Ana Souza', 'Bruno Lima'],
    })
  })

  it('extends a class that ends later and keeps a second class on the same day', () => {
    expect(discipline.sections[1].slots).toEqual([
      { weekday: 0, startsAt: '08:00', endsAt: '11:00' },
      { weekday: 0, startsAt: '14:00', endsAt: '15:45' },
    ])
    expect(discipline.sections[1].teachers).toEqual(['Carla Dias', 'Davi Reis'])
  })

  it('returns no sections for a page without classes', () => {
    expect(parseDisciplinePage('<html><body>Nenhuma turma</body></html>', 'ACH9999').sections).toEqual([])
  })
})

describe('parseDisciplinePage with sloppy markup', () => {
  // Unclosed <tr>/<td>, <th> header and day/time cells wrapped in nested tables.
  const sloppy = `<table><tr><td>Disciplina: ACH2011 - Cálculo I</td></table>
  <div><table><tr><td>Código da Turma:<td><span>2026203</span><tr><td>Tipo da Turma:<td>Teórica<tr><td>Observações:<td>Sala 210</table>
  <table><tr><th>Horário<th><th><th>Prof(a)
  <tr><td>qua<td>16:15<td>18:00<td>Ana
  <tr><td><td><td><td>Bia
  <tr><td>Sex<td>14:00<td>15:45<td>Ana
  </table>
  <table><tr><td>Vagas<td>Inscritos<tr><td>Obrigatória<td>60</table></div>
  <div><table><tr><td>Código da Turma:</td><td>2026204</td></tr></table>
  <table><tr><td>Horário</td></tr><tr><td><table><tr><td>seg</td></tr></table></td></tr>
  <tr><td>ter</td><td>8h00</td><td>09:45</td><td>Caio</td></tr></table></div>`

  const discipline = parseDisciplinePage(sloppy, 'ACH2011')

  it('reads the timetable without closing tags or header cells', () => {
    expect(discipline.title).toBe('Cálculo I')
    expect(discipline.sections[0]).toMatchObject({
      code: '2026203', type: 'Teórica', room: 'Sala 210', teachers: ['Ana', 'Bia'],
      slots: [{ weekday: 2, startsAt: '16:15', endsAt: '18:00' }, { weekday: 4, startsAt: '14:00', endsAt: '15:45' }],
    })
  })

  it('recognizes class rows by shape even after noise', () => {
    expect(discipline.sections[1].slots).toEqual([{ weekday: 1, startsAt: '08:00', endsAt: '09:45' }])
  })
})

describe('parseCatalogPage', () => {
  const html = `<table><tr bgcolor="#658CCF"><td>Código</td><td>Nome</td>
    <tr><td><span>ACH2001</span><td><span>Introdução à Programação</span>
    <tr><td><span>ach2011</span><td>Cálculo &amp; Limites
    <tr><td><span>&nbsp;</span><td>Sem código
    <tr><td><span>ACH2001</span><td>Duplicada
    <tr><td><span>ACH2002</span><td></table>`

  it('reads code and name from sloppy HTML, skipping header, invalid and empty rows', () => {
    expect(parseCatalogPage(html)).toEqual([{ code: 'ACH2001', title: 'Introdução à Programação' }, { code: 'ACH2011', title: 'Cálculo & Limites' }])
  })
})

describe('searchCatalog', () => {
  const catalog = [
    { code: 'ACH2011', title: 'Cálculo I' },
    { code: 'ACH2001', title: 'Introdução à Programação' },
    { code: 'MAT0111', title: 'Introdução ao Cálculo Diferencial' },
    { code: 'ACH2012', title: 'Cálculo II' },
  ]

  it('ignores case and accents', () => {
    expect(searchCatalog('CALCULO', catalog).map((e) => e.code)).toEqual(['ACH2011', 'ACH2012', 'MAT0111'])
  })

  it('ranks code prefixes first, then word starts, then substrings', () => {
    expect(searchCatalog('ach20', catalog).map((e) => e.code)).toEqual(['ACH2001', 'ACH2011', 'ACH2012'])
    expect(searchCatalog('gramação', [...catalog, { code: 'XXX0001', title: 'Gramação' }]).map((e) => e.code)).toEqual(['XXX0001', 'ACH2001'])
  })

  it('requires every token and caps the results', () => {
    expect(searchCatalog('calc ii', catalog).map((e) => e.code)).toEqual(['ACH2012'])
    const many = Array.from({ length: 30 }, (_, i) => ({ code: `ACH${2000 + i}`, title: 'X' }))
    expect(searchCatalog('ach', many)).toHaveLength(12)
  })
})
