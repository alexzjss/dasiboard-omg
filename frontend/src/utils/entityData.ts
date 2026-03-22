// ── Entity overrides — fixes names and Instagram links that may be wrong in DB ──
export const ENTITY_OVERRIDES: Record<string, {
  name?: string
  short_name?: string
  instagram_url?: string
}> = {
  'dasi':            { name: 'Diretório Acadêmico de SI',           short_name: 'DASI',         instagram_url: 'https://www.instagram.com/dasiusp/' },
  'each-in-shell':   { name: 'EACH in the Shell',                   short_name: 'EITS',         instagram_url: 'https://www.instagram.com/eachintheshell/' },
  'eits':            { name: 'EACH in the Shell',                   short_name: 'EITS',         instagram_url: 'https://www.instagram.com/eachintheshell/' },
  'hype':            { name: 'HypE — Hub de Projetos e Empreend.',  short_name: 'HypE',         instagram_url: 'https://www.instagram.com/hype.usp/' },
  'conway':          { name: 'Conway Game Studio',                  short_name: 'Conway',       instagram_url: 'https://www.instagram.com/conway_usp/' },
  'codelab':         { name: 'CodeLab Leste',                       short_name: 'CodeLab',      instagram_url: 'https://www.instagram.com/uspcodelableste/' },
  'sintese':         { name: 'Síntese Jr.',                         short_name: 'Síntese Jr.',  instagram_url: 'https://www.instagram.com/sintesejr/' },
  'semana-si':       { name: 'Semana de Sistemas de Informação',    short_name: 'SSI',          instagram_url: 'https://www.instagram.com/semanadesi/' },
  'ssi':             { name: 'Semana de Sistemas de Informação',    short_name: 'SSI',          instagram_url: 'https://www.instagram.com/semanadesi/' },
  'lab-minas':       { name: 'Lab das Minas',                       short_name: 'Lab das Minas',instagram_url: 'https://www.instagram.com/labdasminas/' },
  'pet-si':          { name: 'PET-SI EACH',                         short_name: 'PET-SI',       instagram_url: 'https://www.instagram.com/petsieach/' },
  'grace':           { name: 'GrACE — Grupo de Apoio à Comunidade', short_name: 'GrACE',        instagram_url: 'https://www.instagram.com/graceusp/' },
}

/** Apply overrides to an entity object from the API */
export function applyEntityOverrides<T extends { slug: string; name?: string; short_name?: string; instagram_url?: string }>(entity: T): T {
  const ov = ENTITY_OVERRIDES[entity.slug]
  if (!ov) return entity
  return {
    ...entity,
    name:          ov.name          ?? entity.name,
    short_name:    ov.short_name    ?? entity.short_name,
    instagram_url: ov.instagram_url ?? entity.instagram_url,
  }
}
