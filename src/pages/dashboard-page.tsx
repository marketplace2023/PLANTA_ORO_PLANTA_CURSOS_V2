import { ArrowRight, Award, BookOpen, CheckCircle2, Clock, FilePen, GraduationCap, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarRows, DataTable, Empty, Failed, Kpi, Loading, Panel, Pill, Progress, ScreenHeader, td, type BarRow } from '@/components/kit'
import { useManagedCourses, useRosters } from '@/features/lms/use-lms'
import { useOwner } from '@/features/owners/owner-context'
import { COURSE_STATUS_META, completionRate, ENROLLMENT_COLOR, ENROLLMENT_LABELS } from '@/lib/course-meta'
import { formatDate } from '@/lib/format'
import { formatDuration } from '@/lib/lms'

export function DashboardPage() {
  const { owner } = useOwner()
  const courses = useManagedCourses(owner ? { ownerType: owner.type, ownerId: owner.id ?? undefined } : null)
  const all = courses.data?.items ?? []
  const rosters = useRosters(all.map((c) => ({ id: c.id, title: c.title })))

  const published = all.filter((c) => c.status === 'PUBLISHED')
  const drafts = all.filter((c) => c.status === 'DRAFT')
  const people = new Set(rosters.rows.filter((r) => r.status !== 'DROPPED').map((r) => r.email)).size
  const completed = rosters.rows.filter((r) => r.status === 'COMPLETED').length
  const rate = completionRate(rosters.rows)
  const contentMinutes = published.reduce((s, c) => s + c.durationMinutes, 0)

  const statusRows: BarRow[] = (['PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map((s) => ({ key: s, label: COURSE_STATUS_META[s].label, value: all.filter((c) => c.status === s).length, color: COURSE_STATUS_META[s].color, icon: COURSE_STATUS_META[s].icon }))
  const top = [...all].filter((c) => (c.enrolledCount ?? 0) > 0).sort((a, b) => (b.enrolledCount ?? 0) - (a.enrolledCount ?? 0)).slice(0, 5)
  const recent = [...rosters.rows].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 6)

  return (
    <>
      <ScreenHeader title="Resumen" description={`Formación que ofrece ${owner?.name}: cursos, alumnado y finalización.`} />

      {courses.isError ? (
        <Panel><Failed what="los cursos" onRetry={() => void courses.refetch()} /></Panel>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <Kpi label="Publicados" value={courses.data ? published.length : '—'} icon={BookOpen} to="/courses" tone="ok" hint="Visibles en el catálogo" />
            <Kpi label="Borradores" value={courses.data ? drafts.length : '—'} icon={FilePen} to="/courses" tone={drafts.length > 0 ? 'warning' : 'default'} hint={drafts.length > 0 ? 'Pendientes de publicar' : 'Sin pendientes'} />
            <Kpi label="Personas inscritas" value={rosters.isLoading ? '—' : people} icon={Users} to="/students" hint="Distintas, sin abandonos" />
            <Kpi label="Completaron" value={rosters.isLoading ? '—' : completed} icon={Award} to="/students" tone="ok" hint="Cursos terminados" />
            <Kpi label="Finalización" value={rosters.isLoading || rate === null ? '—' : `${rate} %`} icon={CheckCircle2} hint={rate === null ? 'Aún no hay inscripciones' : 'Sobre quienes siguen o terminaron'} />
            <Kpi label="Contenido publicado" value={courses.data ? formatDuration(contentMinutes) : '—'} icon={Clock} hint={`${published.reduce((s, c) => s + c.lessonCount, 0)} lecciones`} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Panel title="Cursos por estado">{courses.isLoading ? <Loading rows={3} /> : <BarRows rows={statusRows} empty="Aún no hay cursos" />}</Panel>

            <Panel title="Cursos con más inscritos" className="lg:col-span-2" flush action={<Link to="/courses" className="inline-flex items-center gap-1 text-xs font-semibold text-fur-navy-900 hover:underline">Ver cursos <ArrowRight className="size-3.5" /></Link>}>
              {courses.isLoading || rosters.isLoading ? (
                <div className="p-4"><Loading rows={3} /></div>
              ) : top.length > 0 ? (
                <DataTable head={['Curso', { label: 'Inscritos', right: true }, { label: 'Completaron', right: true }, 'Finalización']}>
                  {top.map((c) => {
                    const items = rosters.rows.filter((r) => r.courseId === c.id)
                    return (
                      <tr key={c.id}>
                        <td className={td}><Link to={`/courses/${c.id}`} className="font-medium text-fur-navy-900 hover:underline">{c.title}</Link></td>
                        <td className={`${td} text-right tabular-nums`}>{c.enrolledCount}</td>
                        <td className={`${td} text-right tabular-nums`}>{items.filter((i) => i.status === 'COMPLETED').length}</td>
                        <td className={`${td} w-44`}><Progress pct={completionRate(items)} tone="ok" label={`Finalización de ${c.title}`} /></td>
                      </tr>
                    )
                  })}
                </DataTable>
              ) : (
                <Empty>Todavía nadie se ha inscrito en tus cursos.</Empty>
              )}
            </Panel>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-5">
            <Panel title="Borradores por publicar" className="lg:col-span-2" flush>
              {courses.isLoading ? (
                <div className="p-4"><Loading rows={3} /></div>
              ) : drafts.length > 0 ? (
                <ul className="divide-y divide-border">
                  {drafts.slice(0, 5).map((c) => (
                    <li key={c.id}>
                      <Link to={`/courses/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm outline-none hover:bg-muted focus-visible:bg-muted">
                        <GraduationCap className="size-4 shrink-0 text-fur-gray-500" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-fur-navy-900">{c.title}</span>
                          <span className="text-xs text-muted-foreground">{c.lessonCount} lección{c.lessonCount === 1 ? '' : 'es'} · {c.stages.length} etapa{c.stages.length === 1 ? '' : 's'}</span>
                        </span>
                        <ArrowRight className="size-4 text-fur-gray-500" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No tienes borradores pendientes.</Empty>
              )}
            </Panel>

            <Panel title="Inscripciones recientes" className="lg:col-span-3" flush>
              {rosters.isLoading ? (
                <div className="p-4"><Loading rows={3} /></div>
              ) : recent.length > 0 ? (
                <DataTable head={['Persona', 'Curso', 'Estado', 'Inscrito']}>
                  {recent.map((r) => (
                    <tr key={`${r.courseId}-${r.id}`}>
                      <td className={`${td} font-medium text-fur-navy-900`}>{r.name}</td>
                      <td className={`${td} max-w-56 truncate`} title={r.courseTitle}>{r.courseTitle}</td>
                      <td className={td}><Pill label={ENROLLMENT_LABELS[r.status]} color={ENROLLMENT_COLOR[r.status]} /></td>
                      <td className={td}>{formatDate(r.startedAt)}</td>
                    </tr>
                  ))}
                </DataTable>
              ) : (
                <Empty>Sin inscripciones todavía.</Empty>
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  )
}
