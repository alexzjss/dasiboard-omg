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
    if (hasStoredSchedule) return
    apiFetch('/api/schedule').then(async (response) => {
      if (response.ok) {
        const data = await response.json() as { entries: ScheduleEntry[] }
        if (data.entries.length > 0) {
          setSchedule(data.entries)
          saveStoredSchedule(user.email, data.entries)
          setHasStoredSchedule(true)
        }
      }
    }).catch(() => { /* server unavailable, use cached data */ })
  }, [hasStoredSchedule, user.email])

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

  function clearSchedule() {
    clearStoredSchedule(user.email)
    setSchedule([])
    setHasStoredSchedule(false)
    setImportError('')
  }

  return { schedule, hasStoredSchedule, importError, jupiterData, setJupiterData, isConsultingJupiter, consultJupiter, clearSchedule }
}
