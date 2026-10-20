export function logError(context: string, error: unknown) {
  console.error(context, error instanceof Error ? error.message : error)
}
