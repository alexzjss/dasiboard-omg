// ── Modern Date and Time Picker for Events ─────────────────────────────────
import { useState } from 'react'
import { parseISO, format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, X } from 'lucide-react'

interface EventDatePickerProps {
  value: string
  onChange: (value: string) => void
  onClose: () => void
}

export default function EventDatePicker({ value, onChange, onClose }: EventDatePickerProps) {
  const currentValue = value ? parseISO(value) : new Date()
  const [month, setMonth] = useState(startOfMonth(currentValue))
  const [hour, setHour] = useState(currentValue.getHours())
  const [minute, setMinute] = useState(currentValue.getMinutes())

  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  })

  const handleDayClick = (day: Date) => {
    const newDate = new Date(day)
    newDate.setHours(hour, minute, 0, 0)
    onChange(newDate.toISOString())
  }

  const handleTimeChange = () => {
    const newDate = new Date(currentValue)
    newDate.setHours(hour, minute, 0, 0)
    onChange(newDate.toISOString())
  }

  const handleQuickTime = (h: number, m: number) => {
    setHour(h)
    setMinute(m)
    const newDate = new Date(currentValue)
    newDate.setHours(h, m, 0, 0)
    onChange(newDate.toISOString())
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in"
         style={{ background: 'rgba(0,0,0,0.5)' }}
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
           style={{ background: 'var(--bg-card)' }}>

        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between"
             style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Selecionar Data e Hora
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 transition-opacity hover:opacity-60">
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Calendar and Time Picker */}
        <div className="p-4 space-y-4">

          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <button onClick={() => setMonth(addDays(month, -32))}
                    className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                    style={{ background: 'var(--bg-elevated)' }}>
              <ChevronLeft size={16} style={{ color: 'var(--text-primary)' }} />
            </button>
            <h4 className="font-semibold text-sm flex-1 text-center"
                style={{ color: 'var(--text-primary)' }}>
              {format(month, 'MMMM yyyy', { locale: ptBR })}
            </h4>
            <button onClick={() => setMonth(addDays(month, 32))}
                    className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                    style={{ background: 'var(--bg-elevated)' }}>
              <ChevronRight size={16} style={{ color: 'var(--text-primary)' }} />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="space-y-2">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-center text-xs font-semibold"
                     style={{ color: 'var(--text-muted)' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {daysInMonth.map((day, i) => {
                const isSelected = value && isSameDay(day, currentValue)
                const isCurrentMonth = isSameMonth(day, month)

                return (
                  <button
                    key={i}
                    onClick={() => handleDayClick(day)}
                    className="h-8 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: isSelected ? 'var(--accent-1)' : isCurrentMonth ? 'var(--bg-elevated)' : 'transparent',
                      color: isSelected ? 'white' : isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                      opacity: isCurrentMonth ? 1 : 0.5,
                      cursor: 'pointer',
                    }}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time Picker */}
          <div className="p-3 rounded-lg space-y-3" style={{ background: 'var(--bg-elevated)' }}>
            <div className="flex items-center gap-2">
              <Clock size={14} style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                Hora
              </span>
            </div>

            {/* Time Inputs */}
            <div className="flex gap-2 items-center justify-between">
              <div className="flex-1">
                <label className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Hora</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={String(hour).padStart(2, '0')}
                  onChange={(e) => {
                    setHour(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))
                    handleTimeChange()
                  }}
                  className="input text-sm w-full text-center"
                />
              </div>
              <div className="pt-4">:</div>
              <div className="flex-1">
                <label className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Minuto</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={String(minute).padStart(2, '0')}
                  onChange={(e) => {
                    setMinute(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))
                    handleTimeChange()
                  }}
                  className="input text-sm w-full text-center"
                />
              </div>
            </div>

            {/* Quick time buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '08:00', h: 8, m: 0 },
                { label: '10:00', h: 10, m: 0 },
                { label: '14:00', h: 14, m: 0 },
                { label: '18:00', h: 18, m: 0 },
              ].map(({ label, h, m }) => (
                <button
                  key={label}
                  onClick={() => handleQuickTime(h, m)}
                  className="py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: hour === h && minute === m ? 'var(--accent-1)' : 'var(--bg-surface)',
                    color: hour === h && minute === m ? 'white' : 'var(--text-primary)',
                    border: `1px solid ${hour === h && minute === m ? 'var(--accent-1)' : 'var(--border)'}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Selected DateTime Display */}
          <div className="p-3 rounded-lg text-center"
               style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-1)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Selecionado:</p>
            <p className="text-sm font-semibold mt-1" style={{ color: 'var(--accent-3)' }}>
              {format(new Date(currentValue.getFullYear(), currentValue.getMonth(), currentValue.getDate(), hour, minute), 
                      "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex gap-2"
             style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose}
                  className="btn-ghost text-sm flex-1 justify-center">
            Cancelar
          </button>
          <button onClick={onClose}
                  className="btn-primary text-sm flex-1 justify-center">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
