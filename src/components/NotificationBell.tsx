import { useNavigate } from 'react-router-dom'
import { CountBadge } from './CountBadge'
import { Icon } from './Icon'

/** Sino da central de notificações. A bolinha é decorativa: a contagem vai no aria-label. */
export function NotificationBell({ count, className = '' }: { count: number; className?: string }) {
  const navigate = useNavigate()
  const label = count > 0 ? `Notificações, ${count} ${count === 1 ? 'não lida' : 'não lidas'}` : 'Notificações'
  return (
    <button type="button" className={`notif-bell ${className}`.trim()} aria-label={label} data-tip="Notificações" onClick={() => navigate('/notificacoes')}>
      <span className="nav-icon"><Icon name="bell" /><CountBadge count={count} /></span>
    </button>
  )
}
