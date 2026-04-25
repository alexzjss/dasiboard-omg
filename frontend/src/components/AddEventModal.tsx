// ── Modern Event Creation Modal with Enhanced UX ──────────────────────────────
import { useState, useEffect } from 'react'
import {
  X, Globe, Lock, Calendar, Clock, MapPin, BookOpen, Repeat, Users, Pencil, AlertCircle
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import EventDatePicker from './EventDatePicker'

interface Entity { id: string; slug: string; name: string; short_name: string; color: string; icon_emoji: string; is_member: boolean }

interface EventFormData {
  title: string; description: string; event_type: string
  start_at: string; end_at: string; all_day: boolean; color: string
  location: string; class_code: string; entity_id: string
  recurring: boolean; recur_weeks: number; entity_code?: string
}

const TYPE_LABELS: Record<string, string> = {
  exam: 'Prova', deadline: 'Deadline', academic: 'Acadêmico',
  personal: 'Pessoal', work: 'Trabalho', entity: 'Entidade',
}

const TYPE_COLORS: Record<string, string> = {
  exam: '#EF4444', deadline: '#F59E0B',
  academic: '#4d67f5', personal: '#10B981', work: '#EC4899', entity: '#a855f7',
}

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: EventFormData, isGlobal: boolean, globalKey: string) => void
  entities: Entity[]
  editingEvent?: any
  initialDate?: Date
}

