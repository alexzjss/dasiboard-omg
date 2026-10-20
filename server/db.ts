import { getClient } from './lib/supabase.js'
import { logError } from './lib/errors.js'
import { ensureProfileWithHandle, supabaseHandleStore } from './social/handles.js'
import { extractCourses, syncUserCourses } from './social/courses.js'

export { getClient }

type StoredUser = {
  id: string
  google_sub: string
  email: string
  name: string
  picture: string | null
}

export type ScheduleEntry = {
  weekday: number
  startsAt: string
  endsAt: string
  title: string
  code: string
  sectionCode?: string
  room: string
  building: string
}

export async function upsertUser(user: { sub: string; email: string; name: string; picture?: string }) {
  const { data, error } = await getClient()
    .from('users')
    .upsert({
      google_sub: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'google_sub' })
    .select('id, google_sub, email, name, picture')
    .single<StoredUser>()

  if (error) throw new Error(`Could not save user: ${error.message}`)
  await ensureProfileWithHandle(supabaseHandleStore(getClient()), data.id, data.email)
  return data
}

export async function getSchedule(googleSub: string) {
  const { data: user, error: userError } = await getClient()
    .from('users').select('id').eq('google_sub', googleSub).single<{ id: string }>()
  if (userError) throw new Error(`Could not find user: ${userError.message}`)
  const { data, error } = await getClient()
    .from('schedule_imports').select('entries, imported_at').eq('user_id', user.id).maybeSingle<{ entries: ScheduleEntry[]; imported_at: string }>()
  if (error) throw new Error(`Could not load schedule: ${error.message}`)
  return { entries: data?.entries || [], importedAt: data?.imported_at || null }
}

export async function saveSchedule(googleSub: string, entries: ScheduleEntry[]) {
  const { data: user, error: userError } = await getClient()
    .from('users').select('id').eq('google_sub', googleSub).single<{ id: string }>()
  if (userError) throw new Error(`Could not find user: ${userError.message}`)
  const { data, error } = await getClient()
    .from('schedule_imports')
    .upsert({ user_id: user.id, source: 'jupiterweb', entries, imported_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select('entries, imported_at').single<{ entries: ScheduleEntry[]; imported_at: string }>()
  if (error) throw new Error(`Could not save schedule: ${error.message}`)
  // user_courses is derived data (only code and title, never times or rooms); best effort.
  try { await syncUserCourses(getClient(), user.id, extractCourses(entries)) }
  catch (syncError) { logError('Syncing user_courses failed', syncError) }
  return { entries: data.entries, importedAt: data.imported_at }
}

export async function deleteSchedule(googleSub: string) {
  const { data: user, error: userError } = await getClient()
    .from('users').select('id').eq('google_sub', googleSub).single<{ id: string }>()
  if (userError) throw new Error(`Could not find user: ${userError.message}`)
  const { error } = await getClient().from('schedule_imports').delete().eq('user_id', user.id)
  if (error) throw new Error(`Could not delete schedule: ${error.message}`)
  try { await syncUserCourses(getClient(), user.id, []) }
  catch (syncError) { logError('Clearing user_courses failed', syncError) }
}
