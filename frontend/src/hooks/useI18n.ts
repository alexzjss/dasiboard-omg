// ── Internacionalização — estrutura base pt-BR / en-US ───────────────────────
// Adicione chaves aqui e use t('chave') nos componentes.
// Para adicionar idioma: adicione um objeto em STRINGS e exporte a string ID.

export type Locale = 'pt-BR' | 'en-US'

const STORAGE_KEY = 'dasiboard-locale'

export function getLocale(): Locale {
  return (localStorage.getItem(STORAGE_KEY) as Locale) ?? 'pt-BR'
}
export function setLocale(l: Locale) {
  localStorage.setItem(STORAGE_KEY, l)
  window.location.reload() // simplest reload approach
}

// ── String dictionary ─────────────────────────────────────────────────────────
const STRINGS: Record<Locale, Record<string, string>> = {
  'pt-BR': {
    // Nav
    'nav.home':       'Início',
    'nav.kanban':     'Kanban',
    'nav.grades':     'Disciplinas',
    'nav.calendar':   'Calendário',
    'nav.entities':   'Entidades',
    'nav.docentes':   'Docentes',
    'nav.profile':    'Perfil',
    'nav.settings':   'Configurações',
    // Settings
    'settings.title':            'Configurações',
    'settings.appearance':       'Aparência',
    'settings.notifications':    'Notificações',
    'settings.privacy':          'Privacidade',
    'settings.data':             'Dados',
    'settings.shortcuts':        'Atalhos',
    'settings.language':         'Idioma',
    'settings.font_size':        'Tamanho da fonte',
    'settings.density':          'Densidade',
    'settings.density_compact':  'Compacto',
    'settings.density_comfortable': 'Confortável',
    'settings.export_data':      'Exportar meus dados',
    'settings.import_data':      'Importar backup',
    'settings.clear_data':       'Limpar dados locais',
    // Common
    'common.save':    'Salvar',
    'common.cancel':  'Cancelar',
    'common.close':   'Fechar',
    'common.delete':  'Excluir',
    'common.loading': 'Carregando…',
    'common.error':   'Erro',
    'common.success': 'Sucesso',
    'common.yes':     'Sim',
    'common.no':      'Não',
  },
  'en-US': {
    // Nav
    'nav.home':       'Home',
    'nav.kanban':     'Kanban',
    'nav.grades':     'Subjects',
    'nav.calendar':   'Calendar',
    'nav.entities':   'Entities',
    'nav.docentes':   'Faculty',
    'nav.profile':    'Profile',
    'nav.settings':   'Settings',
    // Settings
    'settings.title':            'Settings',
    'settings.appearance':       'Appearance',
    'settings.notifications':    'Notifications',
    'settings.privacy':          'Privacy',
    'settings.data':             'Data',
    'settings.shortcuts':        'Shortcuts',
    'settings.language':         'Language',
    'settings.font_size':        'Font size',
    'settings.density':          'Density',
    'settings.density_compact':  'Compact',
    'settings.density_comfortable': 'Comfortable',
    'settings.export_data':      'Export my data',
    'settings.import_data':      'Import backup',
    'settings.clear_data':       'Clear local data',
    // Common
    'common.save':    'Save',
    'common.cancel':  'Cancel',
    'common.close':   'Close',
    'common.delete':  'Delete',
    'common.loading': 'Loading…',
    'common.error':   'Error',
    'common.success': 'Success',
    'common.yes':     'Yes',
    'common.no':      'No',
  },
}

// ── Translation function ──────────────────────────────────────────────────────
const _locale: Locale = getLocale()
const _dict = STRINGS[_locale]

export function t(key: string, vars?: Record<string, string | number>): string {
  let str = _dict[key] ?? STRINGS['pt-BR'][key] ?? key
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(`{{${k}}}`, String(v))
    })
  }
  return str
}

export function useLocale() {
  const locale  = getLocale()
  const setLang = (l: Locale) => setLocale(l)
  return { locale, setLang, t }
}
