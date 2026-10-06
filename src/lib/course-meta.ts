import { Archive, CheckCircle2, FilePen, type LucideIcon } from 'lucide-react'
import type { CourseStatus, RosterItem } from '@/features/lms/use-lms'

/** Estados del curso: icono + texto + color, nunca solo color (design.md §16). */
export const COURSE_STATUS_META: Record<CourseStatus, { label: string; color: string; icon: LucideIcon }> = {
  DRAFT: { label: 'Borrador', color: 'var(--fur-steel-500)', icon: FilePen },
  PUBLISHED: { label: 'Publicado', color: 'var(--fur-green-500)', icon: CheckCircle2 },
  ARCHIVED: { label: 'Archivado', color: 'var(--fur-orange-500)', icon: Archive },
}

export const LEVEL_COLOR: Record<string, string> = { BASIC: 'var(--fur-teal-500)', INTERMEDIATE: 'var(--fur-blue-500)', ADVANCED: 'var(--fur-purple-500)' }

export const ENROLLMENT_LABELS: Record<RosterItem['status'], string> = { ENROLLED: 'En curso', COMPLETED: 'Completó', DROPPED: 'Abandonó' }
export const ENROLLMENT_COLOR: Record<RosterItem['status'], string> = { ENROLLED: 'var(--fur-blue-500)', COMPLETED: 'var(--fur-green-500)', DROPPED: 'var(--fur-steel-500)' }

/** Tasa de finalización sobre quienes siguen o terminaron el curso (los que abandonaron no cuentan). null si nadie se inscribió. */
export function completionRate(items: Array<Pick<RosterItem, 'status'>>): number | null {
  const active = items.filter((i) => i.status !== 'DROPPED')
  if (active.length === 0) return null
  return Math.round((active.filter((i) => i.status === 'COMPLETED').length / active.length) * 100)
}
