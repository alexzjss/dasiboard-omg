// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { anonymous, as } from '../test/helpers.js'

const fetchDiscipline = vi.fn()
const fetchCatalog = vi.fn()
vi.mock('../jupiter.js', async (original) => ({ ...await original<typeof import('../jupiter.js')>(), fetchDiscipline: (code: string) => fetchDiscipline(code), fetchCatalog: () => fetchCatalog() }))

const user = { sub: 'sub-1', name: 'Ana', email: 'ana@usp.br' }

beforeEach(() => { fetchDiscipline.mockReset(); fetchCatalog.mockReset() })

describe('GET /api/schedule/disciplines/:code', () => {
  it('requires a session', async () => {
    expect((await anonymous().get('/api/schedule/disciplines/ACH2001')).status).toBe(401)
  })

  it('rejects malformed codes without calling JupiterWeb', async () => {
    const response = await (await as(user)).get('/api/schedule/disciplines/ACH')
    expect(response.status).toBe(400)
    expect(fetchDiscipline).not.toHaveBeenCalled()
  })

  it('returns the public sections, normalizing the code', async () => {
    fetchDiscipline.mockResolvedValue({ code: 'ACH2001', title: 'IP', sections: [{ code: '2026104', type: 'Teórica', room: '', startDate: '', endDate: '', slots: [], teachers: [] }] })
    const response = await (await as(user)).get('/api/schedule/disciplines/ach2001')
    expect(response.status).toBe(200)
    expect(fetchDiscipline).toHaveBeenCalledWith('ACH2001')
    expect(response.body.sections).toHaveLength(1)
  })

  it('answers 404 when the discipline has no sections and 502 when JupiterWeb fails', async () => {
    const api = await as(user)
    fetchDiscipline.mockResolvedValueOnce({ code: 'ACH9999', title: '', sections: [] })
    expect((await api.get('/api/schedule/disciplines/ACH9999')).status).toBe(404)
    fetchDiscipline.mockRejectedValueOnce(new Error('down'))
    expect((await api.get('/api/schedule/disciplines/ACH2002')).status).toBe(502)
  })
})

describe('GET /api/schedule/disciplines?q=', () => {
  it('requires a session and a query of 2 to 60 characters', async () => {
    expect((await anonymous().get('/api/schedule/disciplines?q=calc')).status).toBe(401)
    const api = await as(user)
    expect((await api.get('/api/schedule/disciplines?q=a')).status).toBe(400)
    expect((await api.get('/api/schedule/disciplines')).status).toBe(400)
    expect((await api.get(`/api/schedule/disciplines?q=${'a'.repeat(61)}`)).status).toBe(400)
    expect(fetchCatalog).not.toHaveBeenCalled()
  })

  it('returns matches from the catalog', async () => {
    fetchCatalog.mockResolvedValue([{ code: 'ACH2011', title: 'Cálculo I' }, { code: 'ACH2001', title: 'Introdução à Programação' }])
    const response = await (await as(user)).get('/api/schedule/disciplines?q=calculo')
    expect(response.status).toBe(200)
    expect(response.body.results).toEqual([{ code: 'ACH2011', title: 'Cálculo I' }])
  })

  it('answers 503 when JupiterWeb fails, so the client searches local data', async () => {
    fetchCatalog.mockRejectedValue(new Error('down'))
    expect((await (await as(user)).get('/api/schedule/disciplines?q=ACH2001')).status).toBe(503)
  })
})
