import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CardActions } from '../../../components/card/CardActions'
import { ProfileCard } from '../../../components/card/ProfileCard'
import { Icon } from '../../../components/Icon'
import { CARD_FINISHES, CARD_PALETTES, CARD_PAPERS, CARD_SHAPES, MAX_CARD_ITEMS, type CardFinish, type CardPaper, type CardSettings, type CardShape } from '../../../lib/cardOptions'
import { ApiError, getMyCard, updateMyCard, type CardData, type MyCard } from '../../../lib/socialApi'
import { useMyProfile } from '../../comunidade/hooks/useMyProfile'

const PAPER_LABEL: Record<CardPaper, string> = { cream: 'Creme', white: 'Branco', dark: 'Escuro' }
const SHAPE_LABEL: Record<CardShape, string> = { leaf: 'Folha', arch: 'Arco', circle: 'Círculo', squircle: 'Quadrado' }
const FINISH_LABEL: Record<CardFinish, string> = { common: 'Comum', foil: 'Foil', holo: 'Holo', gold: 'Ouro' }
const badgeKey = (badge: { kind: string; sourceId: string }) => `${badge.kind}:${badge.sourceId}`
const sameSettings = (a: CardSettings, b: CardSettings) => JSON.stringify(a) === JSON.stringify(b)

function Lock() {
  return <svg className="cartaed-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
}

function Choice({ label, selected, locked, hint, onPick }: { label: string; selected: boolean; locked?: boolean; hint?: string; onPick: () => void }) {
  return (
    <button type="button" className={`cartaed-choice${selected ? ' is-on' : ''}`} aria-pressed={selected} disabled={locked} onClick={onPick}>
      <span>{label}</span>
      {locked && <small><Lock /> {hint ?? 'Bloqueado'}</small>}
    </button>
  )
}

