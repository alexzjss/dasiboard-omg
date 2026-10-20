import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError, type ConnectionState } from '../../lib/socialApi'
import { usePerson } from './hooks/usePerson'
import { PersonSkeleton, PersonView } from './person/PersonView'

/** Perfil de outro aluno em /comunidade/:handle. */
export function PersonPage() {
  const { handle = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { person, loading, error, reload } = usePerson(handle)
  const [override, setOverride] = useState<{ handle: string; state: ConnectionState } | null>(null)

  const name = person?.profile.name
  useEffect(() => {
    const previous = document.title
    document.title = name ? `${name} · daSIboard` : 'Comunidade · daSIboard'
    return () => { document.title = previous }
  }, [name])

  if (person && (person.connection === 'self' || person.profile.self)) return <Navigate to="/perfil" replace />

  const notFound = error instanceof ApiError && error.status === 404
  const back = () => (location.key !== 'default' ? navigate(-1) : navigate('/comunidade'))
  const data = person && override?.handle === person.profile.handle ? { ...person, connection: override.state } : person

  return (
    <main className="app-shell pessoa-shell">
      <div className="content pessoa-content">
        <button type="button" className="pessoa-back" onClick={back}>
          <span aria-hidden="true">←</span> Voltar
        </button>
        {loading && <PersonSkeleton />}
        {!loading && notFound && (
          <div className="pessoa-state" role="alert">
            <h1>Perfil não encontrado</h1>
            <p>Esse perfil não existe ou não está disponível para você.</p>
            <Link className="pessoa-state-link" to="/comunidade">Ir para a Comunidade</Link>
          </div>
        )}
        {!loading && error != null && !notFound && (
          <div className="pessoa-state" role="alert">
            <h1>Não foi possível carregar</h1>
            <p>Algo deu errado ao buscar o perfil.</p>
            <button type="button" className="pessoa-state-link" onClick={() => void reload()}>Tentar de novo</button>
          </div>
        )}
        {!loading && data && (
          <PersonView data={data} onConnection={(state) => setOverride({ handle: data.profile.handle, state })} />
        )}
      </div>
    </main>
  )
}
