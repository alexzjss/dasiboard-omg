// Regenerates src/lib/techIcons.generated.ts with only the simple-icons paths used by TECHNOLOGIES:
// `npm run gen:tech-icons`. Run it after adding or changing a technology.
import { readFileSync, writeFileSync } from 'node:fs'
import * as icons from 'simple-icons'

const source = readFileSync('src/lib/technologies.ts', 'utf8')
const entries = [...source.matchAll(/\{ id: '([^']+)',[^}]*icon: '(si[A-Za-z0-9]*)' \}/g)]
const lib = icons as unknown as Record<string, { path?: string } | undefined>

const lines: string[] = []
for (const [, id, name] of entries) {
  const path = lib[name]?.path
  if (!path) throw new Error(`Ícone ${name} (${id}) não existe no simple-icons`)
  lines.push(`  ${JSON.stringify(id)}: ${JSON.stringify(path)},`)
}
writeFileSync('src/lib/techIcons.generated.ts',
  `// Gerado por server/scripts/genTechIcons.ts (npm run gen:tech-icons). Não edite à mão.\nexport const TECH_ICONS: Record<string, string> = {\n${lines.join('\n')}\n}\n`)
console.log(`${lines.length} ícones gerados`)
