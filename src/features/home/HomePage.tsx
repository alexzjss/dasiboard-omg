import { useState } from 'react'
import { useAuth } from '../../auth/authContext'
import type { User } from '../../auth/types'
import { Icon } from '../../components/Icon'
import { useLayout } from '../../app/layoutContext'
import { getGreeting } from '../../lib/date'
import { AppTopbar } from './AppTopbar'
import { DayOrbit } from './DayOrbit'
import { ScheduleBuilder } from './ScheduleBuilder'
import type { ScheduleEntry } from './types'
import { UpcomingEvents } from './UpcomingEvents'
import { useNow } from './useNow'
import { useSchedule } from './useSchedule'
import { WeekMap } from './WeekMap'

export function HomePage() {
  const { user } = useAuth()
  const { openUserMenu } = useLayout()
  if (!user) return null
  return <HomeContent user={user} onOpenUserMenu={openUserMenu} />
}

function HomeContent({ user, onOpenUserMenu }: { user: User; onOpenUserMenu: (trigger?: HTMLElement | null) => void }) {
  const { schedule, hasStoredSchedule, importError, isSaving, saveSchedule, clearSchedule } = useSchedule(user)
  const [isEditing, setIsEditing] = useState(false)
  const now = useNow()
  const dateLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)
  const greeting = getGreeting(now)

  function confirmClear() {
    if (window.confirm('Apagar a grade inteira?')) void clearSchedule()
  }

  async function saveEdited(entries: ScheduleEntry[]) {
    if (await saveSchedule(entries)) setIsEditing(false)
  }

  return <main className="app-shell home-shell">
    <AppTopbar user={user} onOpenUserMenu={onOpenUserMenu} />
    <div className="content">
      <section className="welcome-row">
        <p className="eyebrow">{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p>
        <h1>{greeting}, {user.name.split(' ')[0]}</h1>
      </section>

      <div className="home-grid">
      <DayOrbit schedule={schedule} now={now} hasSchedule={hasStoredSchedule} />

      {hasStoredSchedule && !isEditing
        ? <WeekMap schedule={schedule} now={now} action={
            <div className="week-actions">
              <button type="button" className="clear-schedule-button" onClick={() => setIsEditing(true)}><Icon name="book" /><span>Editar grade</span></button>
              <button type="button" className="clear-schedule-button" onClick={confirmClear}><Icon name="trash" /><span>Apagar grade</span></button>
            </div>
          } />
        : hasStoredSchedule
          ? <section className="section-block import-block" id="editar-grade" aria-labelledby="edit-title">
              <h2 id="edit-title">Editar grade</h2>
              <p className="section-hint">Ajuste disciplinas e horários. Salvar substitui a grade anterior.</p>
              <ScheduleBuilder isSaving={isSaving} initialEntries={schedule} onSave={(entries) => void saveEdited(entries)} onCancel={() => setIsEditing(false)} />
              {importError && <p className="schedule-error" role="alert">{importError}</p>}
            </section>
          : <section className="section-block import-block" id="importar" aria-labelledby="import-title">
              <h2 id="import-title">Cadê sua grade?</h2>
              <p className="section-hint">Adiciona o código de cada disciplina e marca a sua turma. Os horários vêm da consulta pública do JupiterWeb, sem senha. As aulas caem na órbita de hoje e no mapa da semana.</p>
              <ScheduleBuilder isSaving={isSaving} onSave={(entries) => void saveSchedule(entries)} />
              {importError && <p className="schedule-error" role="alert">{importError}</p>}
            </section>}

      <UpcomingEvents />
      </div>
    </div>
  </main>
}
