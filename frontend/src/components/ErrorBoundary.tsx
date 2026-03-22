// ── Global Error Boundary — catches runtime errors and shows a recovery UI ────
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null; errorInfo: ErrorInfo | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info })
    // Log to console in dev; in prod you'd send to Sentry/LogRocket
    console.error('[DaSIboard] Uncaught error:', error, info.componentStack)
  }

  private reset = () => {
    this.setState({ error: null, errorInfo: null })
    window.location.href = '/'
  }

  private reload = () => window.location.reload()

  render() {
    if (!this.state.error) return this.props.children

    const msg = this.state.error.message ?? 'Erro desconhecido'
    const isEasterEgg =
      this.state.errorInfo?.componentStack?.includes('EasterEgg') ||
      this.state.errorInfo?.componentStack?.includes('Canvas') ||
      this.state.errorInfo?.componentStack?.includes('Breakout')

    return (
      <div
        role="alert"
        aria-live="assertive"
        style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-base, #0d0a1a)', color: 'var(--text-primary, #f8f8f8)',
          fontFamily: '"DM Sans", sans-serif', padding: 32, textAlign: 'center', zIndex: 9999,
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16 }}>
          {isEasterEgg ? '🥚💥' : '⚡'}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#f87171' }}>
          {isEasterEgg ? 'Ovo quebrado!' : 'Algo deu errado'}
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(248,248,248,0.6)', maxWidth: 360, marginBottom: 8 }}>
          {isEasterEgg
            ? 'Um easter egg causou um erro. Não se preocupe — seus dados estão seguros.'
            : 'Um erro inesperado aconteceu. Seus dados estão salvos.'}
        </p>
        <details style={{ marginBottom: 28, maxWidth: 400, textAlign: 'left' }}>
          <summary style={{ cursor: 'pointer', fontSize: 11, color: 'rgba(248,248,248,0.35)', marginBottom: 6 }}>
            Detalhes técnicos
          </summary>
          <pre style={{
            fontSize: 10, background: 'rgba(0,0,0,0.4)', padding: '8px 12px',
            borderRadius: 8, overflow: 'auto', maxHeight: 120,
            color: '#f87171', border: '1px solid rgba(248,113,113,0.2)',
          }}>
            {msg}
          </pre>
        </details>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={this.reload}
            style={{
              padding: '10px 24px', borderRadius: 14, fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff',
              border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            }}
          >
            🔄 Recarregar página
          </button>
          <button
            onClick={this.reset}
            style={{
              padding: '10px 24px', borderRadius: 14, fontSize: 13, fontWeight: 600,
              background: 'rgba(255,255,255,0.08)', color: 'rgba(248,248,248,0.7)',
              border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
            }}
          >
            🏠 Ir para o Início
          </button>
        </div>
      </div>
    )
  }
}

// ── Inline Error Boundary for isolated components (easter eggs, canvases) ─────
export class LocalErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode; onError?: (e: Error) => void },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error)
    console.warn('[LocalBoundary] Caught:', error.message)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted, #888)' }}>
          <p style={{ fontSize: 12 }}>⚠️ Este componente não pôde ser carregado.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{ marginTop: 8, fontSize: 11, color: 'var(--accent-3, #a855f7)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Tentar novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
