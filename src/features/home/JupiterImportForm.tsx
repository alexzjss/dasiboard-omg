import type { JupiterData } from './useSchedule'

export function JupiterImportForm({ jupiterData, setJupiterData, isConsulting, onSubmit }: {
  jupiterData: JupiterData
  setJupiterData: (d: JupiterData) => void
  isConsulting: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <form className="jupiter-form" onSubmit={onSubmit}>
      <input autoComplete="username" aria-label="Número USP" placeholder="Número USP" type="text" inputMode="numeric" value={jupiterData.codpes} onChange={(e) => setJupiterData({ ...jupiterData, codpes: e.target.value })} required />
      <input autoComplete="current-password" aria-label="Senha do JupiterWeb" placeholder="Senha do JupiterWeb" type="password" value={jupiterData.password} onChange={(e) => setJupiterData({ ...jupiterData, password: e.target.value })} required />
      <input autoComplete="off" aria-label="Código do programa" placeholder="Programa (código)" type="text" inputMode="numeric" value={jupiterData.codpgm} onChange={(e) => setJupiterData({ ...jupiterData, codpgm: e.target.value })} required />
      <button className="import-button" type="submit" disabled={isConsulting}>{isConsulting ? 'Buscando…' : 'Buscar minha grade'}</button>
    </form>
  )
}
