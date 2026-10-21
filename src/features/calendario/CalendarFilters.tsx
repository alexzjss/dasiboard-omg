import { FILTER_OPTIONS, type CalendarFilters as Filters } from './filters'

/** Toggles de filtro. O estado mora na página (que também o guarda no localStorage). */
export function CalendarFilters({ filters, onChange }: { filters: Filters; onChange: (next: Filters) => void }) {
  return (
    <div className="cal-filters" role="group" aria-label="Filtros do calendário">
      {FILTER_OPTIONS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={`cal-filter${filters[key] ? ' is-on' : ''}`}
          aria-pressed={filters[key]}
          onClick={() => onChange({ ...filters, [key]: !filters[key] })}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
