import { request } from 'node:http'
import { request as requestHttps } from 'node:https'
import { randomUUID } from 'node:crypto'

import type { ScheduleEntry } from './db.js'

type JupiterRow = { horent?: string; horsai?: string; seg?: string | null; ter?: string | null; qua?: string | null; qui?: string | null; sex?: string | null; sab?: string | null; dom?: string | null }

const jupiterOrigin = 'https://uspdigital.usp.br'
const loginUrl = `${jupiterOrigin}/jupiterweb/autenticar`
const dwrUrl = `${jupiterOrigin}/jupiterweb/dwr/call/plaincall/GradeHorariaControleDWR.obterGradeHoraria.dwr`
const courseUrl = `${jupiterOrigin}/jupiterweb/obterTurma`
const browserHeaders = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36', Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' }

function encodeForm(values: Record<string, string>) { return new URLSearchParams(values).toString() }

async function requestJupiter(url: string, method: 'GET' | 'POST', body = '', headers: Record<string, string> = {}) {
  const target = new URL(url)
  const client = target.protocol === 'https:' ? requestHttps : request
  return new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }>((resolve, reject) => {
    const requestOptions = { hostname: target.hostname, port: target.port || undefined, path: `${target.pathname}${target.search}`, method, headers: { ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } : {}), ...headers } }
    const requestInstance = client(requestOptions, (response) => {
      const chunks: Buffer[] = []
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      response.on('end', () => resolve({ status: response.statusCode || 0, headers: response.headers, body: Buffer.concat(chunks).toString('latin1') }))
    })
    requestInstance.on('error', reject)
    requestInstance.write(body)
    requestInstance.end()
  })
}

function post(url: string, body: string, headers: Record<string, string> = {}) { return requestJupiter(url, 'POST', body, headers) }
function get(url: string, headers: Record<string, string> = {}) { return requestJupiter(url, 'GET', '', headers) }

function getCookies(setCookie: string | string[] | undefined) {
  return (Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []).map((cookie) => cookie.split(';', 1)[0]).join('; ')
}

function mergeCookies(...cookieHeaders: Array<string | string[] | undefined>) {
  const cookies = new Map<string, string>()
  for (const header of cookieHeaders) {
    for (const cookie of getCookies(header).split('; ').filter(Boolean)) {
      const separator = cookie.indexOf('=')
      if (separator > 0) cookies.set(cookie.slice(0, separator), cookie.slice(separator + 1))
    }
  }
  return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')
}

