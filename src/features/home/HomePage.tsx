import { useAuth } from '../../auth/authContext'
import type { User } from '../../auth/types'
import { Icon } from '../../components/Icon'
import { useLayout } from '../../app/layoutContext'
import { getCurrentWeekDays, getGreeting } from '../../lib/date'
import { AppTopbar } from './AppTopbar'
import { JupiterImportForm } from './JupiterImportForm'
import { ScheduleBoard } from './ScheduleBoard'
import { useSchedule } from './useSchedule'

export function HomePage() {
  const { user } = useAuth()
  const { openUserMenu } = useLayout()
  if (!user) return null
  return <HomeContent user={user} onOpenUserMenu={openUserMenu} />
}

function HomeContent({ user, onOpenUserMenu }: { user: User; onOpenUserMenu: () => void }) {
  const { schedule, hasStoredSchedule, importError, jupiterData, setJupiterData, isConsultingJupiter, consultJupiter, clearSchedule } = useSchedule(user)
  const todayIndex = (new Date().getDay() + 6) % 7
  const days = getCurrentWeekDays()
  const todayLabelText = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase()
  const greeting = getGreeting()

  return <main className="app-shell home-shell">
    <AppTopbar user={user} onOpenUserMenu={onOpenUserMenu} />
    <div className="content">
      <section className="welcome-row">
        <div><p className="eyebrow">{todayLabelText}</p><h1>{greeting}, {user.name.split(' ')[0]}<span>.</span></h1></div>
        <button className="date-button" aria-label="Ir para hoje"><Icon name="calendar" /><span>{days[todayIndex]?.date} {new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date()).replace('.', '')}</span></button>
      </section>

      <section className="section-block schedule-section">
        <div className="section-heading">
          <div><p className="eyebrow">SUA SEMANA</p><h2>Grade horária<span className="grade-dot">.</span></h2></div>
          {hasStoredSchedule
            ? <button type="button" className="clear-schedule-button" onClick={clearSchedule}><Icon name="trash" /><span>Atualizar grade</span></button>
            : null}
        </div>
        {!hasStoredSchedule && (
          <JupiterImportForm jupiterData={jupiterData} setJupiterData={setJupiterData} isConsulting={isConsultingJupiter} onSubmit={consultJupiter} />
        )}
        {importError && <p className="schedule-error" role="alert">{importError}</p>}
        <ScheduleBoard schedule={schedule} />
      </section>
    </div>
  </main>
}
