export type ScheduleEntry = { weekday: number; startsAt: string; endsAt: string; title: string; code: string; sectionCode?: string; room: string; building: string }

export type SectionSlot = { weekday: number; startsAt: string; endsAt: string }
export type Section = { code: string; type: string; room: string; startDate: string; endDate: string; slots: SectionSlot[]; teachers: string[] }
export type Discipline = { code: string; title: string; sections: Section[] }
