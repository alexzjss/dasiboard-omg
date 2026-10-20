import { useId, useState, type FormEvent } from 'react'
import { ApiError, type MyProfile, type ProfilePatch } from '../../lib/socialApi'
import { buildPatch, type Draft } from './logic'
import { BIO_MAX, LINK_DOMAIN, LINK_KEYS, LINK_LABEL, bioError, courseError, entryYearOptions, fieldOfServerError, linkError, type LinkKey } from './validation'

function toDraft(p: MyProfile['profile']): Draft {
  return {
    bio: p.bio ?? '',
    course: p.course,
    entryYear: p.entryYear === null ? '' : String(p.entryYear),
    links: { github: p.links.github ?? '', linkedin: p.links.linkedin ?? '', instagram: p.links.instagram ?? '' },
  }
}

type Errors = Partial<Record<'bio' | 'course' | 'entryYear' | LinkKey | 'form', string>>

export function ProfileEditor({ profile, onSave }: { profile: MyProfile['profile']; onSave: (patch: ProfilePatch) => Promise<void> }) {
  const uid = useId()
  const [draft, setDraft] = useState<Draft>(() => toDraft(profile))
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const patch = buildPatch(profile, draft)

  function validate(): Errors {
    const next: Errors = {}
    const bio = bioError(draft.bio); if (bio) next.bio = bio
    const course = courseError(draft.course); if (course) next.course = course
    for (const key of LINK_KEYS) {
      const err = linkError(key, draft.links[key])
      if (err) next[key] = err
    }
    return next
  }

  function change(next: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...next }))
    setSaved(false)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length || !patch) return
    setSaving(true); setSaved(false)
    try {
      await onSave(patch)
      setSaved(true)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível salvar. Tente de novo.'
      const field = err instanceof ApiError ? fieldOfServerError(message) : null
      setErrors(field ? { [field]: message } : { form: message })
    } finally {
      setSaving(false)
    }
  }

  const bioLen = draft.bio.length
  const years = entryYearOptions(profile.entryYear)

  return (
    <form className="pf-form" onSubmit={(e) => void submit(e)} noValidate>
      <div className="pf-field">
        <label htmlFor={`${uid}-bio`}>Bio</label>
        <textarea id={`${uid}-bio`} className="com-input pf-textarea" rows={3} value={draft.bio}
          onChange={(e) => change({ bio: e.target.value })} aria-invalid={Boolean(errors.bio)} aria-describedby={`${uid}-bio-meta`} />
        <div id={`${uid}-bio-meta`} className="pf-meta">
          {errors.bio ? <span className="pf-error" role="alert">{errors.bio}</span> : <span />}
          <span className={`pf-counter mono${bioLen > BIO_MAX ? ' is-over' : ''}`}>{bioLen}/{BIO_MAX}</span>
        </div>
      </div>

      <div className="pf-row">
        <div className="pf-field">
          <label htmlFor={`${uid}-course`}>Curso</label>
          <input id={`${uid}-course`} className="com-input" value={draft.course} maxLength={100}
            onChange={(e) => change({ course: e.target.value })} aria-invalid={Boolean(errors.course)} />
          {errors.course && <span className="pf-error" role="alert">{errors.course}</span>}
        </div>
        <div className="pf-field">
          <label htmlFor={`${uid}-year`}>Ano de ingresso</label>
          <select id={`${uid}-year`} className="com-input" value={draft.entryYear} onChange={(e) => change({ entryYear: e.target.value })}>
            <option value="">Não informar</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {errors.entryYear && <span className="pf-error" role="alert">{errors.entryYear}</span>}
        </div>
      </div>

      {LINK_KEYS.map((key) => (
        <div className="pf-field" key={key}>
          <label htmlFor={`${uid}-${key}`}>{LINK_LABEL[key]}</label>
          <input id={`${uid}-${key}`} className="com-input" type="url" inputMode="url" autoComplete="off" value={draft.links[key]}
            placeholder={`https://${LINK_DOMAIN[key]}/seu-usuario`}
            onChange={(e) => change({ links: { ...draft.links, [key]: e.target.value } })} aria-invalid={Boolean(errors[key])} />
          {errors[key] && <span className="pf-error" role="alert">{errors[key]}</span>}
        </div>
      ))}

      <div className="pf-actions">
        <button type="submit" className="pf-btn is-primary" disabled={saving || !patch}>{saving ? 'Salvando…' : 'Salvar perfil'}</button>
        <span className="pf-status" role="status">{saved ? 'Perfil salvo.' : ''}</span>
      </div>
      {errors.form && <p className="pf-error" role="alert">{errors.form}</p>}
    </form>
  )
}
