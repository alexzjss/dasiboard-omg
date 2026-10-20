import { useState } from 'react'
import { acceptConnection, ApiError, removeConnection, requestConnection, type ConnectionState } from '../../../lib/socialApi'

const LABEL: Record<Exclude<ConnectionState, 'self'>, string> = {
  none: 'Conectar',
  pending_sent: 'Pedido enviado',
  pending_received: 'Aceitar pedido',
  accepted: 'Conectado',
}

/** Botão de conexão compartilhado pela lista da Comunidade e pelo perfil de outro aluno. */
export function ConnectButton({ handle, name, state, onChange, compact = false }: {
  handle: string
  name: string
  state: ConnectionState
  onChange: (next: ConnectionState) => void
  compact?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (state === 'self') return null

  async function act(action: () => Promise<unknown>, next: ConnectionState) {
    setBusy(true); setError('')
    try { await action(); onChange(next) }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Não deu certo. Tente de novo.') }
    finally { setBusy(false) }
  }

  const primary = state === 'none'
    ? () => act(() => requestConnection(handle), 'pending_sent')
    : state === 'pending_received'
    ? () => act(() => acceptConnection(handle), 'accepted')
    : null
  // Desfazer: cancela pedido enviado ou remove conexão (pede confirmação).
  const undo = state === 'pending_sent' || state === 'accepted'
    ? () => { if (state === 'pending_sent' || window.confirm(`Remover a conexão com ${name}?`)) void act(() => removeConnection(handle), 'none') }
    : null

  return (
    <div className={`connect-button${compact ? ' is-compact' : ''}`} data-state={state}>
      <button type="button" className="connect-button-main" disabled={busy} aria-busy={busy}
        onClick={primary ?? undo ?? undefined}
        aria-label={undo ? `${LABEL[state]} com ${name}. Ativar para ${state === 'pending_sent' ? 'cancelar o pedido' : 'remover a conexão'}` : `${LABEL[state]}: ${name}`}>
        {LABEL[state]}
      </button>
      {state === 'pending_received' && (
        <button type="button" className="connect-button-secondary" disabled={busy} onClick={() => void act(() => removeConnection(handle), 'none')} aria-label={`Recusar pedido de ${name}`}>Recusar</button>
      )}
      {error && <p className="connect-button-error" role="alert">{error}</p>}
    </div>
  )
}
