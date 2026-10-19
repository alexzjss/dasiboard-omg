import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../components/Icon'
import { useDialogFocus } from '../../lib/useDialogFocus'
import { entidadeSlug, type Entidade } from './data'
import { InstagramEmbed } from './InstagramEmbed'

/** Detalhe da entidade: sheet no celular/tablet, painel lateral no desktop (posição decidida pelo CSS). */
export function EntidadeDetail({ entidade, onClose }: { entidade: Entidade; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null)
  const card = typeof document === 'undefined' ? null : document.getElementById(`ent-card-${entidadeSlug(entidade)}`)
  useDialogFocus(ref, onClose, card)

  // Portal no body: o stacking context da página (z-index 1) ficaria abaixo da nav.
  return createPortal(
    <>
      <div className="ent-sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        ref={ref}
        className="ent-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={entidade.name}
        style={{ '--ent-accent': entidade.accentColor, '--ent-bg': entidade.bgColor, '--area': entidade.accentColor } as React.CSSProperties}
      >
        <div className="ent-sheet-handle" aria-hidden="true" />
        <button type="button" className="ent-back-btn" data-autofocus onClick={onClose} aria-label="Fechar detalhes e voltar para entidades">
          <Icon name="arrow" />
          <span>Entidades</span>
        </button>
        <div className="ent-detail-hero">
          <div className="ent-detail-logo-wrap">
            <img src={entidade.logo} alt={`Logo ${entidade.name}`} className="ent-detail-logo" />
          </div>
          <div>
            <p className="section-label ent-eyebrow">{entidade.type}</p>
            <h1 className="ent-detail-title">{entidade.name}</h1>
            <p className="ent-detail-full">{entidade.fullName}</p>
          </div>
        </div>
        <div className="ent-ig-section">
          <h2 className="section-label">No Instagram</h2>
          <InstagramEmbed url={entidade.instagram} name={entidade.name} />
        </div>
      </aside>
    </>,
    document.body,
  )
}
