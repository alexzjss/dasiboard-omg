// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseDisciplinePage } from './jupiter.js'

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
