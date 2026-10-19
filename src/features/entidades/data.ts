import logoDAsi from '../../assets/dasi.jpg'
import logoSintese from '../../assets/sintesejr.jpg'
import logoPetsi from '../../assets/petsi.jpg'
import logoHype from '../../assets/hypeusp.jpg'
import logoCodelab from '../../assets/codelableste.jpg'
import logoEachInTheShell from '../../assets/eachintheshell.jpg'
import logoConway from '../../assets/conway.jpg'
import logoCossi from '../../assets/cossi.jpg'

export type Entidade = {
  id: string
  name: string
  fullName: string
  type: string
  accentColor: string
  bgColor: string
  instagram: string
  instagramHandle: string
  logo: string
}

export const entidadesData: Entidade[] = [
  {
    id: 'dasi',
    name: 'DASI',
    fullName: 'Diretório Acadêmico de Sistemas de Informação',
    type: 'Diretório Acadêmico',
    accentColor: '#8b5cf6',
    bgColor: '#1a1030',
    instagram: 'https://www.instagram.com/dasiusp/',
    instagramHandle: '@dasiusp',
    logo: logoDAsi,
  },
  {
    id: 'sintese',
    name: 'Síntese Jr.',
    fullName: 'Empresa Júnior de Sistemas de Informação',
    type: 'Empresa Júnior',
    accentColor: '#2563eb',
    bgColor: '#0e1a2e',
    instagram: 'https://www.instagram.com/sintesejr/',
    instagramHandle: '@sintesejr',
    logo: logoSintese,
  },
  {
    id: 'petsi',
    name: 'PET-SI',
    fullName: 'Programa de Educação Tutorial de Sistemas de Informação',
    type: 'PET',
    accentColor: '#be123c',
    bgColor: '#1c0a0e',
    instagram: 'https://www.instagram.com/petsieach/',
    instagramHandle: '@petsieach',
    logo: logoPetsi,
  },
  {
    id: 'hype',
    name: 'Hype USP',
    fullName: 'Grupo de Estudos em Dados e IA',
    type: 'Grupo de Estudos',
    accentColor: '#ea7c00',
    bgColor: '#1e1000',
    instagram: 'https://www.instagram.com/hype.usp/',
    instagramHandle: '@hype.usp',
    logo: logoHype,
  },
  {
    id: 'codelab',
    name: 'CodeLab Leste',
    fullName: 'Grupo de Extensão em Tecnologia e Desenvolvimento Web',
    type: 'Grupo de Extensão',
    accentColor: '#ec4899',
    bgColor: '#1e0a18',
    instagram: 'https://www.instagram.com/uspcodelableste/',
    instagramHandle: '@uspcodelableste',
    logo: logoCodelab,
  },
  {
    id: 'eachintheshell',
    name: 'Each in The Shell',
    fullName: 'Grupo de Hacking e Cibersegurança',
    type: 'Grupo de Estudos',
    accentColor: '#f97316',
    bgColor: '#1e0e00',
    instagram: 'https://www.instagram.com/eachintheshell/',
    instagramHandle: '@eachintheshell',
    logo: logoEachInTheShell,
  },
  {
    id: 'conway',
    name: 'Conway USP',
    fullName: 'Grupo de Estudos em Gamedev',
    type: 'Grupo de Estudos',
    accentColor: '#a78bfa',
    bgColor: '#100a1e',
    instagram: 'https://www.instagram.com/conway_usp/',
    instagramHandle: '@conway_usp',
    logo: logoConway,
  },
  {
    id: 'cossi',
    name: 'COSSI',
    fullName: 'Comissão Organizadora da Semana de SI',
    type: 'Comissão',
    accentColor: '#7c3aed',
    bgColor: '#130c22',
    instagram: 'https://www.instagram.com/semanadesi/',
    instagramHandle: '@semanadesi',
    logo: logoCossi,
  },
]

export function entidadeSlug(entidade: Entidade): string {
  return entidade.name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function findEntidadeBySlug(slug: string | undefined): Entidade | undefined {
  return slug ? entidadesData.find((e) => entidadeSlug(e) === slug) : undefined
}
