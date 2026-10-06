import { Search, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, Empty, Failed, Kpi, Loading, Panel, Pill, Progress, ScreenHeader, Segmented, td } from '@/components/kit'
import { Input } from '@/components/ui/input'
import { useManagedCourses, useRosters } from '@/features/lms/use-lms'
import { useOwner } from '@/features/owners/owner-context'
import { selectClass } from '@/lib/forms'
import { completionRate, ENROLLMENT_COLOR, ENROLLMENT_LABELS } from '@/lib/course-meta'
import { formatDate } from '@/lib/format'

type View = 'ALL' | 'ENROLLED' | 'COMPLETED' | 'DROPPED'

/** Alumnado de todos los cursos de la empresa elegida: quién está inscrito, cuánto avanzó y quién completó. */
export function StudentsPage() {
  const { owner } = useOwner()
  const courses = useManagedCourses(owner ? { ownerType: owner.type, ownerId: owner.id ?? undefined } : null)
  const list = (courses.data?.items ?? []).map((c) => ({ id: c.id, title: c.title }))
  const rosters = useRosters(list)
  const [view, setView] = useState<View>('ALL')
  const [courseId, setCourseId] = useState('')
  const [search, setSearch] = useState('')

  const term = search.trim().toLowerCase()
  const all = rosters.rows
  const count = (s: Exclude<View, 'ALL'>) => all.filter((r) => r.status === s).length
  const rows = all
    .filter((r) => (view === 'ALL' || r.status === view) && (!courseId || r.courseId === courseId) && (!term || `${r.name} ${r.email}`.toLowerCase().includes(term)))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const people = new Set(all.filter((r) => r.status !== 'DROPPED').map((r) => r.email)).size
  const rate = completionRate(all)

  return (
    <>
      <ScreenHeader title="Alumnado" description={`Personas inscritas en los cursos de ${owner?.name}.`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Personas" value={rosters.isLoading ? '—' : people} icon={Users} hint="Distintas, sin contar abandonos" />
        <Kpi label="En curso" value={rosters.isLoading ? '—' : count('ENROLLED')} icon={Users} />
        <Kpi label="Completaron" value={rosters.isLoading ? '—' : count('COMPLETED')} icon={Users} tone="ok" />
        <Kpi label="Tasa de finalización" value={rosters.isLoading || rate === null ? '—' : `${rate} %`} icon={Users} hint={rate === null ? 'Aún no hay inscripciones' : 'Sobre quienes siguen o terminaron'} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Segmented<View>
          label="Estado de la inscripción"
          value={view}
          onChange={setView}
          options={[
            { value: 'ALL', label: 'Todos', count: all.length },
            { value: 'ENROLLED', label: 'En curso', count: count('ENROLLED') },
            { value: 'COMPLETED', label: 'Completaron', count: count('COMPLETED') },
            { value: 'DROPPED', label: 'Abandonaron', count: count('DROPPED') },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select className={`${selectClass} w-60`} aria-label="Curso" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Todos los cursos</option>
            {list.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fur-gray-500" aria-hidden />
            <Input className="w-60 pl-9" placeholder="Buscar persona" aria-label="Buscar personas" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <Panel className="mt-3" flush>
        {courses.isLoading || rosters.isLoading ? (
          <div className="p-4"><Loading rows={5} /></div>
        ) : courses.isError || rosters.isError ? (
          <Failed what="el alumnado" onRetry={() => { void courses.refetch() }} />
        ) : rows.length > 0 ? (
          <DataTable head={['Persona', 'Curso', 'Estado', 'Avance', 'Inscrito', 'Completó']}>
            {rows.map((r) => (
              <tr key={`${r.courseId}-${r.id}`}>
                <td className={td}><p className="font-medium text-fur-navy-900">{r.name}</p><p className="text-xs text-muted-foreground">{r.email}</p></td>
                <td className={td}><Link to={`/courses/${r.courseId}`} className="max-w-60 truncate hover:underline" title={r.courseTitle}>{r.courseTitle}</Link></td>
                <td className={td}><Pill label={ENROLLMENT_LABELS[r.status]} color={ENROLLMENT_COLOR[r.status]} /></td>
                <td className={`${td} w-44`}><Progress pct={r.progressPercent} tone={r.status === 'COMPLETED' ? 'ok' : 'default'} label={`Avance de ${r.name} en ${r.courseTitle}`} /></td>
                <td className={td}>{formatDate(r.startedAt)}</td>
                <td className={td}>{formatDate(r.completedAt)}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <Empty>{all.length === 0 ? 'Todavía nadie se ha inscrito en tus cursos.' : 'No hay inscripciones con estos filtros.'}</Empty>
        )}
      </Panel>
    </>
  )
}
