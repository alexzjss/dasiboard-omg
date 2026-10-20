import { useEffect, useState, type CSSProperties } from 'react'
import { loadTechIcon, techById } from '../lib/technologies'

/** Tecnologia do perfil: ícone da marca (quando existe), nome e a cor da marca como fundo suave. */
export function TechChip({ id }: { id: string }) {
  const tech = techById(id)
  const [path, setPath] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void loadTechIcon(id).then((next) => { if (live) setPath(next) })
    return () => { live = false }
  }, [id])

  if (!tech) return null
  return (
    <span className="tech-chip" style={{ '--tech-color': tech.color } as CSSProperties}>
      {path && <svg className="tech-chip-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={path} /></svg>}
      {tech.name}
    </span>
  )
}
