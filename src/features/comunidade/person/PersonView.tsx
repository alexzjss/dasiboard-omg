import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { ConnectionState, PersonMini, PersonProfile } from '../../../lib/socialApi'
import { entidadeSlug, entidadesData } from '../../entidades/data'
import { BadgeChip } from '../../../components/BadgeChip'
import { TechChip } from '../../../components/TechChip'
import { ConnectButton } from '../components/ConnectButton'
import { initials, safeLinks, safePicture, SOCIAL_LABEL } from './safeLinks'

function Avatar({ name, picture, size = 'md' }: { name: string; picture: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const src = safePicture(picture)
  return src
    ? <img className={`pessoa-avatar is-${size}`} src={src} alt="" referrerPolicy="no-referrer" loading="lazy" />
    : <span className={`pessoa-avatar is-${size}`} aria-hidden="true">{initials(name)}</span>
}

function Private({ first, what }: { first: string; what: string }) {
  return <p className="pessoa-private">{first} preferiu deixar {what} em privado.</p>
}

function MiniCards({ people }: { people: PersonMini[] }) {
  return (
    <ul className="pessoa-mini-list">
      {people.map((p) => (
        <li key={p.handle}>
          <Link className="pessoa-mini" to={`/comunidade/${encodeURIComponent(p.handle)}`}>
            <Avatar name={p.name} picture={p.picture} size="sm" />
            <span className="pessoa-mini-text">
              <span className="pessoa-mini-name">{p.name}</span>
              <span className="pessoa-mini-handle mono">@{p.handle}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function PersonView({ data, onConnection }: { data: PersonProfile; onConnection: (next: ConnectionState) => void }) {
  const { profile, courses, commonCourses, classmatesInCommon, connections } = data
  const entities = (data.badges ?? []).filter((b) => b.kind === 'entity_member')
  const titles = new Map((data.entities ?? []).map((entity) => [entity.entityId, entity.title]))
  const otherBadges = (data.badges ?? []).filter((b) => b.kind !== 'entity_member')
  const first = profile.name.split(/\s+/)[0] || profile.name
  const links = safeLinks(profile.links)
  const meta = [profile.course, profile.entryYear ? `ingresso em ${profile.entryYear}` : ''].filter(Boolean).join(' · ')

  return (
    <article className="pessoa-layout">
      <header className="pessoa-header">
        <Avatar name={profile.name} picture={profile.picture} size="lg" />
        <div className="pessoa-header-text">
          <h1>{profile.name}</h1>
          <p className="pessoa-handle mono">@{profile.handle}</p>
          {meta && <p className="pessoa-meta">{meta}</p>}
          {profile.bio && <p className="pessoa-bio">{profile.bio}</p>}
          {links.length > 0 && (
            <ul className="pessoa-links">
              {links.map((l) => (
                <li key={l.key}><a href={l.url} target="_blank" rel="noopener noreferrer">{SOCIAL_LABEL[l.key]}</a></li>
              ))}
            </ul>
          )}
        </div>
        <div className="pessoa-header-action">
          <ConnectButton handle={profile.handle} name={profile.name} state={data.connection} onChange={onConnection} />
        </div>
      </header>

      <div className="pessoa-sections">
        <section className="pessoa-section" aria-labelledby="pessoa-entidades">
          <h2 id="pessoa-entidades">Entidades</h2>
          {entities.length === 0 ? <p className="pessoa-empty">{first} ainda não participa de entidades.</p> : (
            <ul className="pessoa-badges">
              {entities.map((b) => {
                const ent = entidadesData.find((e) => e.id === b.entityId)
                const title = titles.get(b.sourceId)
                if (!ent) return <li key={b.sourceId}><span className="pessoa-badge">{b.label}{title && <span className="pessoa-badge-title"> · {title}</span>}</span></li>
                return (
                  <li key={b.sourceId}>
                    <Link className="pessoa-badge" to={`/entidades/${entidadeSlug(ent)}`} style={{ '--ent-accent': ent.accentColor } as CSSProperties}>
                      <img src={ent.logo} alt="" />
                      {b.label || ent.name}
                      {title && <span className="pessoa-badge-title"> · {title}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {(profile.technologies ?? []).length > 0 && (
          <section className="pessoa-section" aria-labelledby="pessoa-tecnologias">
            <h2 id="pessoa-tecnologias">Tecnologias</h2>
            <ul className="pessoa-techs">
              {profile.technologies.map((id) => <li key={id}><TechChip id={id} /></li>)}
            </ul>
          </section>
        )}

        {otherBadges.length > 0 && (
          <section className="pessoa-section" aria-labelledby="pessoa-badges">
            <h2 id="pessoa-badges">Badges</h2>
            <ul className="pessoa-badges">
              {otherBadges.map((b) => <li key={`${b.kind}:${b.sourceId}`}><BadgeChip badge={b} /></li>)}
            </ul>
          </section>
        )}

        <section className="pessoa-section" aria-labelledby="pessoa-materias">
          <h2 id="pessoa-materias">Matérias{commonCourses ? <span className="pessoa-count"> · {commonCourses} em comum</span> : null}</h2>
          {!courses ? <Private first={first} what="as matérias" /> : courses.length === 0 ? (
            <p className="pessoa-empty">Nenhuma matéria importada ainda.</p>
          ) : (
            <ul className="pessoa-courses">
              {courses.map((c) => (
                <li key={c.code}>
                  <Link className={`pessoa-course${c.common ? ' is-common' : ''}`} to={`/comunidade?materia=${encodeURIComponent(c.code)}`}>
                    <span className="mono">{c.code}</span>
                    <span>{c.title}</span>
                    {c.common && <span className="pessoa-common-tag">em comum</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="pessoa-section" aria-labelledby="pessoa-conexoes">
          <h2 id="pessoa-conexoes">Conexões{connections ? <span className="pessoa-count"> · {connections.count}</span> : null}</h2>
          {!connections ? <Private first={first} what="as conexões" /> : connections.people.length === 0 ? (
            <p className="pessoa-empty">{connections.count === 0 ? 'Nenhuma conexão ainda.' : 'Conexões não listadas.'}</p>
          ) : <MiniCards people={connections.people} />}
        </section>

        {classmatesInCommon && classmatesInCommon.length > 0 && (
          <section className="pessoa-section" aria-labelledby="pessoa-colegas">
            <h2 id="pessoa-colegas">Colegas de turma em comum</h2>
            <MiniCards people={classmatesInCommon} />
          </section>
        )}
      </div>
    </article>
  )
}

export function PersonSkeleton() {
  return (
    <div className="pessoa-layout" aria-busy="true" aria-label="Carregando perfil" role="status">
      <div className="pessoa-header">
        <span className="pessoa-avatar is-lg pessoa-skel" />
        <div className="pessoa-header-text">
          <span className="pessoa-skel pessoa-skel-line is-title" />
          <span className="pessoa-skel pessoa-skel-line" />
          <span className="pessoa-skel pessoa-skel-line is-wide" />
        </div>
      </div>
      <div className="pessoa-sections">
        {[0, 1].map((i) => <div key={i} className="pessoa-section"><span className="pessoa-skel pessoa-skel-line" /><span className="pessoa-skel pessoa-skel-block" /></div>)}
      </div>
    </div>
  )
}
