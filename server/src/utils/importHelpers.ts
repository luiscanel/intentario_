/**
 * Convierte cualquier valor a string limpio (sin espacios extremos).
 * Retorna '' si el valor es null/undefined/vacío.
 */
export function str(v: any): string {
  if (v === null || v === undefined) return ''
  const trimmed = String(v).trim()
  return trimmed || ''
}

/**
 * Convierte cualquier valor a número entero.
 * Elimina comas y caracteres no numéricos. Retorna 0 si no es parseable.
 */
export function num(v: any): number {
  if (v === null || v === undefined) return 0
  const parsed = parseInt(String(v).replace(/,/g, '').replace(/[^\d]/g, ''))
  return isNaN(parsed) ? 0 : parsed
}
