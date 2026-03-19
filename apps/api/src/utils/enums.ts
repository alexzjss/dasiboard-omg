// Enums locais — espelham os enums do schema.prisma
// Usados no lugar de importar diretamente de '@prisma/client',
// pois o prisma generate não roda durante o build do buildpack.

export enum EventType {
  prova = 'prova',
  entrega = 'entrega',
  evento = 'evento',
  deadline = 'deadline',
  apresentacao = 'apresentacao',
}

export enum EventStatus {
  published = 'published',
  pending = 'pending',
  rejected = 'rejected',
}

export enum KanbanColumn {
  todo = 'todo',
  doing = 'doing',
  done = 'done',
}

export enum KanbanTag {
  prova = 'prova',
  entrega = 'entrega',
  leitura = 'leitura',
  projeto = 'projeto',
  pessoal = 'pessoal',
}

export enum MaterialType {
  livro = 'livro',
  artigo = 'artigo',
  video = 'video',
  curso = 'curso',
  link = 'link',
  pdf = 'pdf',
}

export enum ChallengeLanguage {
  javascript = 'javascript',
  python = 'python',
  c = 'c',
}
