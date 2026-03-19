export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

export const Errors = {
  badRequest: (msg = 'Requisição inválida', code?: string) =>
    new AppError(400, msg, code),

  unauthorized: (msg = 'Não autenticado') =>
    new AppError(401, msg, 'UNAUTHORIZED'),

  forbidden: (msg = 'Acesso negado') =>
    new AppError(403, msg, 'FORBIDDEN'),

  notFound: (resource = 'Recurso') =>
    new AppError(404, `${resource} não encontrado`),

  conflict: (msg: string) =>
    new AppError(409, msg, 'CONFLICT'),

  internal: (msg = 'Erro interno do servidor') =>
    new AppError(500, msg, 'INTERNAL_ERROR'),
}
