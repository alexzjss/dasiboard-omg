import { useRef, useState, type CSSProperties } from 'react'
import { CardQr } from '../../components/card/CardQr'
import { downloadBlob, exportCard } from '../../components/card/exportCard'
import { paletteOf } from '../../lib/cardOptions'
import type { EntityMember } from '../../lib/socialApi'
import type { Entidade } from './data'

const MAX_LISTED = 4

function entityUrl(id: string): string {
  const base = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined) ?? window.location.origin
  return `${base.replace(/\/+$/, '')}/entidades/${id}`
}

/** Carta da entidade, na mesma linguagem do modelo A: logo no lugar da foto, membros no verso. */
export function EntityCard({ entidade, members }: { entidade: Entidade; members: EntityMember[] }) {
  const [back, setBack] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const palette = paletteOf(`ent-${entidade.id}`)
  const vars = { '--accent': palette.accent, '--accent2': palette.accent2, '--backdrop': palette.backdrop, '--paper': '#fdf9e8', '--ink': palette.accent } as CSSProperties
  const listed = members.filter((member) => member.title).concat(members.filter((member) => !member.title)).slice(0, MAX_LISTED)
  const count = `${members.length} ${members.length === 1 ? 'membro' : 'membros'}`

  async function download() {
    const node = bgRef.current
    if (!node) return
    setBusy(true); setNote(null)
    try {
      const blob = await exportCard(node, { face: 'front', onWarn: (text) => setNote({ kind: 'ok', text }) })
      downloadBlob(blob, `entidade-${entidade.id}.png`)
    } catch (error) {
      setNote({ kind: 'error', text: error instanceof Error && error.message ? error.message : 'Não deu certo. Tente de novo.' })
    } finally { setBusy(false) }
  }

  return (
    <section className="entcard" aria-label={`Carta da entidade ${entidade.name}`}>
      <div className="pcard-wrap pcard-wrap-full">
        <div ref={bgRef} className="pcard-bg" data-palette={palette.id} style={vars}>
          <div className={`pcard pcard-full finish-common has-grain${back ? ' is-back' : ''}`}>
            <div className="pcard-tilt">
              <div className="pcard-inner">
                <div className="pcard-face pcard-front" aria-hidden={back} inert={back || undefined}>
                  <div className="pcard-photo shape-squircle is-framed">
                    <img src={entidade.logo} alt={`Logo ${entidade.name}`} draggable={false} />
                  </div>
                  <h3 className="pcard-name">{entidade.name}</h3>
                  <p className="pcard-sub">{entidade.type}</p>
                  <div className="pcard-foot"><span className="entcard-count">{count}</span></div>
                </div>
                <div className="pcard-face pcard-back" aria-hidden={!back} inert={!back || undefined}>
                  <span className="pcard-label">{entidade.fullName}</span>
                  <div className="pcard-qr"><CardQr value={entityUrl(entidade.id)} size={112} color={`color-mix(in srgb, ${palette.accent} 70%, #000)`} /></div>
                  {listed.length > 0 && (
                    <ul className="entcard-members">
                      {listed.map((member) => <li key={member.handle}>{member.name}{member.title && <small>{member.title}</small>}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <button type="button" className="pcard-flip" aria-pressed={back} aria-label={`Virar a carta de ${entidade.name}`} onClick={() => setBack((value) => !value)} />
          </div>
        </div>
      </div>
      <button type="button" className="pf-btn" disabled={busy} onClick={() => void download()}>Baixar imagem</button>
      {note && <p className={note.kind === 'ok' ? 'pf-ok' : 'pf-error'} role={note.kind === 'ok' ? 'status' : 'alert'}>{note.text}</p>}
    </section>
  )
}
