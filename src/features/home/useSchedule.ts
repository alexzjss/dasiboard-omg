import { useEffect, useState } from 'react'
import type { User } from '../../auth/types'
import { apiFetch } from '../../lib/api'
import { clearStoredSchedule, loadStoredSchedule, saveStoredSchedule } from '../../lib/storage'
import type { ScheduleEntry } from './types'

export function useSchedule(user: User) {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(() => loadStoredSchedule(user.email) ?? [])
  const [hasStoredSchedule, setHasStoredSchedule] = useState(() => loadStoredSchedule(user.email) !== null)
  const [importError, setImportError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

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

  async function saveSchedule(entries: ScheduleEntry[]) {
    setImportError(''); setIsSaving(true)
    try {
      const response = await apiFetch('/api/schedule', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entries }) })
      const data = await response.json().catch(() => null) as { entries?: ScheduleEntry[]; error?: string } | null
      if (!response.ok || !data?.entries) throw new Error(data?.error || 'Não foi possível salvar a grade horária.')
      setSchedule(data.entries)
      saveStoredSchedule(user.email, data.entries)
      setHasStoredSchedule(true)
    } catch (error) { setImportError(error instanceof Error ? error.message : 'Não foi possível salvar a grade horária.') }
    finally { setIsSaving(false) }
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

  return { schedule, hasStoredSchedule, importError, isSaving, saveSchedule, clearSchedule }
}
