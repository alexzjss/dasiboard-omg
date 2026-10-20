/** Texto da bolinha: o número até 9, depois "9+". */
export function formatBadgeCount(count: number): string {
  return count > 9 ? '9+' : String(count)
}

/** Sufixo de acessibilidade para um item de navegação com pedidos pendentes (vazio quando não há). */
export function pendingRequestsSuffix(count: number): string {
  if (count <= 0) return ''
  return `, ${count} ${count === 1 ? 'pedido' : 'pedidos'} de conexão`
}
