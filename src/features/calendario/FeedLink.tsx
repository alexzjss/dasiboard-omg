import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createFeedToken, disableFeed, fetchFeedStatus } from '../../lib/eventsApi'
import { ApiError } from '../../lib/socialApi'
import { useDialogFocus } from '../../lib/useDialogFocus'

type Props = { onClose: () => void }

export function googleCalendarUrl(feedUrl: string) {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl.replace(/^https?:\/\//, 'webcal://'))}`
}

export function FeedLink({ onClose }: Props) {
  const ref = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const uid = useId()
  useDialogFocus(ref, onClose)
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'regenerate' | 'disable' | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetchFeedStatus(controller.signal).then((s) => setEnabled(s.enabled)).catch((err) => {
      if (controller.signal.aborted) return
      setEnabled(false)
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o estado do link')
    })
    return () => controller.abort()
  }, [])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try { await action() }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Não foi possível concluir a operação') }
    finally { setBusy(false); setConfirm(null) }
  }

  const generate = () => run(async () => {
    const created = await createFeedToken()
    setUrl(created.url)
    setEnabled(true)
    setCopied(false)
  })
  const disable = () => run(async () => {
    await disableFeed()
    setUrl(null)
    setEnabled(false)
  })

  async function copy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      inputRef.current?.select()
      setError('Não foi possível copiar sozinho: o link foi selecionado, use Ctrl+C.')
    }
  }

  return createPortal(
    <>
      <div className="cal-backdrop" onClick={onClose} aria-hidden="true" />
      <aside ref={ref} className="cal-sheet" role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`}>
        <div className="cal-sheet-handle" aria-hidden="true" />
        <div className="cal-panel-head">
          <h2 id={`${uid}-title`}>Assinar no Google Calendar</h2>
          <button type="button" className="com-btn" onClick={onClose}>Fechar</button>
        </div>

        <p>Este link é pessoal e secreto: quem tiver o link vê a sua agenda (eventos que você pode ver e suas aulas). Não compartilhe.</p>

        {url && (
          <div className="cal-feed-box">
            <label className="com-label" htmlFor={`${uid}-url`}>Seu link</label>
            <div className="cal-feed-row">
              <input id={`${uid}-url`} ref={inputRef} className="com-input" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className="com-btn" onClick={copy}>Copiar</button>
            </div>
            {copied && <p role="status">Link copiado</p>}
            <p><a href={googleCalendarUrl(url)} target="_blank" rel="noopener noreferrer">Abrir no Google Calendar</a></p>
            <ol className="cal-feed-steps">
              <li>No Google Agenda, abra Outras agendas e escolha &quot;Do URL&quot;.</li>
              <li>Cole o link e clique em &quot;Adicionar agenda&quot;.</li>
            </ol>
            <p className="cal-hint">O Google atualiza agendas assinadas a cada poucas horas, então mudanças podem demorar a aparecer.</p>
          </div>
        )}
        {!url && enabled && (
          <p className="cal-hint">Você já tem um link ativo. Por segurança ele só aparece na hora em que é gerado; para ver um link, gere um novo (o anterior para de funcionar).</p>
        )}

        {error && <p className="cal-form-error" role="alert">{error}</p>}

        {confirm === 'regenerate' && (
          <div className="cal-confirm" role="group" aria-label="Confirmar novo link">
            <p>Gerar um novo link? O link atual deixa de funcionar e a agenda assinada precisa ser atualizada.</p>
            <div className="cal-actions">
              <button type="button" className="com-btn" disabled={busy} onClick={() => setConfirm(null)}>Voltar</button>
              <button type="button" className="com-btn cal-danger" disabled={busy} onClick={generate}>Gerar novo link</button>
            </div>
          </div>
        )}
        {confirm === 'disable' && (
          <div className="cal-confirm" role="group" aria-label="Confirmar desligar link">
            <p>Desligar o link? Quem o assinou deixa de receber atualizações.</p>
            <div className="cal-actions">
              <button type="button" className="com-btn" disabled={busy} onClick={() => setConfirm(null)}>Voltar</button>
              <button type="button" className="com-btn cal-danger" disabled={busy} onClick={disable}>Desligar</button>
            </div>
          </div>
        )}

        {confirm === null && enabled !== null && (
          <div className="cal-actions">
            {enabled && <button type="button" className="com-btn cal-danger" disabled={busy} onClick={() => setConfirm('disable')}>Desligar link</button>}
            {enabled
              ? <button type="button" className="com-btn" disabled={busy} onClick={() => setConfirm('regenerate')}>Gerar novo link</button>
              : <button type="button" className="com-btn cal-primary" disabled={busy} onClick={generate}>Gerar link</button>}
          </div>
        )}
      </aside>
    </>,
    document.body,
  )
}
