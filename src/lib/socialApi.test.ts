import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError, getNotificationCount, getPerson, joinEntity, listConnections, listNotifications, markAllNotificationsRead, markNotificationRead, listPeople, removeConnection, requestConnection, updateMyProfile,
} from './socialApi'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function mockFetch(response: Response | (() => Promise<Response>)) {
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    typeof response === 'function' ? response() : Promise.resolve(response.clone()),
  )
  return spy
}

const lastCall = (spy: ReturnType<typeof mockFetch>) => {
  const [url, init] = spy.mock.calls[spy.mock.calls.length - 1] as [string, RequestInit]
  return { url, init }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('socialApi: pessoas', () => {
  it('monta a query com filtros e cursor, sem parâmetros vazios', async () => {
    const spy = mockFetch(jsonResponse({ people: [], nextCursor: null }))
    await listPeople({ q: '  ana ', curso: 'SI', ano: 2024, entidade: 'dasi', materia: 'ACH2023' }, 'alex.santana')
    const { url, init } = lastCall(spy)
    const params = new URL(url, 'http://x').searchParams
    expect(url.startsWith('/api/people?')).toBe(true)
    expect(params.get('q')).toBe('ana')
    expect(params.get('curso')).toBe('SI')
    expect(params.get('ano')).toBe('2024')
    expect(params.get('entidade')).toBe('dasi')
    expect(params.get('materia')).toBe('ACH2023')
    expect(params.get('cursor')).toBe('alex.santana')
    expect(init.credentials).toBe('include')
    expect(init.method).toBeUndefined()
  })

  it('sem filtros não adiciona "?"', async () => {
    const spy = mockFetch(jsonResponse({ people: [], nextCursor: null }))
    await listPeople()
    expect(lastCall(spy).url).toBe('/api/people')
  })

  it('codifica o handle na rota de perfil', async () => {
    const spy = mockFetch(jsonResponse({ profile: {} }))
    await getPerson('a/b c')
    expect(lastCall(spy).url).toBe('/api/people/a%2Fb%20c')
  })
})

describe('socialApi: conexões', () => {
  it('envia POST para o handle codificado e devolve o status', async () => {
    const spy = mockFetch(jsonResponse({ status: 'pending' }, 201))
    const result = await requestConnection('maria.silva')
    const { url, init } = lastCall(spy)
    expect(url).toBe('/api/connections/maria.silva')
    expect(init.method).toBe('POST')
    expect(result).toEqual({ status: 'pending' })
  })

  it('remove conexão com DELETE e aceita 204 sem corpo', async () => {
    const spy = mockFetch(new Response(null, { status: 204 }))
    await expect(removeConnection('maria.silva')).resolves.toBeUndefined()
    expect(lastCall(spy).init.method).toBe('DELETE')
  })

  it('lista pedidos pendentes e devolve só o array de conexões', async () => {
    const spy = mockFetch(jsonResponse({ connections: [{ handle: 'x', name: 'X', picture: null, course: 'SI', createdAt: 'now' }] }))
    const list = await listConnections('pending')
    expect(lastCall(spy).url).toBe('/api/connections?status=pending')
    expect(list).toHaveLength(1)
  })

  it('lê a contagem de notificações e de pedidos', async () => {
    mockFetch(jsonResponse({ unread: 3, pendingRequests: 12 }))
    await expect(getNotificationCount()).resolves.toEqual({ unread: 3, pendingRequests: 12 })
  })

  it('lista notificações com cursor e marca como lidas', async () => {
    const spy = mockFetch(jsonResponse({ items: [], nextCursor: null }))
    await listNotifications('abc')
    expect(lastCall(spy).url).toBe('/api/notifications?cursor=abc')
    mockFetch(new Response(null, { status: 204 }))
    await markNotificationRead('n 1')
    const spy2 = mockFetch(new Response(null, { status: 204 }))
    await markAllNotificationsRead()
    expect(lastCall(spy2).url).toBe('/api/notifications/read-all')
    expect(lastCall(spy2).init.method).toBe('POST')
  })
})

describe('socialApi: entidades e perfil', () => {
  it('atualiza o perfil com PATCH e corpo JSON', async () => {
    const spy = mockFetch(jsonResponse({ profile: {} }))
    await updateMyProfile({ bio: 'oi', showCourses: 'connections' })
    const { url, init } = lastCall(spy)
    expect(url).toBe('/api/me/profile')
    expect(init.method).toBe('PATCH')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body as string)).toEqual({ bio: 'oi', showCourses: 'connections' })
  })

  it('envia o código de convite no corpo ao entrar em entidade', async () => {
    const spy = mockFetch(jsonResponse({ entity: { id: 'dasi', name: 'DASI' } }))
    await joinEntity('DASI-7KQ2')
    const { url, init } = lastCall(spy)
    expect(url).toBe('/api/entities/join')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ code: 'DASI-7KQ2' })
  })
})

describe('socialApi: erros', () => {
  it('converte erro com campo error em ApiError', async () => {
    mockFetch(jsonResponse({ error: 'Código inválido' }, 404))
    const error = await joinEntity('x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, message: 'Código inválido' })
  })

  it('usa mensagem padrão quando o corpo não é JSON', async () => {
    mockFetch(new Response('<html>502</html>', { status: 502 }))
    const error = await getNotificationCount().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 502 })
    expect((error as ApiError).message).toBeTruthy()
  })

  it('falha de rede vira ApiError com status 0', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    const error = await getNotificationCount().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 0 })
  })

  it('repassa AbortError sem convertê-lo', async () => {
    mockFetch(() => Promise.reject(new DOMException('cancelled', 'AbortError')))
    const error = await getNotificationCount().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(DOMException)
    expect((error as DOMException).name).toBe('AbortError')
  })
})
