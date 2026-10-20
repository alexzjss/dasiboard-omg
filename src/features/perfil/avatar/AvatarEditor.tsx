import { useRef, useState, useEffect, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { ApiError, confirmAvatar, requestAvatarUpload, type AvatarContentType } from '../../../lib/socialApi'
import { useDialogFocus } from '../../../lib/useDialogFocus'
import { clampCrop, cropRect, MAX_ZOOM, MIN_ZOOM, renderAvatar, type CropState } from './crop'

const MAX_INPUT_BYTES = 10 * 1024 * 1024
const PREVIEW = 280
const START: CropState = { zoom: 1, x: 0, y: 0 }

type Props = { open: boolean; onClose: () => void; onSaved: (picture: string) => void }

export function AvatarEditor({ open, onClose, onSaved }: Props) {
  if (!open) return null
  return <Editor onClose={onClose} onSaved={onSaved} />
}

function Editor({ onClose, onSaved }: Omit<Props, 'open'>) {
  const ref = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ px: number; py: number; state: CropState } | null>(null)
  const urlRef = useRef<string | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [crop, setCrop] = useState<CropState>(START)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useDialogFocus(ref, () => { if (!busy) onClose() })

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!img) return
    const { sx, sy, size } = cropRect(crop, img.naturalWidth, img.naturalHeight)
    ctx.drawImage(img, sx, sy, size, size, 0, 0, canvas.width, canvas.height)
  }, [img, crop])

  function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) { setError('Escolha um arquivo de imagem'); return }
    if (file.size > MAX_INPUT_BYTES) { setError('Imagem muito grande'); return }
    const url = URL.createObjectURL(file)
    const next = new Image()
    next.onload = () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = url
      setImg(next)
      setCrop(START)
    }
    next.onerror = () => { URL.revokeObjectURL(url); setError('Não foi possível abrir essa imagem') }
    next.src = url
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!img || busy) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { px: e.clientX, py: e.clientY, state: crop }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || !img) return
    const w = img.naturalWidth
    const h = img.naturalHeight
    const { size } = cropRect(d.state, w, h)
    const ratio = size / e.currentTarget.clientWidth // pixels da imagem por pixel da tela
    const slackX = (w - size) / 2
    const slackY = (h - size) / 2
    // Arrastar a imagem para a direita desloca o recorte para a esquerda.
    const x = slackX > 0 ? d.state.x - ((e.clientX - d.px) * ratio) / slackX : d.state.x
    const y = slackY > 0 ? d.state.y - ((e.clientY - d.py) * ratio) / slackY : d.state.y
    setCrop(clampCrop({ ...d.state, x, y }, w, h))
  }

  async function save() {
    if (!img || busy) return
    setBusy(true)
    setError(null)
    try {
      const blob = await renderAvatar(img, crop)
      const { uploadUrl, path } = await requestAvatarUpload(blob.type as AvatarContentType)
      const put = await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type } })
      if (!put.ok) throw new Error('upload')
      const { picture } = await confirmAvatar(path)
      onSaved(picture)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar a foto. Tente de novo.')
      setBusy(false)
    }
  }

  return createPortal(
    <>
      <div className="avatar-backdrop" onClick={() => { if (!busy) onClose() }} aria-hidden="true" />
      <div ref={ref} className="avatar-modal" role="dialog" aria-modal="true" aria-label="Trocar foto de perfil">
        <h2 className="avatar-title">Trocar foto</h2>
        <label className="pf-btn avatar-pick">
          {img ? 'Escolher outra imagem' : 'Escolher imagem'}
          <input type="file" accept="image/*" data-autofocus className="avatar-file" disabled={busy} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        <div
          className={`avatar-stage${img ? ' has-image' : ''}`}
          style={{ width: PREVIEW }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => { drag.current = null }}
          onPointerCancel={() => { drag.current = null }}
        >
          <canvas ref={canvasRef} width={PREVIEW * 2} height={PREVIEW * 2} className="avatar-canvas" />
          {!img && <p className="pf-hint avatar-empty">Nenhuma imagem escolhida</p>}
          <span className="avatar-mask" aria-hidden="true" />
        </div>
        <div className="pf-field">
          <label htmlFor="avatar-zoom">Zoom</label>
          <input
            id="avatar-zoom" type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} value={crop.zoom} disabled={!img || busy}
            onChange={(e) => img && setCrop(clampCrop({ ...crop, zoom: Number(e.target.value) }, img.naturalWidth, img.naturalHeight))}
          />
        </div>
        <p className="pf-hint">Arraste a imagem para posicionar.</p>
        {error && <p className="pf-error" role="alert">{error}</p>}
        <div className="avatar-actions">
          <button type="button" className="pf-btn is-quiet" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="button" className="pf-btn is-primary" onClick={() => void save()} disabled={!img || busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>
    </>,
    document.body,
  )
}
