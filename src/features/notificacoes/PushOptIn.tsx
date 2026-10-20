import { useEffect, useState } from 'react'
import { disablePush, enablePush, pushState, type PushState } from '../../lib/push'

/** Convite para ativar push no navegador. Nunca pede permissão sozinho. */
export function PushOptIn() {
  const [state, setState] = useState<PushState>('unsupported')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void pushState().then((next) => { if (active) setState(next) })
    return () => { active = false }
  }, [])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try { await action() } catch (err) { setError(err instanceof Error ? err.message : 'Não deu certo. Tente de novo.') }
    setState(await pushState())
    setBusy(false)
  }

  if (state === 'unsupported') return null
  if (state === 'denied') return <p className="notif-push-note">Os avisos estão bloqueados nas configurações do navegador.</p>
  return (
    <section className={state === 'available' ? 'notif-push notif-push-card' : 'notif-push'} aria-label="Avisos no dispositivo">
      {state === 'available' ? (
        <>
          <p className="notif-push-title">Receber avisos neste dispositivo?</p>
          <button type="button" className="com-btn" disabled={busy} onClick={() => void run(enablePush)}>Ativar</button>
        </>
      ) : (
        <>
          <p className="notif-push-note">Avisos ativados neste dispositivo</p>
          <button type="button" className="com-btn" disabled={busy} onClick={() => void run(disablePush)}>Desativar</button>
        </>
      )}
      {error && <p className="notif-error" role="alert">{error}</p>}
    </section>
  )
}
