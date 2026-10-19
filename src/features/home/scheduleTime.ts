import type { ScheduleEntry } from './types'

/** A linha do tempo do dia vai de 07h a 23h. */
export const DAY_START = 7 * 60
export const DAY_END = 23 * 60

export type Slot = ScheduleEntry & { start: number; end: number }

export function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim())
  if (!match) return null
  const h = Number(match[1]), m = Number(match[2])
  return h > 23 || m > 59 ? null : h * 60 + m
}

export function minutesOf(date: Date) {
  return date.getHours() * 60 + date.getMinutes()
}

export function formatMinutes(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Aulas com horário válido, ordenadas por início. */
export function toSlots(entries: ScheduleEntry[]): Slot[] {
  const slots: Slot[] = []
  for (const entry of entries) {
    const start = toMinutes(entry.startsAt)
    const end = toMinutes(entry.endsAt)
    if (start === null || end === null || end <= start) continue
    slots.push({ ...entry, start, end })
  }
  return slots.sort((a, b) => a.start - b.start)
}

export function weekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7
}

export function roomLabel(entry: ScheduleEntry) {
  return [entry.building, entry.room].filter(Boolean).join(' ')
}

export type LaneSlot = Slot & { lane: number; lanes: number }

/** Distribui aulas que se sobrepõem em faixas lado a lado (conflitos de horário). */
export function assignLanes(slots: Slot[]): LaneSlot[] {
  const result: LaneSlot[] = []
  let cluster: Slot[] = []
  let clusterEnd = -1
  const flush = () => {
    const laneEnds: number[] = []
    const placed = cluster.map((slot) => {
      let lane = laneEnds.findIndex((end) => end <= slot.start)
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(slot.end) } else laneEnds[lane] = slot.end
      return { ...slot, lane, lanes: 0 }
    })
    for (const item of placed) result.push({ ...item, lanes: laneEnds.length })
    cluster = []
  }
  for (const slot of slots) {
    if (cluster.length && slot.start >= clusterEnd) flush()
    cluster.push(slot)
    clusterEnd = cluster.length === 1 ? slot.end : Math.max(clusterEnd, slot.end)
  }
  if (cluster.length) flush()
  return result
}
