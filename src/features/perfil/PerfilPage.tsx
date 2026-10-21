import { useState, type MouseEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/authContext'
import { Icon } from '../../components/Icon'
import { removeAvatar } from '../../lib/socialApi'
import { getInitials } from '../../lib/user'
import { ThemeSelector } from '../../components/ThemeSelector'
import { useMyProfile } from '../comunidade/hooks/useMyProfile'
import { AdminSection } from './AdminSection'
import { AvatarEditor } from './avatar/AvatarEditor'
import { MyCardSection } from './carta/MyCardSection'
import { ProfileEditor } from './ProfileEditor'
import { ProfilePreview } from './ProfilePreview'
import { MyCourses, MyEntities, PendingRequests, PrivacyControls } from './ProfileSections'

function Section({ id, title, children, aside }: { id: string; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="profile-section pf-section" id={id} tabIndex={-1} aria-labelledby={`${id}-title`}>
      <div className="pf-section-head">
        <h2 className="section-label" id={`${id}-title`}>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function PerfilPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { profile: me, loading, error, reload, update } = useMyProfile()
  const [preview, setPreview] = useState(false)
  const [editingAvatar, setEditingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  if (!user) return null
  const initials = getInitials(user)
  const picture = me?.profile.picture ?? user.picture

  async function restoreGooglePhoto() {
    setAvatarError(null)
    try {
      await removeAvatar()
      await reload()
    } catch {
      setAvatarError('Não foi possível voltar para a foto do Google.')
    }
  }

  function goBack() {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/')
  }

  const showAdmin = Boolean(me && (me.isSuperadmin || me.adminOf.length > 0))
  const pending = me?.pendingCount ?? 0
  const index: { id: string; label: string }[] = [
    { id: 'perfil-carta', label: 'Minha carta' },
    { id: 'perfil-editar', label: 'Meu perfil' },
    { id: 'perfil-pedidos', label: 'Pedidos' },
    { id: 'perfil-materias', label: 'Matérias' },
    { id: 'perfil-entidades', label: 'Entidades' },
    { id: 'perfil-privacidade', label: 'Privacidade' },
    ...(showAdmin ? [{ id: 'perfil-admin', label: 'Administrar' }] : []),
    { id: 'perfil-aparencia', label: 'Aparência' },
  ]

  function jump(e: MouseEvent<HTMLAnchorElement>, id: string) {
    const el = document.getElementById(id)
    if (!el) return
    e.preventDefault()
    el.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    el.focus({ preventScroll: true })
  }

  return (
    <main className="app-shell profile-shell">
      <div className="profile-content pf-content">
        <button className="ent-back-btn" onClick={goBack} aria-label="Voltar">
          <Icon name="arrow" /><span>Voltar</span>
        </button>
        <div className="profile-hero">
          <div className="profile-avatar-lg">
            {picture ? <img src={picture} alt={user.name} /> : <span>{initials}</span>}
          </div>
          <div>
            <h1 className="profile-name">{user.name}</h1>
            <p className="profile-email">{user.email}</p>
            {me && <p className="profile-email mono">@{me.profile.handle}</p>}
            {me && (
              <div className="profile-avatar-actions">
                <button type="button" className="pf-btn" onClick={() => setEditingAvatar(true)}>Trocar foto</button>
                {me.profile.hasCustomAvatar && (
                  <button type="button" className="pf-btn is-quiet" onClick={() => void restoreGooglePhoto()}>Usar foto do Google</button>
                )}
              </div>
            )}
            {avatarError && <p className="pf-error" role="alert">{avatarError}</p>}
          </div>
        </div>

        <div className="pf-layout">
          <nav className="pf-index" aria-label="Seções do perfil">
            <ul>
              {index.map((s) => (
                <li key={s.id}><a href={`#${s.id}`} onClick={(e) => jump(e, s.id)}>{s.label}{s.id === 'perfil-pedidos' && pending > 0 ? <span className="pf-index-count mono">{pending}</span> : null}</a></li>
              ))}
            </ul>
          </nav>

          <div className="pf-main">
            {!me && loading && <p className="pf-empty" role="status">Carregando seu perfil…</p>}
            {!me && !loading && error != null && (
              <div className="pf-section" role="alert">
                <p className="pf-error">Não foi possível carregar seu perfil social.</p>
                <button type="button" className="pf-btn" onClick={() => void reload()}>Tentar de novo</button>
              </div>
            )}

            {me && (
              <>
                <Section id="perfil-carta" title="Minha carta">
                  <MyCardSection />
                </Section>

                <Section id="perfil-editar" title="Meu perfil" aside={
                  <button type="button" className="pf-btn is-quiet" aria-pressed={preview} onClick={() => setPreview((p) => !p)}>
                    {preview ? 'Ocultar prévia' : 'Ver como os outros veem'}
                  </button>
                }>
                  <ProfileEditor profile={me.profile} onSave={(patch) => update(patch)} />
                  {preview && <ProfilePreview me={me} />}
                </Section>

                <Section id="perfil-pedidos" title={`Pedidos de conexão${pending > 0 ? ` (${pending})` : ''}`}>
                  <PendingRequests />
                </Section>

                <Section id="perfil-materias" title="Minhas matérias">
                  <MyCourses courses={me.courses} />
                </Section>

                <Section id="perfil-entidades" title="Minhas entidades">
                  <MyEntities me={me} onChanged={() => void reload()} />
                </Section>

                <Section id="perfil-privacidade" title="Privacidade">
                  <PrivacyControls profile={me.profile} onChange={(patch) => update(patch)} />
                </Section>

                {showAdmin && (
                  <Section id="perfil-admin" title="Administrar">
                    <AdminSection adminOf={me.adminOf} isSuperadmin={me.isSuperadmin} selfHandle={me.profile.handle} />
                  </Section>
                )}
              </>
            )}

            <div className="profile-section pf-section" id="perfil-aparencia" tabIndex={-1}>
              <h2 className="section-label" id="theme-label">Aparência</h2>
              <ThemeSelector labelledBy="theme-label" />
            </div>
            <button className="profile-logout-btn" onClick={() => void logout()}>
              <svg className="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    <AvatarEditor open={editingAvatar} onClose={() => setEditingAvatar(false)} onSaved={() => void reload()} />
    </main>
  )
}
