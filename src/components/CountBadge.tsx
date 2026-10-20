import { formatBadgeCount } from './badgeText'

/** Bolinha com contador. A informação vai no aria-label do botão pai; a bolinha é decorativa. */
export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return <span className="count-badge" aria-hidden="true">{formatBadgeCount(count)}</span>
}
