import { describe, expect, it } from 'vitest'
import { buildIcs, escapeText, foldLine, type IcsEvent } from './ics.js'

const NOW = new Date('2026-10-21T15:00:00Z') // quarta-feira
const base: IcsEvent = { id: 'e1', title: 'Prova', description: null, kind: 'exam', startsAt: '2026-10-25T14:00:00Z', endsAt: null, allDay: false, location: null, link: null }
const build = (events: IcsEvent[] = [], classes: Parameters<typeof buildIcs>[0]['classes'] = []) => buildIcs({ calendarName: 'Dasiboard', events, classes, now: NOW })
const unfold = (ics: string) => ics.replace(/\r\n /g, '')

describe('buildIcs', () => {
  it('uses CRLF and the calendar header', () => {
    const ics = build([base])
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Dasiboard//Calendario//PT\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
    expect(ics).toContain('CALSCALE:GREGORIAN\r\n')
    expect(ics).toContain('X-WR-CALNAME:Dasiboard\r\n')
    expect(ics).toContain('X-WR-TIMEZONE:America/Sao_Paulo\r\n')
  })

  it('escapes backslash, semicolon, comma and newlines', () => {
    expect(escapeText('a\\b;c,d\ne')).toBe('a\\\\b\;c\\,d\\ne')
    const ics = unfold(build([{ ...base, title: 'Lab; sala 2, bloco A', description: 'linha 1\nlinha 2' }]))
    expect(ics).toContain('SUMMARY:Lab\; sala 2\\, bloco A')
    expect(ics).toContain('DESCRIPTION:linha 1\\nlinha 2\\nTipo: Prova')
  })

  it('folds at 75 octets without splitting multibyte characters', () => {
    const ics = build([{ ...base, title: 'Reunião de coordenação pedagógica ção ção ção ção ção ção ção ção ção ção ção' }])
    for (const line of ics.split('\r\n')) expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75)
    expect(ics).toMatch(/\r\n /)
    expect(unfold(ics)).toContain('SUMMARY:Reunião de coordenação pedagógica ção ção ção ção ção ção ção ção ção ção ção')
    const folded = foldLine(`X:${'é'.repeat(100)}`)
    expect(folded.split('\r\n').every((l) => Buffer.byteLength(l, 'utf8') <= 75)).toBe(true)
    expect(folded.replace(/\r\n /g, '')).toBe(`X:${'é'.repeat(100)}`)
  })

  it('writes timed events in UTC with a 1 hour default', () => {
    const ics = build([base])
    expect(ics).toContain('UID:e1@dasiboard\r\n')
    expect(ics).toContain('DTSTAMP:20261021T150000Z\r\n')
    expect(ics).toContain('DTSTART:20261025T140000Z\r\nDTEND:20261025T150000Z\r\n')
    expect(ics).toContain('DESCRIPTION:Tipo: Prova')
  })

  it('writes all-day events by São Paulo date with an exclusive end', () => {
    const ics = build([{ ...base, allDay: true, startsAt: '2026-10-21T00:00:00-03:00', endsAt: null }])
    expect(ics).toContain('DTSTART;VALUE=DATE:20261021\r\nDTEND;VALUE=DATE:20261022\r\n')
    const multi = build([{ ...base, allDay: true, startsAt: '2026-10-21T00:00:00-03:00', endsAt: '2026-10-23T23:59:00-03:00' }])
    expect(multi).toContain('DTSTART;VALUE=DATE:20261021\r\nDTEND;VALUE=DATE:20261024\r\n')
  })

  it('keeps a 23:30 São Paulo event on its own day in UTC terms', () => {
    const ics = build([{ ...base, startsAt: '2026-10-21T23:30:00-03:00', endsAt: '2026-10-22T00:30:00-03:00' }])
    expect(ics).toContain('DTSTART:20261022T023000Z\r\nDTEND:20261022T033000Z\r\n')
    const allDay = build([{ ...base, allDay: true, startsAt: '2026-10-21T23:30:00-03:00' }])
    expect(allDay).toContain('DTSTART;VALUE=DATE:20261021\r\n')
  })

  it('only emits https links and a location', () => {
    expect(build([{ ...base, link: 'https://usp.br/x', location: 'Auditório' }])).toContain('URL:https://usp.br/x\r\nEND:VEVENT')
    expect(build([{ ...base, link: 'http://usp.br/x' }])).not.toContain('URL:')
    expect(build([{ ...base, link: 'javascript:alert(1)' }])).not.toContain('URL:')
    expect(build([{ ...base, location: 'Auditório' }])).toContain('LOCATION:Auditório')
  })

  it('adds scope to the description', () => {
    expect(unfold(build([{ ...base, scopeLabel: 'ACH2001' }]))).toContain('Tipo: Prova · Escopo: ACH2001')
  })

  it('writes classes as weekly recurrences with a timezone', () => {
    const ics = build([], [{ weekday: 0, startsAt: '08:00', endsAt: '09:40', title: 'Cálculo', code: 'MAT0101', room: '101', building: 'I1' }])
    expect(ics).toContain('BEGIN:VTIMEZONE\r\nTZID:America/Sao_Paulo\r\n')
    expect(ics).toContain('TZOFFSETFROM:-0300\r\nTZOFFSETTO:-0300\r\n')
    expect(ics).toContain('UID:class-MAT0101-0-08:00@dasiboard\r\n')
    expect(ics).toContain('DTSTART;TZID=America/Sao_Paulo:20261026T080000\r\n') // próxima segunda
    expect(ics).toContain('DTEND;TZID=America/Sao_Paulo:20261026T094000\r\n')
    expect(ics).toContain('RRULE:FREQ=WEEKLY;UNTIL=20270218T150000Z\r\n')
    expect(ics).toContain('LOCATION:101 - I1')
  })

  it('starts today when the class weekday is today', () => {
    const ics = build([], [{ weekday: 2, startsAt: '10:00', endsAt: '11:40', title: 'MAT0101', code: 'MAT0101' }])
    expect(ics).toContain('DTSTART;TZID=America/Sao_Paulo:20261021T100000\r\n')
    expect(ics).toContain('SUMMARY:MAT0101\r\n')
  })
})
