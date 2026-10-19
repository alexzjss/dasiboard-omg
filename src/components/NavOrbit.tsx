/** Anel orbital do item ativo (usado na bottom nav e na sidebar). */
export function NavOrbit() {
  return (
    <svg className="nav-orbit" viewBox="0 0 36 36" aria-hidden="true">
      <circle className="nav-orbit-ring" cx="18" cy="18" r="16" />
      <circle className="nav-orbit-dot" cx="18" cy="2" r="2.6" />
    </svg>
  )
}
