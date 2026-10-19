import type { JupiterData } from './useSchedule'

export function JupiterImportForm({ jupiterData, setJupiterData, isConsulting, onSubmit }: {
  jupiterData: JupiterData
  setJupiterData: (d: JupiterData) => void
  isConsulting: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <form className="jupiter-form" onSubmit={onSubmit}>
      <input autoComplete="off" aria-label="Número USP" placeholder="Número USP" inputMode="numeric" value={jupiterData.codpes} onChange={(e) => setJupiterData({ ...jupiterData, codpes: e.target.value })} required />
      <input autoComplete="off" aria-label="Senha do JupiterWeb" placeholder="Senha do JupiterWeb" type="password" value={jupiterData.password} onChange={(e) => setJupiterData({ ...jupiterData, password: e.target.value })} required />
      <input autoComplete="off" aria-label="Código do programa" placeholder="Programa (código)" value={jupiterData.codpgm} onChange={(e) => setJupiterData({ ...jupiterData, codpgm: e.target.value })} required />
      <button className="import-button" type="submit" disabled={isConsulting}>{isConsulting ? 'Buscando…' : 'Buscar minha grade'}</button>
    </form>
  )
}
