import { useCallback, useEffect, useRef, useState } from 'react'
import { listPeople, type PeopleFilters, type PersonCard } from '../../../lib/socialApi'

type State = {
  people: PersonCard[]
  nextCursor: string | null
  loading: boolean
  loadingMore: boolean
  error: unknown
}

const EMPTY: State = { people: [], nextCursor: null, loading: true, loadingMore: false, error: null }

/**
 * Lista de alunos com paginação por cursor. Mudar os filtros zera a lista e cancela a
 * requisição anterior, inclusive uma página extra que ainda esteja em andamento.
 */
export function usePeople(filters: PeopleFilters) {
  // Chave estável: um objeto novo com os mesmos valores não dispara nova busca.
  const key = JSON.stringify(filters)
  const [state, setState] = useState<State>(EMPTY)
  const firstPageRef = useRef<AbortController | null>(null)
  const morePageRef = useRef<AbortController | null>(null)
  const cursorRef = useRef<string | null>(null)

  const commit = useCallback((next: State) => {
    cursorRef.current = next.nextCursor
    setState(next)
  }, [])

  useEffect(() => {
    firstPageRef.current?.abort()
    morePageRef.current?.abort()
    morePageRef.current = null
    const controller = new AbortController()
    firstPageRef.current = controller
    commit(EMPTY)
    const current: PeopleFilters = JSON.parse(key)
    listPeople(current, null, controller.signal).then(
      (page) => {
        if (controller.signal.aborted) return
        commit({ people: page.people, nextCursor: page.nextCursor, loading: false, loadingMore: false, error: null })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        commit({ ...EMPTY, loading: false, error })
      },
    )
    return () => {
      controller.abort()
      morePageRef.current?.abort()
    }
  }, [key, commit])

  const loadMore = useCallback(async () => {
    const cursor = cursorRef.current
    // Sem cursor não há o que buscar; uma página extra já em andamento não é duplicada.
    if (!cursor || morePageRef.current) return
    const controller = new AbortController()
    morePageRef.current = controller
    setState((s) => ({ ...s, loadingMore: true, error: null }))
    try {
      const page = await listPeople(JSON.parse(key), cursor, controller.signal)
      if (controller.signal.aborted) return
      setState((s) => {
        const next: State = { ...s, people: [...s.people, ...page.people], nextCursor: page.nextCursor, loadingMore: false }
        cursorRef.current = next.nextCursor
        return next
      })
    } catch (error) {
      if (controller.signal.aborted) return
      setState((s) => ({ ...s, loadingMore: false, error }))
    } finally {
      if (morePageRef.current === controller) morePageRef.current = null
    }
  }, [key])

  return {
    people: state.people,
    nextCursor: state.nextCursor,
    hasMore: state.nextCursor !== null,
    loading: state.loading,
    loadingMore: state.loadingMore,
    error: state.error,
    loadMore,
  }
}