export default function AddEventModal({
  isOpen, onClose, onSubmit, entities, editingEvent, initialDate
}: AddEventModalProps) {
  const [isGlobal, setIsGlobal] = useState(false)
  const [globalKey, setGlobalKey] = useState('')
  const [entityCode, setEntityCode] = useState('')
  const [entityCodeError, setEntityCodeError] = useState('')
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null)

  const FORM_DEFAULT: EventFormData = {
    title: '', description: '', event_type: 'personal',
    start_at: initialDate ? initialDate.toISOString().slice(0, 16) : '',
    end_at: '', all_day: false, color: TYPE_COLORS.personal,
    location: '', class_code: '', entity_id: '',
    recurring: false, recur_weeks: 1, entity_code: '',
  }

  const [form, setForm] = useState<EventFormData>(editingEvent || FORM_DEFAULT)

  useEffect(() => {
    if (isOpen && !editingEvent) {
      setForm(FORM_DEFAULT)
      setIsGlobal(false)
      setGlobalKey('')
      setEntityCode('')
      setEntityCodeError('')
    }
  }, [isOpen])

  const set = (k: keyof EventFormData, v: any) => setForm(f => ({ ...f, [k]: v }))

  const selectedEntity = form.entity_id ? entities.find(e => e.id === form.entity_id) : null
  const eventColor = selectedEntity?.color || TYPE_COLORS[form.event_type] || TYPE_COLORS.personal

  // Validar código da entidade
  const validateEntityCode = (code: string): boolean => {
    if (form.entity_id && !code.trim()) {
      setEntityCodeError('Código da entidade é obrigatório')
      return false
    }
    if (code && !/^[A-Z0-9\-]{2,}$/.test(code)) {
      setEntityCodeError('Formato inválido. Use apenas maiúsculas, números e hífen.')
      return false
    }
    setEntityCodeError('')
    return true
  }

  const handleEntityCodeChange = (code: string) => {
    setEntityCode(code)
    validateEntityCode(code)
  }

  const handleSubmit = () => {
    // Validações obrigatórias
    if (!form.title.trim()) {
      alert('Título é obrigatório')
      return
    }
    if (!form.start_at) {
      alert('Data de início é obrigatória')
      return
    }
    if (form.end_at && form.start_at >= form.end_at) {
      alert('Data de fim deve ser posterior à data de início')
      return
    }
    if (!validateEntityCode(entityCode)) {
      return
    }

    const finalForm = { ...form, entity_code: entityCode }
    onSubmit(finalForm, isGlobal, globalKey)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in"
         style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      
      {/* Modal Container */}
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[90dvh] sm:max-h-[85dvh] animate-in"
           style={{
             background: 'var(--bg-card)',
             border: `1px solid ${eventColor}33`,
             boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px ${eventColor}22`,
           }}>

        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-light)' }} />
        </div>

        {/* Header with color band */}
        <div className="shrink-0 px-4 sm:px-6 pt-3 pb-4">
          <div className="h-1.5 rounded-full mb-4" style={{ background: eventColor }} />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isGlobal && <Globe size={16} className="text-pink-400" />}
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {editingEvent ? 'Editar Evento' : 'Novo Evento'}
              </h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 space-y-4">

          {/* Global Event Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl"
               style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <Globe size={14} style={{ color: isGlobal ? 'var(--accent-3)' : 'var(--text-muted)' }} />
              <label className="text-sm font-medium cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                Evento Global
              </label>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                background: 'rgba(219,39,119,0.1)', color: '#f9a8d4'
              }}>
                Visível para todos
              </span>
            </div>
            <button onClick={() => setIsGlobal(!isGlobal)}
                    className="w-11 h-6 rounded-full transition-all relative"
                    style={{
                      background: isGlobal ? 'var(--accent-1)' : 'var(--border)',
                    }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
                   style={{
                     background: 'white',
                     transform: isGlobal ? 'translateX(22px)' : 'translateX(2px)',
                   }} />
            </button>
          </div>

          {/* Global Key - appears only if Global is enabled */}
          {isGlobal && (
            <div className="p-3 rounded-xl" style={{
              background: 'rgba(219,39,119,0.1)',
              border: '1px solid rgba(219,39,119,0.2)',
            }}>
              <label className="label flex items-center gap-1 mb-2">
                <Lock size={12} /> Chave de Acesso
              </label>
              <input type="password" className="input text-sm w-full"
                     placeholder="Chave secreta para criar/editar" value={globalKey}
                     onChange={e => setGlobalKey(e.target.value)} />
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                🔐 Eventos globais requerem uma chave secreta
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="label">Título</label>
            <input type="text" className="input text-sm w-full"
                   placeholder="Nome do evento" value={form.title}
                   onChange={e => set('title', e.target.value)} />
          </div>

          {/* Event Type */}
          <div>
            <label className="label">Tipo de Evento</label>
            <select className="input text-sm w-full" value={form.event_type}
                    onChange={e => {
                      set('event_type', e.target.value)
                      set('color', TYPE_COLORS[e.target.value] || TYPE_COLORS.personal)
                    }}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Entity Selection with Code Input */}
          <div>
            <label className="label flex items-center gap-1">
              <Users size={13} /> Entidade (opcional)
            </label>
            <select className="input text-sm w-full" value={form.entity_id}
                    onChange={e => {
                      set('entity_id', e.target.value)
                      if (!e.target.value) {
                        setEntityCode('')
                        setEntityCodeError('')
                      }
                    }}>
              <option value="">Nenhuma</option>
              {entities.filter(e => e.is_member).map(e => (
                <option key={e.id} value={e.id}>{e.icon_emoji} {e.short_name || e.name}</option>
              ))}
            </select>

            {/* Entity Code Input - shows only if entity is selected */}
            {selectedEntity && (
              <div className="mt-3 p-3 rounded-lg" style={{
                background: selectedEntity.color + '15',
                border: `1px solid ${selectedEntity.color}33`,
              }}>
                <label className="label flex items-center gap-1 mb-2">
                  <BookOpen size={13} /> Código da Entidade
                  <span className="text-pink-500">*</span>
                </label>
                <input type="text" className="input text-sm w-full"
                       placeholder="Ex: ORG-2024-001"
                       value={entityCode}
                       onChange={e => handleEntityCodeChange(e.target.value)}
                       style={{
                         borderColor: entityCodeError ? '#ef4444' : undefined,
                       }} />
                {entityCodeError && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs" style={{ color: '#ef4444' }}>
                    <AlertCircle size={12} />
                    {entityCodeError}
                  </div>
                )}
                <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  Código único para identificar este evento na entidade
                </p>
              </div>
            )}
          </div>

          {/* Class Code */}
          <div>
            <label className="label flex items-center gap-1">
              <BookOpen size={13} /> Código da Turma (opcional)
            </label>
            <input type="text" className="input text-sm w-full"
                   placeholder="Ex: ACH2157" value={form.class_code}
                   onChange={e => set('class_code', e.target.value)} />
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1">
                <Calendar size={13} /> Início
              </label>
              <button onClick={() => setShowDatePicker('start')}
                      className="input text-sm w-full text-left flex items-center gap-2"
                      style={{ background: 'var(--bg-elevated)' }}>
                <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                {form.start_at ? format(parseISO(form.start_at), "dd MMM · HH:mm", { locale: ptBR }) : 'Selecione...'}
              </button>
              {showDatePicker === 'start' && (
                <EventDatePicker
                  value={form.start_at}
                  onChange={v => {
                    set('start_at', v)
                    setShowDatePicker(null)
                  }}
                  onClose={() => setShowDatePicker(null)}
                />
              )}
            </div>

            <div>
              <label className="label flex items-center gap-1">
                <Calendar size={13} /> Fim (opcional)
              </label>
              <button onClick={() => setShowDatePicker('end')}
                      className="input text-sm w-full text-left flex items-center gap-2"
                      style={{ background: 'var(--bg-elevated)' }}>
                <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                {form.end_at ? format(parseISO(form.end_at), "dd MMM · HH:mm", { locale: ptBR }) : 'Selecione...'}
              </button>
              {showDatePicker === 'end' && (
                <EventDatePicker
                  value={form.end_at}
                  onChange={v => {
                    set('end_at', v)
                    setShowDatePicker(null)
                  }}
                  onClose={() => setShowDatePicker(null)}
                />
              )}
            </div>
          </div>

          {/* Event Preview */}
          {form.start_at && (
            <div className="p-3 rounded-lg" style={{
              background: eventColor + '15',
              border: `1px solid ${eventColor}33`,
            }}>
              <p className="text-xs font-semibold" style={{ color: eventColor }}>
                {form.title || 'Evento sem título'}
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {format(parseISO(form.start_at), "d 'de' MMMM · HH:mm", { locale: ptBR })}
                {form.end_at && ` → ${format(parseISO(form.end_at), 'HH:mm')}`}
                {form.start_at && form.end_at && (() => {
                  const mins = Math.round((new Date(form.end_at).getTime() - new Date(form.start_at).getTime()) / 60000)
                  if (mins > 0) return ` (${mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? `${mins % 60}min` : ''}` : `${mins}min`})`
                  return ''
                })()}
              </p>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="label flex items-center gap-1">
              <MapPin size={13} /> Local (opcional)
            </label>
            <input type="text" className="input text-sm w-full"
                   placeholder="Sala, edifício ou local" value={form.location}
                   onChange={e => set('location', e.target.value)} />
          </div>

          {/* Description */}
          <div>
            <label className="label">Descrição (opcional)</label>
            <textarea className="input text-sm w-full resize-none h-20"
                      placeholder="Detalhes adicionais..." value={form.description}
                      onChange={e => set('description', e.target.value)} />
          </div>

          {/* Recurring */}
          <div className="p-3 rounded-lg" style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
          }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.recurring}
                     onChange={e => set('recurring', e.target.checked)}
                     className="rounded" />
              <Repeat size={13} style={{
                color: form.recurring ? 'var(--accent-3)' : 'var(--text-muted)',
              }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                Repetir semanalmente
              </span>
            </label>
            {form.recurring && (
              <div className="flex items-center gap-2 mt-2 ml-5">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>por</span>
                <input type="number" min={1} max={52} value={form.recur_weeks}
                       onChange={e => set('recur_weeks', Number(e.target.value))}
                       className="input text-xs py-1 w-16" />
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>semanas</span>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="shrink-0 px-4 sm:px-6 py-3 border-t flex gap-2"
             style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose}
                  className="btn-ghost text-sm flex-1 justify-center">
            Cancelar
          </button>
          <button onClick={handleSubmit}
                  className="btn-primary text-sm flex-1 justify-center flex items-center gap-2">
            {editingEvent ? <Pencil size={14} /> : <Calendar size={14} />}
            {editingEvent ? 'Salvar' : 'Criar Evento'}
          </button>
        </div>

      </div>
    </div>
  )
}
