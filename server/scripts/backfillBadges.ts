// Grants automatic badges (achievements, year and course cohorts) to every existing profile:
// `npm run backfill:badges -- --yes`. It runs in production too, so it asks for --yes and never
// creates notifications. Safe to run again.
import 'dotenv/config'

const BATCH = 100

async function main() {
  if (!process.argv.includes('--yes')) {
    console.log(`Vai sincronizar as badges automáticas de todos os perfis em ${process.env.SUPABASE_URL ?? '(SUPABASE_URL não definida)'}.\nRode de novo com --yes para confirmar.`)
    process.exitCode = 1
    return
  }
  const { getClient } = await import('../lib/supabase.js')
  const { syncAutoBadges } = await import('../social/achievements.js')
  const client = getClient()
  let total = 0
  let awarded = 0
  for (let from = 0; ; from += BATCH) {
    const { data, error } = await client.from('student_profiles').select('user_id').order('user_id').range(from, from + BATCH - 1).returns<{ user_id: string }[]>()
    if (error) throw new Error(`Could not list profiles: ${error.message}`)
    if (!data?.length) break
    for (const { user_id } of data) {
      awarded += (await syncAutoBadges(user_id)).awarded.length
      total++
    }
    if (data.length < BATCH) break
  }
  console.log(`Pronto: ${total} perfis verificados, ${awarded} badges concedidas.`)
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1) })
