import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchColegas, type Colegas } from './colegasCache'

/** Link "N colegas fazem esta matéria" para /comunidade?materia=CODE. Some quando erro ou 0. */
export function ColegasLink({ code }: { code: string }) {
  const [state, setState] = useState<{ code: string; result: Colegas | null } | null>(null)

  useEffect(() => {
    let active = true
    void fetchColegas(code).then((result) => {
      if (active) setState({ code, result })
    })
    return () => {
      active = false
    }
  }, [code])

  if (state?.code !== code || !state.result || state.result.count === 0) return null
  const { count, more } = state.result
  const text = more
    ? `${count}+ colegas fazem esta matéria`
    : count === 1
      ? '1 colega faz esta matéria'
      : `${count} colegas fazem esta matéria`

  return (
    <Link className="disc-colegas-link" to={`/comunidade?materia=${encodeURIComponent(code)}`}>
      {text}
    </Link>
  )
}

/** Na lista: o aluno abre os colegas da matéria quando quiser; só então a busca acontece. */
export function ColegasDisclosure({ code }: { code: string }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button type="button" className="disc-colegas-toggle" onClick={() => setOpen(true)}>
        Ver colegas desta matéria
      </button>
    )
  }
  return <ColegasLink code={code} />
}
