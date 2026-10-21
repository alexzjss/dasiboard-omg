import { request } from 'node:https'
import { logError } from './lib/errors.js'

// Reads the PUBLIC class listing of JupiterWeb (Disciplina → Turmas). No login, no
// credentials: the page is open to anyone and lists every section with its timetable.

export type SectionSlot = { weekday: number; startsAt: string; endsAt: string }
export type Section = { code: string; type: string; room: string; startDate: string; endDate: string; slots: SectionSlot[]; teachers: string[] }
export type Discipline = { code: string; title: string; sections: Section[] }

const turmaUrl = 'https://uspdigital.usp.br/jupiterweb/obterTurma'
const browserHeaders = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36', Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' }
const weekdays: Record<string, number> = { seg: 0, ter: 1, qua: 2, qui: 3, sex: 4, sab: 5, sáb: 5, dom: 6 }

export const disciplineCodePattern = /^[A-Z]{3}\d{4}$/

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
}

function cellText(value: string) { return decodeEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() }

// Tolerant row reader: the page is old HTML that nests layout tables and does not
// always close </tr> or </td>, so a row ends at the next <tr>, <table> or </table>.
function tableRows(html: string) {
  const rows: string[][] = []
  let rowStart = -1
  const closeRow = (end: number) => {
    if (rowStart < 0) return
    const cells = html.slice(rowStart, end).split(/<t[dh]\b[^>]*>/i).slice(1)
    if (cells.length) rows.push(cells.map((cell) => cellText(cell.split(/<\/t[dh]>/i)[0])))
    rowStart = -1
  }
  for (const tag of html.matchAll(/<(\/?)(tr|table)\b[^>]*>/gi)) {
    closeRow(tag.index)
    if (!tag[1] && tag[2].toLowerCase() === 'tr') rowStart = tag.index + tag[0].length
  }
  closeRow(html.length)
  return rows
}

function normalizeTime(value: string) {
  const match = value.match(/^(\d{1,2})[:h](\d{2})?$/i)
  return match ? `${match[1].padStart(2, '0')}:${match[2] || '00'}` : ''
}

function weekdayOf(value: string) {
  const key = value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().slice(0, 3)
  return Object.hasOwn(weekdays, key) && /^[a-z]/i.test(value) ? weekdays[key] : -1
}

const isTimeOrBlank = (value: string | undefined) => !value || normalizeTime(value) !== ''

// Timetable rows look like |ter|10:00|11:50|Prof A|. Continuation rows leave the
// day (another teacher or a later end) or the day and start (a second class on the
// same day) blank. Rows are recognized by shape, not by the "Horário" header.
const isClassRow = (cells: string[]) => cells.length >= 3 && weekdayOf(cells[0]) >= 0 && normalizeTime(cells[1]) !== '' && normalizeTime(cells[2]) !== ''
const isContinuationRow = (cells: string[]) => cells.length >= 3 && cells[0] === '' && isTimeOrBlank(cells[1]) && isTimeOrBlank(cells[2])

export function parseDisciplinePage(html: string, code: string): Discipline {
  const text = cellText(html)
  const title = text.match(new RegExp(`Disciplina:\\s*${code}\\s*-\\s*(.+?)\\s+(?:Clique|Lista de Turmas|Código da Turma)`, 'i'))?.[1]?.trim() || ''
  const sections: Section[] = []
  let current: Section | null = null
  let inTimetable = false
  let day = -1

  for (const cells of tableRows(html)) {
    const label = cells[0] || ''
    if (current && (isClassRow(cells) || (inTimetable && isContinuationRow(cells)))) {
      const [dayCell, startCell, endCell, teacher = ''] = cells
      if (dayCell) day = weekdayOf(dayCell)
      const startsAt = normalizeTime(startCell)
      const endsAt = normalizeTime(endCell)
      const last = current.slots.at(-1)
      if (startsAt && endsAt) current.slots.push({ weekday: day, startsAt, endsAt })
      else if (!startsAt && endsAt && last && endsAt > last.endsAt) last.endsAt = endsAt
      if (teacher && !current.teachers.includes(teacher)) current.teachers.push(teacher)
      inTimetable = true
      continue
    }
    if (/^Horário/i.test(label)) { inTimetable = true; day = -1; continue }
    if (inTimetable && cells.every((cell) => cell === '')) continue
    inTimetable = false
    if (/^Código\s+da\s+Turma\s+Teórica/i.test(label)) continue
    if (/^Código\s+da\s+Turma/i.test(label)) {
      current = { code: cells[1]?.match(/^\w+/)?.[0] || '', type: '', room: '', startDate: '', endDate: '', slots: [], teachers: [] }
      if (current.code) sections.push(current)
    } else if (!current) continue
    else if (/^Tipo\s+da\s+Turma/i.test(label)) current.type = cells[1] || ''
    else if (/^Início/i.test(label)) current.startDate = cells[1] || ''
    else if (/^Fim/i.test(label)) current.endDate = cells[1] || ''
    else if (/^Observações/i.test(label)) current.room = (cells[1] || '').replace(/^\*+\s*TURMA EXTRA\*+\s*/i, '').trim()
  }

  return { code, title, sections: sections.map((section) => ({ ...section, slots: section.slots.filter((slot) => slot.weekday >= 0) })) }
}

function getPage(url: string) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const target = new URL(url)
    const req = request({ hostname: target.hostname, path: `${target.pathname}${target.search}`, method: 'GET', headers: browserHeaders, timeout: 15_000 }, (response) => {
      const chunks: Buffer[] = []
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      response.on('end', () => resolve({ status: response.statusCode || 0, body: Buffer.concat(chunks).toString('latin1') }))
    })
    req.on('timeout', () => req.destroy(new Error('JupiterWeb demorou demais para responder')))
    req.on('error', reject)
    req.end()
  })
}

// Timetables change rarely within a semester; caching spares JupiterWeb (it throttles crawlers).
const cache = new Map<string, { value: Discipline; expiresAt: number }>()
const cacheTtlMs = 6 * 60 * 60_000

export async function fetchDiscipline(code: string): Promise<Discipline> {
  const cached = cache.get(code)
  if (cached && cached.expiresAt > Date.now()) return cached.value
  const response = await getPage(`${turmaUrl}?nomdis=&sgldis=${encodeURIComponent(code)}`)
  if (response.status >= 400) throw new Error('O JupiterWeb não respondeu')
  const value = parseDisciplinePage(response.body, code)
  // The page is public, so logging a snippet is safe and shows what changed in its markup.
  if (value.sections.length && value.sections.every((section) => !section.slots.length)) {
    const at = Math.max(0, response.body.search(/Hor.rio/i))
    logError(`JupiterWeb timetable not found for ${code}`, response.body.slice(at, at + 1500).replace(/\s+/g, ' '))
  }
  if (cache.size > 2_000) cache.clear()
  cache.set(code, { value, expiresAt: Date.now() + cacheTtlMs })
  return value
}
