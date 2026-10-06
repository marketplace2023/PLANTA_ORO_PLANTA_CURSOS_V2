import { formatMoney } from './format'

export const LEVELS = ['BASIC', 'INTERMEDIATE', 'ADVANCED'] as const
export const LEVEL_LABELS: Record<string, string> = { BASIC: 'Básico', INTERMEDIATE: 'Intermedio', ADVANCED: 'Avanzado' }
export const COURSE_STATUS_LABELS: Record<string, string> = { DRAFT: 'Borrador', PUBLISHED: 'Publicado', ARCHIVED: 'Archivado' }
export const OWNER_LABELS: Record<string, string> = { ECOSYSTEM: 'Ecosistema FUR', PROVIDER: 'Proveedor', CONTRACTOR: 'Contratista' }

export const levelLabel = (l: string) => LEVEL_LABELS[l] ?? l

/** 95 → "1 h 35 min"; 40 → "40 min"; 0 → "—" (curso sin lecciones con duración). */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** "Gratis" si el curso no tiene precio; si no, el precio con su moneda ("USD 120.00"). */
export const coursePriceText = (price: number, currency: string) => (price > 0 ? formatMoney(price, currency) : 'Gratis')

/** Precio escrito por el facilitador: vacío = gratuito; si no, número ≥ 0 con hasta 2 decimales (como valida el servidor). */
export function parsePrice(text: string): { ok: true; value: number } | { ok: false; error: string } {
  const t = text.trim()
  if (t === '') return { ok: true, value: 0 }
  const n = Number(t)
  if (!Number.isFinite(n)) return { ok: false, error: 'Indica un número.' }
  if (n < 0) return { ok: false, error: 'El precio no puede ser negativo.' }
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) return { ok: false, error: 'Máximo 2 decimales.' }
  return { ok: true, value: n }
}

export const CURRENCIES = ['USD', 'PEN', 'CLP', 'ARS', 'EUR'] as const
