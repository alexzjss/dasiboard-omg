function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/** Foto do aluno ou, sem foto, as iniciais do nome. Decorativo: o nome já aparece ao lado. */
export function Avatar({ name, picture, size = 'md' }: { name: string; picture: string | null; size?: 'sm' | 'md' }) {
  return (
    <span className={`com-avatar is-${size}`} aria-hidden="true">
      {picture ? <img src={picture} alt="" loading="lazy" referrerPolicy="no-referrer" /> : initialsOf(name)}
    </span>
  )
}
