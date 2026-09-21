import { request } from 'node:http'
import { request as requestHttps } from 'node:https'
import { randomUUID } from 'node:crypto'

import type { ScheduleEntry } from './db.js'

type JupiterRow = { horent?: string; horsai?: string; seg?: string | null; ter?: string | null; qua?: string | null; qui?: string | null; sex?: string | null; sab?: string | null; dom?: string | null }

const jupiterOrigin = 'https://uspdigital.usp.br'
const loginUrl = `${jupiterOrigin}/jupiterweb/autenticar`
const dwrUrl = `${jupiterOrigin}/jupiterweb/dwr/call/plaincall/GradeHorariaControleDWR.obterGradeHoraria.dwr`

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

function normalizeCode(value: string | null | undefined) { return value?.replace(/^"|"$/g, '').trim().replace(/^\$/, '').split('-')[0].trim() || '' }

export async function fetchJupiterSchedule(codpes: string, password: string, codpgm: string): Promise<ScheduleEntry[]> {
  const initial = await get(`${jupiterOrigin}/jupiterweb/webLogin.jsp`)
  const login = await post(loginUrl, encodeForm({ codpes, senusu: password, url: '' }), { Cookie: getCookies(initial.headers['set-cookie']), Referer: `${jupiterOrigin}/jupiterweb/webLogin.jsp` })
  const cookies = mergeCookies(initial.headers['set-cookie'], login.headers['set-cookie'])
  if (!cookies || login.status >= 400) throw new Error('Não foi possível autenticar no JupiterWeb')
  const gradePage = await get(`${jupiterOrigin}/jupiterweb/gradeHoraria?codmnu=4759`, { Cookie: cookies, Referer: loginUrl })
  if (gradePage.status >= 400 || !/Grade\s+Hor/i.test(gradePage.body) || /Login Usuário|name=["']codpes["']/i.test(gradePage.body)) throw new Error('Não foi possível autenticar no JupiterWeb')
  const response = await post(dwrUrl, encodeForm({
    callCount: '1', nextReverseAjaxIndex: '0', 'c0-scriptName': 'GradeHorariaControleDWR', 'c0-methodName': 'obterGradeHoraria', 'c0-id': '0',
    'c0-param0': `string:${codpes}`, 'c0-param1': `string:${codpgm}`, batchId: '1', instanceId: '0', page: '/jupiterweb/gradeHoraria?codmnu=4759', scriptSessionId: `${randomUUID()}-*${randomUUID()}`,
  }), { Cookie: cookies, Referer: `${jupiterOrigin}/jupiterweb/gradeHoraria?codmnu=4759` })
  const rows = readDwrRows(response.body)
  const fields: Array<[keyof JupiterRow, number]> = [['seg', 0], ['ter', 1], ['qua', 2], ['qui', 3], ['sex', 4], ['sab', 5], ['dom', 6]]
  return rows.flatMap((row) => fields.flatMap(([field, weekday]) => {
    const code = normalizeCode(row[field])
    return code && row.horent && row.horsai ? [{ weekday, startsAt: row.horent, endsAt: row.horsai, title: code, code, room: '', building: '' }] : []
  }))
}
