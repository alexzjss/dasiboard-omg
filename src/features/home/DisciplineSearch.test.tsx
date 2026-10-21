import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { apiFetch } from '../../lib/api'
import { DisciplineSearch } from './DisciplineSearch'
import { ScheduleBuilder } from './ScheduleBuilder'

vi.mock('../../lib/api', () => ({ apiFetch: vi.fn() }))

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
const results = [{ code: 'ACH2011', title: 'Cálculo I' }, { code: 'ACH2012', title: 'Cálculo II' }]

afterEach(() => { cleanup(); vi.mocked(apiFetch).mockReset() })

describe('DisciplineSearch', () => {
  it('lists options while typing and picks one with the keyboard', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json(200, { results }))
    const onPick = vi.fn()
    render(<DisciplineSearch value="calc" onChange={() => {}} onPick={onPick} />)
    const input = screen.getByRole('combobox')
    expect(await screen.findAllByRole('option')).toHaveLength(2)
    expect(apiFetch).toHaveBeenCalledWith('/api/schedule/disciplines?q=calc')
    expect(input.getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onPick).toHaveBeenCalledWith('ACH2012')
  })

  it('closes on Escape and adds a typed full code on Enter', async () => {
    vi.mocked(apiFetch).mockResolvedValue(json(200, { results }))
    const onPick = vi.fn()
    render(<DisciplineSearch value="ach2011" onChange={() => {}} onPick={onPick} />)
    const input = screen.getByRole('combobox')
    await screen.findAllByRole('option')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input.getAttribute('aria-expanded')).toBe('false')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onPick).toHaveBeenCalledWith('ACH2011')
  })
})

describe('ScheduleBuilder search', () => {
  it('adds the discipline picked from the results', async () => {
    vi.mocked(apiFetch).mockImplementation(async (url) => url.startsWith('/api/schedule/disciplines?q=')
      ? json(200, { results })
      : json(200, { code: 'ACH2011', title: 'Cálculo I', sections: [{ code: '2026203', type: 'Teórica', room: '', startDate: '', endDate: '', slots: [], teachers: [] }] }))
    render(<ScheduleBuilder isSaving={false} onSave={() => {}} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'calculo' } })
    fireEvent.click(await screen.findByRole('option', { name: /ACH2011/ }))
    expect(await screen.findByRole('button', { name: 'Remover ACH2011' })).toBeTruthy()
    expect(apiFetch).toHaveBeenCalledWith('/api/schedule/disciplines/ACH2011')
  })
})

describe('DisciplineSearch fallback', () => {
  it('searches the local course data when JupiterWeb is unavailable', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'down' }), { status: 503 }))
    render(<DisciplineSearch value="calculo" onChange={() => {}} onPick={() => {}} />)
    expect(await screen.findByRole('option', { name: /ACH2011/ })).toBeTruthy()
  })
})
