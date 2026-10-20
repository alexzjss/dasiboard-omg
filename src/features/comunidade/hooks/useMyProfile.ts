import { useCallback, useEffect, useRef, useState } from 'react'
import { getMyProfile, updateMyProfile, type MyProfile, type ProfilePatch } from '../../../lib/socialApi'

type State = { profile: MyProfile | null; loading: boolean; error: unknown }

/** Perfil próprio. `update` aplica o patch na hora e desfaz se o servidor recusar. */
export function useMyProfile() {
  const [state, setState] = useState<State>({ profile: null, loading: true, error: null })
  const profileRef = useRef<MyProfile | null>(null)
  const requestRef = useRef<AbortController | null>(null)

  const commit = useCallback((next: MyProfile | null) => {
    profileRef.current = next
    setState((s) => ({ ...s, profile: next }))
  }, [])

  const reload = useCallback(async () => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const profile = await getMyProfile(controller.signal)
      if (controller.signal.aborted) return
      profileRef.current = profile
      setState({ profile, loading: false, error: null })
    } catch (error) {
      if (controller.signal.aborted) return
      setState((s) => ({ ...s, loading: false, error }))
    }
  }, [])

  useEffect(() => {
    void reload()
    return () => requestRef.current?.abort()
  }, [reload])

  const update = useCallback(async (patch: ProfilePatch) => {
    const before = profileRef.current
    if (before) {
      // Os campos editáveis têm o mesmo nome no perfil e no PATCH, então o merge é direto.
      commit({ ...before, profile: { ...before.profile, ...patch } })
    }
    try {
      const saved = await updateMyProfile(patch)
      commit(saved)
    } catch (error) {
      commit(before)
      throw error
    }
  }, [commit])

  return { profile: state.profile, loading: state.loading, error: state.error, reload, update }
}