function Switch({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (next: boolean) => void; hint?: string }) {
  return (
    <label className="cartaed-switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
      {hint && <small>{hint}</small>}
    </label>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset className="cartaed-group"><legend>{title}</legend>{children}</fieldset>
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="app-shell profile-shell"><div className="profile-content pf-content cartaed">{children}</div></main>
}

export function CartaEditorPage() {
  const navigate = useNavigate()
  const { profile: me } = useMyProfile()
  const [saved, setSaved] = useState<MyCard | null>(null)
  const [settings, setSettings] = useState<CardSettings | null>(null)
  const [isPublic, setIsPublic] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getMyCard(controller.signal).then((data) => {
      setSaved(data); setSettings(data.card.settings); setIsPublic(data.public)
    }).catch(() => { if (!controller.signal.aborted) setLoadError(true) })
    return () => controller.abort()
  }, [])

  const dirty = Boolean(saved && settings && (!sameSettings(settings, saved.card.settings) || isPublic !== saved.public))

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const memberships = useMemo(() => me?.entities ?? [], [me])
  const extraBadges = useMemo(() => (me?.badges ?? []).filter((badge) => badge.kind !== 'entity_member'), [me])

  // Lista vazia = modo automático: o servidor escolhe e o preview mostra essas escolhas, mas o que se salva continua vazio.
  const effective = useMemo(() => {
    if (!saved || !settings) return { entities: [] as string[], badges: [] as string[] }
    return {
      entities: settings.entities.length > 0 ? settings.entities : saved.card.entities.map((entity) => entity.entityId),
      badges: settings.badges.length > 0 ? settings.badges : saved.card.badges.map(badgeKey),
    }
  }, [saved, settings])

  const preview = useMemo<CardData | null>(() => {
    if (!saved || !settings) return null
    const byEntity = new Map(memberships.map((membership) => [membership.entityId, membership]))
    const byKey = new Map(extraBadges.map((badge) => [badgeKey(badge), badge]))
    const entities = effective.entities.flatMap((id) => byEntity.get(id) ?? []).map(({ entityId, name, title }) => ({ entityId, name, title }))
    const main = entities[0]
    const { course, entryYear } = saved.card
    return {
      ...saved.card,
      settings,
      entities,
      badges: effective.badges.flatMap((key) => byKey.get(key) ?? []),
      subtitle: main?.title ? `${main.title} · ${main.name}` : entryYear ? `${course} · Turma ${entryYear}` : course,
    }
  }, [saved, settings, effective, memberships, extraBadges])

  if (loadError) return <Shell><p className="pf-error" role="alert">Não deu pra carregar sua carta.</p><Link className="pf-btn" to="/perfil">Voltar ao perfil</Link></Shell>
  if (!saved || !settings || !preview) return <Shell><p className="pf-empty" role="status">Carregando sua carta…</p></Shell>

  const { unlocks } = saved
  const set = <K extends keyof CardSettings>(key: K, value: CardSettings[K]) => { setSettings({ ...settings, [key]: value }); setMessage(null) }
  const toggle = (key: 'entities' | 'badges', id: string) => {
    const list = effective[key]
    set(key, list.includes(id) ? list.filter((item) => item !== id) : list.length < MAX_CARD_ITEMS ? [...list, id] : list)
  }
  const move = (id: string, delta: number) => {
    const list = [...effective.entities]
    const from = list.indexOf(id)
    const to = from + delta
    if (from < 0 || to < 0 || to >= list.length) return
    const other = list[to]
    list[to] = id
    list[from] = other
    set('entities', list)
  }

  async function save() {
    if (!settings) return
    setSaving(true); setMessage(null)
    try {
      const next = await updateMyCard({ settings, public: isPublic })
      setSaved(next); setSettings(next.card.settings); setIsPublic(next.public)
      setMessage({ kind: 'ok', text: 'Carta salva.' })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof ApiError ? error.message : 'Não deu pra salvar a carta.' })
    } finally { setSaving(false) }
  }

  function discard() {
    if (!saved) return
    setSettings(saved.card.settings); setIsPublic(saved.public); setMessage(null)
  }

  function leave() {
    if (dirty && !window.confirm('Você tem mudanças que ainda não foram salvas. Sair mesmo assim?')) return
    navigate('/perfil')
  }

  const hasLockedPalette = CARD_PALETTES.some((palette) => !unlocks.palettes.includes(palette.id))

  return (
    <Shell>
      <button type="button" className="ent-back-btn" onClick={leave} aria-label="Voltar ao perfil"><Icon name="arrow" /><span>Voltar</span></button>
      <h1 className="profile-name">Personalizar carta</h1>

      <div className="cartaed-layout">
        <div className="cartaed-preview"><ProfileCard data={preview} exportRef={cardRef} /><CardActions data={preview} cardRef={cardRef} /></div>

        <div className="cartaed-panel">
          <Group title="Paleta">
            <div className="cartaed-swatches">
              {CARD_PALETTES.map((palette) => {
                const locked = !unlocks.palettes.includes(palette.id)
                const hint = unlocks.requirements[palette.id]
                return (
                  <button key={palette.id} type="button" className={`cartaed-swatch${settings.palette === palette.id ? ' is-on' : ''}`} aria-pressed={settings.palette === palette.id}
                    aria-label={palette.name} disabled={locked} title={locked && hint ? `${palette.name}: ${hint}` : palette.name} onClick={() => set('palette', palette.id)}
                    style={{ background: `linear-gradient(135deg, ${palette.accent} 50%, ${palette.accent2} 50%)` }}>
                    {locked && <Lock />}
                  </button>
                )
              })}
            </div>
            {hasLockedPalette && <p className="pf-hint">Paletas com cadeado se desbloqueiam com o requisito que aparece ao passar o mouse.</p>}
          </Group>
          <Group title="Papel"><div className="cartaed-row">{CARD_PAPERS.map((paper) => <Choice key={paper} label={PAPER_LABEL[paper]} selected={settings.paper === paper} onPick={() => set('paper', paper)} />)}</div></Group>
          <Group title="Forma da foto"><div className="cartaed-row">{CARD_SHAPES.map((shape) => <Choice key={shape} label={SHAPE_LABEL[shape]} selected={settings.shape === shape} onPick={() => set('shape', shape)} />)}</div></Group>
          <Group title="Detalhes">
            <Switch label="Moldura" checked={settings.frame} onChange={(value) => set('frame', value)} />
            <Switch label="Grão" checked={settings.grain} onChange={(value) => set('grain', value)} />
          </Group>
          <Group title="Acabamento">
            <div className="cartaed-row">
              {CARD_FINISHES.map((finish) => {
                const locked = !unlocks.finishes.includes(finish)
                return <Choice key={finish} label={FINISH_LABEL[finish]} selected={settings.finish === finish} locked={locked} hint={unlocks.requirements[finish]} onPick={() => set('finish', finish)} />
              })}
            </div>
          </Group>
          <Group title={`Entidades na carta (até ${MAX_CARD_ITEMS})`}>
            {memberships.length === 0 ? <p className="pf-hint">Você ainda não participa de entidades.</p> : (
              <ul className="cartaed-list">
                {memberships.map((membership) => {
                  const index = effective.entities.indexOf(membership.entityId)
                  const on = index >= 0
                  return (
                    <li key={membership.entityId}>
                      <label><input type="checkbox" checked={on} disabled={!on && effective.entities.length >= MAX_CARD_ITEMS} onChange={() => toggle('entities', membership.entityId)} /> {membership.name}</label>
                      {index === 0 && <span className="cartaed-tag">principal</span>}
                      {on && (
                        <span className="cartaed-move">
                          <button type="button" className="pf-btn is-quiet" aria-label={`Subir ${membership.name}`} disabled={index === 0} onClick={() => move(membership.entityId, -1)}>↑</button>
                          <button type="button" className="pf-btn is-quiet" aria-label={`Descer ${membership.name}`} disabled={index === effective.entities.length - 1} onClick={() => move(membership.entityId, 1)}>↓</button>
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Group>
          <Group title={`Badges na carta (até ${MAX_CARD_ITEMS})`}>
            {extraBadges.length === 0 ? <p className="pf-hint">Você ainda não tem badges.</p> : (
              <ul className="cartaed-list">
                {extraBadges.map((badge) => {
                  const key = badgeKey(badge)
                  const on = effective.badges.includes(key)
                  return <li key={key}><label><input type="checkbox" checked={on} disabled={!on && effective.badges.length >= MAX_CARD_ITEMS} onChange={() => toggle('badges', key)} /> {badge.label}</label></li>
                })}
              </ul>
            )}
          </Group>
          <Group title="Carta pública">
            <Switch label="Deixar minha carta pública" checked={isPublic} onChange={(value) => { setIsPublic(value); setMessage(null) }} hint="Qualquer pessoa com o link vê sua carta. E-mail e nº USP nunca aparecem." />
          </Group>

          <div className="pf-actions cartaed-actions">
            <button type="button" className="pf-btn is-primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? 'Salvando…' : 'Salvar'}</button>
            <button type="button" className="pf-btn is-quiet" disabled={!dirty || saving} onClick={discard}>Descartar</button>
            {message && <p className={message.kind === 'ok' ? 'pf-ok' : 'pf-error'} role={message.kind === 'ok' ? 'status' : 'alert'}>{message.text}</p>}
          </div>
        </div>
      </div>
    </Shell>
  )
}
