import { useRef, useState, type CSSProperties, type Ref } from 'react'
import { paletteOf, type CardPaper } from '../../lib/cardOptions'
import type { CardData } from '../../lib/socialApi'
import { techById } from '../../lib/technologies'
import { entidadesData } from '../../features/entidades/data'
import { initials, safeLinks, safePicture, SOCIAL_LABEL } from '../../features/comunidade/person/safeLinks'
import { BADGE_PATHS, BadgeChip } from '../BadgeChip'
import { TechChip } from '../TechChip'
import { CardQr } from './CardQr'
import { useTilt } from './useTilt'

const PAPER: Record<CardPaper, string> = { cream: '#fdf9e8', white: '#ffffff', dark: '#16161a' }

/** Link público da carta. Domínio configurável; nunca fixo no código. */
export function cardUrl(handle: string): string {
  const base = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined) ?? window.location.origin
  return `${base.replace(/\/+$/, '')}/c/${handle}`
}

type Face = 'front' | 'back'
type Props = {
  data: CardData
  variant?: 'full' | 'mini'
  flippable?: boolean
  initialFace?: Face
  onFlip?: (face: Face) => void
  exportRef?: Ref<HTMLDivElement>
}

type CornerIcon = { key: string; logo?: string; path?: string; letter: string; label: string }

function cornerIcons(data: CardData): CornerIcon[] {
  const fromEntities = data.entities.map((entity): CornerIcon => {
    const known = entidadesData.find((item) => item.id === entity.entityId)
    return { key: `e:${entity.entityId}`, logo: known?.logo, letter: entity.name.charAt(0).toUpperCase(), label: entity.name }
  })
  const fromBadges = data.badges.map((badge): CornerIcon => ({
    key: `b:${badge.kind}:${badge.sourceId}`,
    path: badge.icon ? BADGE_PATHS[badge.icon] : undefined,
    letter: badge.label.charAt(0).toUpperCase(),
    label: badge.label,
  }))
  return [...fromEntities, ...fromBadges].slice(0, 4)
}

export function ProfileCard({ data, variant = 'full', flippable, initialFace = 'front', onFlip, exportRef }: Props) {
  const mini = variant === 'mini'
  const canFlip = !mini && (flippable ?? true)
  const [face, setFace] = useState<Face>(canFlip ? initialFace : 'front')
  const tiltRef = useRef<HTMLDivElement>(null)
  const { style: tilt, requestMotionPermission } = useTilt(tiltRef, { enabled: !mini })

  const { settings } = data
  const palette = paletteOf(settings.palette)
  const vars = {
    '--accent': palette.accent,
    '--accent2': palette.accent2,
    '--backdrop': palette.backdrop,
    '--paper': PAPER[settings.paper] ?? PAPER.cream,
    // No papel escuro o tom de destaque seria ilegível; usa o claro da paleta.
    '--ink': settings.paper === 'dark' ? palette.accent2 : palette.accent,
  } as CSSProperties

  const picture = safePicture(data.picture)
  const techs = data.technologies.flatMap((id) => techById(id) ?? [])
  const tags = techs.slice(0, 3)
  const icons = cornerIcons(data)
  const links = safeLinks(data.links)
  const back = canFlip && face === 'back'

  const flip = () => {
    const next: Face = back ? 'front' : 'back'
    setFace(next)
    onFlip?.(next)
  }

  const classes = ['pcard', `pcard-${variant}`, `finish-${settings.finish}`, settings.grain && 'has-grain', back && 'is-back'].filter(Boolean).join(' ')

  return (
    <div className={`pcard-wrap pcard-wrap-${variant}`}>
      <div ref={exportRef} className="pcard-bg" style={vars}>
        <div ref={tiltRef} className={classes}>
          <div className="pcard-tilt" style={tilt}>
            <div className="pcard-inner">
              <div className="pcard-face pcard-front" aria-hidden={back} inert={back || undefined}>
                <div className={`pcard-photo shape-${settings.shape}${settings.frame ? ' is-framed' : ''}`}>
                  {picture
                    ? <img src={picture} alt="" draggable={false} />
                    : <div className="pcard-photo-fallback" data-testid="card-photo-fallback"><span>{initials(data.name)}</span></div>}
                </div>
                <h3 className="pcard-name">{data.name}</h3>
                <p className="pcard-sub">{data.subtitle}</p>
                {(tags.length > 0 || icons.length > 0) && (
                  <div className="pcard-foot">
                    {tags.length > 0 ? (
                      <span className="pcard-tags">
                        {tags.map((tech, index) => (
                          <span key={tech.id} className="pcard-tags-item">
                            {index > 0 && <i className="pcard-hatch" aria-hidden="true" />}
                            <span>{tech.name}</span>
                          </span>
                        ))}
                      </span>
                    ) : <span />}
                    {icons.length > 0 && (
                      <span className="pcard-icons">
                        {icons.map((icon) => (
                          <span key={icon.key} className="pcard-ico" title={icon.label}>
                            {icon.logo ? <img src={icon.logo} alt={icon.label} draggable={false} />
                              : icon.path ? <svg viewBox="0 0 24 24" role="img" aria-label={icon.label}><path d={icon.path} /></svg>
                              : icon.letter}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                )}
                <FaceFx finish={settings.finish} />
              </div>

              {!mini && (
                <div className="pcard-face pcard-back" aria-hidden={!back} inert={!back || undefined}>
                  <span className="pcard-label">@{data.handle} · {data.course}{data.entryYear ? ` · Turma ${data.entryYear}` : ''}</span>
                  <div className="pcard-qr">
                    <CardQr value={cardUrl(data.handle)} size={112} color={`color-mix(in srgb, ${palette.accent} 70%, #000)`} />
                  </div>
                  {links.length > 0 && (
                    <div className="pcard-chips">
                      {links.map(({ key, url }) => (
                        <a key={key} className="pcard-chip" href={url} target="_blank" rel="noopener noreferrer">{SOCIAL_LABEL[key]}</a>
                      ))}
                    </div>
                  )}
                  {techs.length > 0 && <div className="pcard-list">{techs.map((tech) => <TechChip key={tech.id} id={tech.id} />)}</div>}
                  {data.entities.length > 0 && (
                    <p className="pcard-ents">{data.entities.map((entity) => (entity.title ? `${entity.name} · ${entity.title}` : entity.name)).join('  /  ')}</p>
                  )}
                  {data.badges.length > 0 && <div className="pcard-list">{data.badges.map((badge) => <BadgeChip key={`${badge.kind}:${badge.sourceId}`} badge={badge} />)}</div>}
                  <FaceFx finish={settings.finish} />
                </div>
              )}
            </div>
          </div>
          {canFlip && (
            <button type="button" className="pcard-flip" aria-pressed={back} aria-label={`Virar a carta de ${data.name}`} onClick={flip} />
          )}
        </div>
      </div>
      {requestMotionPermission && (
        <button type="button" className="pcard-motion" onClick={() => void requestMotionPermission()}>Ativar movimento</button>
      )}
    </div>
  )
}

function FaceFx({ finish }: { finish: CardData['settings']['finish'] }) {
  return (
    <>
      {(finish === 'foil' || finish === 'holo') && <div className="pcard-foil" aria-hidden="true" />}
      {finish === 'holo' && <div className="pcard-holo" aria-hidden="true" />}
      {finish === 'gold' && <div className="pcard-gold" aria-hidden="true" />}
      <div className="pcard-shine" aria-hidden="true" />
    </>
  )
}