function readDwrRows(body: string): JupiterRow[] {
  const start = body.indexOf('dwr.engine.remote.handleCallback')
  if (start < 0) throw new Error('JupiterWeb não retornou a grade horária')
  const rows: JupiterRow[] = []
  const rowPattern = /\{codpes:[^,]+,codpgm:[^,]+,dataHoje:[^,]+,dom:([^,]+),horent:"([^"]+)",horsai:"([^"]+)",nao:[^,]+,qua:([^,]+),qui:([^,]+),sab:([^,]+),seg:([^,]+),sex:([^,]+),ter:([^,]+),/g
  let match: RegExpExecArray | null
  while ((match = rowPattern.exec(body))) rows.push({ dom: match[1] === 'null' ? null : match[1], horent: match[2], horsai: match[3], qua: match[4] === 'null' ? null : match[4], qui: match[5] === 'null' ? null : match[5], sab: match[6] === 'null' ? null : match[6], seg: match[7] === 'null' ? null : match[7], sex: match[8] === 'null' ? null : match[8], ter: match[9] === 'null' ? null : match[9] })
  if (!rows.length) throw new Error('JupiterWeb retornou uma grade vazia')
  return rows
}

function normalizeClass(value: string | null | undefined) {
  const [code = '', sectionCode = ''] = value?.replace(/^"|"$/g, '').trim().replace(/^\$/, '').split('-') || []
  return { code: code.trim(), sectionCode: sectionCode.trim() }
}

function stripHtml(value: string) { return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim() }

async function getCourseDetails(code: string, sectionCode: string) {
  const response = await get(`${courseUrl}?nomdis=&sgldis=${encodeURIComponent(code)}`, browserHeaders)
  if (response.status >= 400) return { title: code, room: '' }
  const text = stripHtml(response.body)
  const titleMatch = text.match(new RegExp(`Disciplina:\\s*${code}\\s*-\\s*(.+?)\\s+(?:Clique|Lista de Turmas)`, 'i'))
  const sectionMatch = sectionCode ? text.match(new RegExp(`Código da Turma:\\s*${sectionCode}.*?Observações:\\s*(.+?)\\s+Horário`, 'i')) : null
  const room = sectionMatch?.[1]?.replace(/^\*+\s*TURMA EXTRA\*+\s*/i, '').trim() || ''
  return { title: titleMatch?.[1]?.trim() || code, room }
}

export async function fetchJupiterSchedule(codpes: string, password: string, codpgm: string): Promise<ScheduleEntry[]> {
  const initial = await get(`${jupiterOrigin}/jupiterweb/webLogin.jsp`, browserHeaders)
  const login = await post(loginUrl, encodeForm({ codpes, senusu: password, url: '', Submit: ' Entrar ' }), { ...browserHeaders, Cookie: getCookies(initial.headers['set-cookie']), Referer: `${jupiterOrigin}/jupiterweb/webLogin.jsp` })
  const cookies = mergeCookies(initial.headers['set-cookie'], login.headers['set-cookie'])
  if (!cookies || login.status >= 400) throw new Error('O JupiterWeb recusou a autenticação')
  const gradePage = await get(`${jupiterOrigin}/jupiterweb/gradeHoraria?codmnu=4759`, { ...browserHeaders, Cookie: cookies, Referer: loginUrl })
  if (gradePage.status >= 400) throw new Error('O JupiterWeb não ficou disponível após o login')
  const gradePageText = stripHtml(gradePage.body)
  const isLoginPage = /(?:name|id)=["'](?:codpes|senusu)["']/i.test(gradePage.body) || /Login\s+Usuário\s*:/i.test(gradePageText)
  if (isLoginPage) throw new Error('O JupiterWeb recusou a autenticação')
  const response = await post(dwrUrl, encodeForm({
    callCount: '1', nextReverseAjaxIndex: '0', 'c0-scriptName': 'GradeHorariaControleDWR', 'c0-methodName': 'obterGradeHoraria', 'c0-id': '0',
    'c0-param0': `string:${codpes}`, 'c0-param1': `string:${codpgm}`, batchId: '1', instanceId: '0', page: '/jupiterweb/gradeHoraria?codmnu=4759', scriptSessionId: `${randomUUID()}-*${randomUUID()}`,
  }), { ...browserHeaders, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', Cookie: cookies, Referer: `${jupiterOrigin}/jupiterweb/gradeHoraria?codmnu=4759`, 'X-Requested-With': 'XMLHttpRequest' })
  const rows = readDwrRows(response.body)
  const fields: Array<[keyof JupiterRow, number]> = [['seg', 0], ['ter', 1], ['qua', 2], ['qui', 3], ['sex', 4], ['sab', 5], ['dom', 6]]
  const rawEntries = rows.flatMap((row) => fields.flatMap(([field, weekday]) => {
    const classInfo = normalizeClass(row[field])
    return classInfo.code && row.horent && row.horsai ? [{ weekday, startsAt: row.horent, endsAt: row.horsai, title: classInfo.code, code: classInfo.code, sectionCode: classInfo.sectionCode, room: '', building: '' }] : []
  }))
  const details = new Map<string, { title: string; room: string }>()
  await Promise.all([...new Set(rawEntries.map((entry) => `${entry.code}|${entry.sectionCode || ''}`))].map(async (key) => {
    const [code, sectionCode] = key.split('|')
    details.set(key, await getCourseDetails(code, sectionCode))
  }))
  return rawEntries.map((entry) => {
    const detail = details.get(`${entry.code}|${entry.sectionCode || ''}`)
    return { ...entry, title: detail?.title || entry.title, room: detail?.room || entry.room }
  })
}
