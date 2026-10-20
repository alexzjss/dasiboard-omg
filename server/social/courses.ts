import type { SupabaseClient } from '@supabase/supabase-js'

export type CourseRow = { code: string; title: string }

// Only code and title are kept (never times or rooms).
export function extractCourses(entries: ReadonlyArray<{ code?: unknown; title?: unknown }>): CourseRow[] {
  const byCode = new Map<string, CourseRow>()
  for (const entry of entries) {
    const code = typeof entry.code === 'string' ? entry.code.trim().toUpperCase().slice(0, 20) : ''
    if (!code || byCode.has(code)) continue
    const title = typeof entry.title === 'string' ? entry.title.trim().slice(0, 200) : ''
    byCode.set(code, { code, title: title || code })
  }
  return [...byCode.values()]
}

export async function syncUserCourses(client: SupabaseClient, userId: string, courses: CourseRow[]) {
  const { data: existing, error: readError } = await client.from('user_courses').select('code').eq('user_id', userId)
  if (readError) throw new Error(`Could not read user_courses: ${readError.message}`)
  const keep = new Set(courses.map((course) => course.code))
  const stale = (existing ?? []).map((row: { code: string }) => row.code).filter((code) => !keep.has(code))
  if (courses.length > 0) {
    const { error } = await client.from('user_courses').upsert(courses.map((course) => ({ user_id: userId, ...course })), { onConflict: 'user_id,code' })
    if (error) throw new Error(`Could not upsert user_courses: ${error.message}`)
  }
  if (stale.length > 0) {
    const { error } = await client.from('user_courses').delete().eq('user_id', userId).in('code', stale)
    if (error) throw new Error(`Could not prune user_courses: ${error.message}`)
  }
}
