import { listPeople } from '../../lib/socialApi'

export type Colegas = { count: number; more: boolean }

// Cache em memória por código de matéria, válido enquanto a página estiver aberta.
// Guarda a promessa, então buscas simultâneas da mesma matéria viram uma chamada só.
const cache = new Map<string, Promise<Colegas | null>>()

/** Busca quantos alunos visíveis fazem a matéria. Erro vira null (o componente esconde). */
export function fetchColegas(code: string): Promise<Colegas | null> {
  const hit = cache.get(code)
  if (hit) return hit
  const request = listPeople({ materia: code }).then(
    (page) => ({ count: page.people.length, more: Boolean(page.nextCursor) }),
    () => {
      cache.delete(code) // erro não fica preso no cache: a próxima abertura tenta de novo
      return null
    },
  )
  cache.set(code, request)
  return request
}

/** Só para testes: esvazia o cache entre casos. */
export function clearColegasCache() {
  cache.clear()
}
