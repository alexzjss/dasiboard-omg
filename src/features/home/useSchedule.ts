import { useEffect, useState } from 'react'
import type { User } from '../../auth/types'
import { apiFetch } from '../../lib/api'
import { clearStoredSchedule, loadStoredSchedule, saveStoredSchedule } from '../../lib/storage'
import type { ScheduleEntry } from './types'

export type JupiterData = { codpes: string; password: string; codpgm: string }

export function useSchedule(user: User) {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(() => loadStoredSchedule(user.email) ?? [])
  const [hasStoredSchedule, setHasStoredSchedule] = useState(() => loadStoredSchedule(user.email) !== null)
  const [importError, setImportError] = useState('')
  const [jupiterData, setJupiterData] = useState<JupiterData>({ codpes: '', password: '', codpgm: '1' })
  const [isConsultingJupiter, setIsConsultingJupiter] = useState(false)

  useEffect(() => {
    apiFetch('/api/schedule').then(async (response) => {
      if (response.ok) {
        const data = await response.json() as { entries: ScheduleEntry[]; importedAt: string | null }
        setSchedule(data.entries)
        setHasStoredSchedule(data.importedAt !== null)
        if (data.importedAt !== null) saveStoredSchedule(user.email, data.entries)
        else clearStoredSchedule(user.email)
      }
    }).catch(() => { /* server unavailable, use cached data */ })
  }, [user.email])

  async function consultJupiter(event: React.FormEvent) {
    event.preventDefault(); setImportError(''); setIsConsultingJupiter(true)
    try {
      const response = await apiFetch('/api/schedule/jupiter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jupiterData) })
      const data = await response.json() as { entries?: ScheduleEntry[]; error?: string }
      if (!response.ok || !data.entries) throw new Error(data.error || 'Não foi possível consultar o JupiterWeb.')
      setSchedule(data.entries)
      saveStoredSchedule(user.email, data.entries)
      setHasStoredSchedule(true)
      setJupiterData((current) => ({ ...current, password: '' }))
    } catch (error) { setImportError(error instanceof Error ? error.message : 'Não foi possível consultar o JupiterWeb.') }
    finally { setIsConsultingJupiter(false) }
  }

  async function clearSchedule() {
    setImportError('')
    try {
      const response = await apiFetch('/api/schedule', { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(data?.error || 'Não foi possível remover a grade horária.')
      }
      clearStoredSchedule(user.email)
      setSchedule([])
      setHasStoredSchedule(false)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Não foi possível remover a grade horária.')
    }
  }

  return { schedule, hasStoredSchedule, importError, jupiterData, setJupiterData, isConsultingJupiter, consultJupiter, clearSchedule }
}
