import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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
  room: string
  building: string
}

let client: SupabaseClient | null = null

function getClient() {
  if (client) return client
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }
  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return client
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
  return { entries: data.entries, importedAt: data.imported_at }
}
