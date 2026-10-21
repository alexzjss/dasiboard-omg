import { useState, type RefObject } from 'react'
import type { CardData } from '../../lib/socialApi'
import { downloadBlob, exportCard } from './exportCard'
import { cardUrl } from './ProfileCard'

/** Baixar frente/verso em PNG e compartilhar a carta. */
export function CardActions({ data, cardRef }: { data: Pick<CardData, 'handle'>; cardRef: RefObject<HTMLDivElement | null> }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const url = cardUrl(data.handle)

  async function render(face: 'front' | 'back') {
    const node = cardRef.current
    if (!node) throw new Error('A carta ainda não carregou')
    return exportCard(node, { face, onWarn: (text) => setNote({ kind: 'ok', text }) })
  }

  async function run(task: () => Promise<void>) {
    setBusy(true); setNote(null)
    try { await task() } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setNote({ kind: 'error', text: error instanceof Error && error.message ? error.message : 'Não deu certo. Tente de novo.' })
    } finally { setBusy(false) }
  }

  const download = (face: 'front' | 'back') => run(async () => {
    const blob = await render(face)
    downloadBlob(blob, face === 'front' ? `carta-${data.handle}.png` : `carta-${data.handle}-verso.png`)
  })

  const share = () => run(async () => {
    const title = 'Minha carta no DASIboard'
    if (typeof navigator.share !== 'function') {
      await navigator.clipboard.writeText(url)
      setNote({ kind: 'ok', text: 'Link copiado' })
      return
    }
    const blob = await render('front').catch(() => null)
    const file = blob ? new File([blob], `carta-${data.handle}.png`, { type: 'image/png' }) : null
    if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title, url })
    else await navigator.share({ title, url })
  })

  return (
    <div className="card-actions">
      <button type="button" className="pf-btn" disabled={busy} onClick={() => void download('front')}>Baixar imagem</button>
      <button type="button" className="pf-btn" disabled={busy} onClick={() => void download('back')}>Baixar verso</button>
      <button type="button" className="pf-btn" disabled={busy} onClick={() => void share()}>Compartilhar</button>
      {note && <p className={`card-actions-note ${note.kind === 'ok' ? 'pf-ok' : 'pf-error'}`} role={note.kind === 'ok' ? 'status' : 'alert'}>{note.text}</p>}
    </div>
  )
}
