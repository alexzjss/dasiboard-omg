import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { apiFetch } from '../../lib/api'
import { ScheduleBuilder } from './ScheduleBuilder'

vi.mock('../../lib/api', () => ({ apiFetch: vi.fn() }))

const respond = (status: number, body: unknown) => vi.mocked(apiFetch).mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))

async function addCode(code: string) {
  fireEvent.change(screen.getByLabelText('Buscar disciplina'), { target: { value: code } })
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
}

afterEach(() => { cleanup(); vi.mocked(apiFetch).mockReset() })

describe('ScheduleBuilder', () => {
  it('saves the slots of the chosen section', async () => {
    const onSave = vi.fn()
    respond(200, { code: 'ACH2011', title: 'Cálculo I', sections: [
      { code: '2026203', type: 'Teórica', room: 'Sala 1', startDate: '', endDate: '', slots: [{ weekday: 2, startsAt: '16:15', endsAt: '18:00' }], teachers: ['Ana'] },
      { code: '2026204', type: 'Teórica', room: '', startDate: '', endDate: '', slots: [{ weekday: 0, startsAt: '08:00', endsAt: '09:45' }], teachers: [] },
    ] })
    render(<ScheduleBuilder isSaving={false} onSave={onSave} />)
    await addCode('ach2011')
    fireEvent.click(await screen.findByRole('checkbox', { name: /Turma 03/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar grade' }))
    expect(onSave).toHaveBeenCalledWith([{ title: 'Cálculo I', code: 'ACH2011', building: '', weekday: 2, startsAt: '16:15', endsAt: '18:00', sectionCode: '2026203', room: 'Sala 1' }])
  })

  it('lets the user type the times when JupiterWeb has none', async () => {
    const onSave = vi.fn()
    respond(502, { error: 'Não foi possível consultar o JupiterWeb agora.' })
    render(<ScheduleBuilder isSaving={false} onSave={onSave} />)
    await addCode('ACH2011')
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/à mão/))
    expect(screen.getByRole('button', { name: 'Salvar grade' })).toHaveProperty('disabled', true)
    fireEvent.change(screen.getByLabelText('Dia da semana'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Início'), { target: { value: '10:15' } })
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '12:00' } })
    fireEvent.change(screen.getByLabelText('Sala (opcional)'), { target: { value: 'A2 ' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Horário' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar grade' }))
    expect(onSave).toHaveBeenCalledWith([{ title: 'ACH2011', code: 'ACH2011', building: '', weekday: 3, startsAt: '10:15', endsAt: '12:00', room: 'A2', sectionCode: '' }])
  })
})
