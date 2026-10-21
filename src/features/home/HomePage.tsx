import { useAuth } from '../../auth/authContext'
import type { User } from '../../auth/types'
import { Icon } from '../../components/Icon'
import { useLayout } from '../../app/layoutContext'
import { getGreeting } from '../../lib/date'
import { AppTopbar } from './AppTopbar'
import { DayOrbit } from './DayOrbit'
import { ScheduleBuilder } from './ScheduleBuilder'
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
  const now = useNow()
  const dateLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)
  const greeting = getGreeting(now)

  return <main className="app-shell home-shell">
    <AppTopbar user={user} onOpenUserMenu={onOpenUserMenu} />
    <div className="content">
      <section className="welcome-row">
        <p className="eyebrow">{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p>
        <h1>{greeting}, {user.name.split(' ')[0]}</h1>
      </section>

      <div className="home-grid">
      <DayOrbit schedule={schedule} now={now} hasSchedule={hasStoredSchedule} />

      {hasStoredSchedule
        ? <WeekMap schedule={schedule} now={now} action={
            <button type="button" className="clear-schedule-button" onClick={clearSchedule}><Icon name="trash" /><span>Refazer grade</span></button>
          } />
        : <section className="section-block import-block" id="importar" aria-labelledby="import-title">
            <h2 id="import-title">Cadê sua grade?</h2>
            <p className="section-hint">Adiciona o código de cada disciplina e marca a sua turma. Os horários vêm da consulta pública do JupiterWeb, sem senha. As aulas caem na órbita de hoje e no mapa da semana.</p>
            <ScheduleBuilder isSaving={isSaving} onSave={saveSchedule} />
            {importError && <p className="schedule-error" role="alert">{importError}</p>}
          </section>}
      </div>
    </div>
  </main>
}
