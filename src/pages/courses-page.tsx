import { Archive, ArrowRight, Award, Plus, Search, Send, Settings2, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CourseFormDialog } from '@/components/course-dialogs'
import { DataTable, Empty, Failed, Loading, Panel, Pill, ScreenHeader, Segmented, td } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useManagedCourses, useUpdateCourse, type CourseCard, type CourseStatus } from '@/features/lms/use-lms'
import { useOwner } from '@/features/owners/owner-context'
import { ApiError } from '@/lib/api'
import { COURSE_STATUS_META, LEVEL_COLOR } from '@/lib/course-meta'
import { coursePriceText, formatDuration, levelLabel } from '@/lib/lms'

type View = 'ALL' | CourseStatus

/** Publicar, archivar o reactivar sin salir de la lista. El servidor valida los requisitos (lección, etapa, empresa activa). */
function StatusAction({ course }: { course: CourseCard }) {
  const update = useUpdateCourse(course.id)
  const set = (status: CourseStatus, ok: string) =>
    update.mutate({ status }, { onSuccess: () => toast.success(ok), onError: (e) => toast.error(e instanceof ApiError ? (e.fieldErrors[0]?.message ?? e.message) : 'No se pudo actualizar el curso') })
  if (course.status === 'PUBLISHED') {
    return (
      <Button size="xs" variant="secondary" disabled={update.isPending} aria-label={`Archivar ${course.title}`} onClick={() => set('ARCHIVED', 'Curso archivado: ya no es visible')}>
        <Archive /> Archivar
      </Button>
    )
  }
  return (
    <Button size="xs" variant="secondary" disabled={update.isPending} aria-label={`${course.status === 'ARCHIVED' ? 'Reactivar' : 'Publicar'} ${course.title}`} onClick={() => set('PUBLISHED', 'Curso publicado')}>
      {course.status === 'ARCHIVED' ? <Undo2 /> : <Send />} {course.status === 'ARCHIVED' ? 'Reactivar' : 'Publicar'}
    </Button>
  )
}

export function CoursesPage() {
  const { owner } = useOwner()
  const navigate = useNavigate()
  const q = useManagedCourses(owner ? { ownerType: owner.type, ownerId: owner.id ?? undefined } : null)
  const [view, setView] = useState<View>('ALL')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const all = q.data?.items ?? []
  const count = (s: CourseStatus) => all.filter((c) => c.status === s).length
  const term = search.trim().toLowerCase()
  const rows = all.filter((c) => (view === 'ALL' || c.status === view) && (!term || `${c.title} ${c.instructorName ?? ''}`.toLowerCase().includes(term)))
  const canCreate = owner?.type === 'ECOSYSTEM' || owner?.status === 'ACTIVE'

  return (
    <>
      <ScreenHeader
        title="Cursos"
        description={`Cursos que ofrece ${owner?.name}. Un curso en borrador no es visible; al publicarlo aparece en el catálogo del ecosistema.`}
        actions={
          <Button onClick={() => setCreating(true)} disabled={!canCreate} title={canCreate ? undefined : 'Disponible cuando el administrador apruebe a la empresa'}>
            <Plus /> Nuevo curso
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<View>
          label="Estado"
          value={view}
          onChange={setView}
          options={[
            { value: 'ALL', label: 'Todos', count: all.length },
            { value: 'PUBLISHED', label: 'Publicados', count: count('PUBLISHED') },
            { value: 'DRAFT', label: 'Borradores', count: count('DRAFT') },
            { value: 'ARCHIVED', label: 'Archivados', count: count('ARCHIVED') },
          ]}
        />
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fur-gray-500" aria-hidden />
          <Input className="w-64 pl-9" placeholder="Buscar curso o instructor" aria-label="Buscar cursos" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Panel className="mt-3" flush>
        {q.isLoading ? (
          <div className="p-4"><Loading rows={5} /></div>
        ) : q.isError ? (
          <Failed what="los cursos" onRetry={() => void q.refetch()} />
        ) : rows.length > 0 ? (
          <DataTable head={['Curso', 'Nivel', { label: 'Lecciones', right: true }, { label: 'Duración', right: true }, { label: 'Precio', right: true }, { label: 'Inscritos', right: true }, 'Estado', { label: 'Acciones', right: true }]}>
            {rows.map((c) => {
              const st = COURSE_STATUS_META[c.status]
              return (
                <tr key={c.id}>
                  <td className={td}>
                    <Link to={`/courses/${c.id}`} className="block max-w-80 truncate font-medium text-fur-navy-900 hover:underline" title={c.title}>{c.title}</Link>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {c.instructorName ?? 'Sin instructor'}
                      {c.certificate && <span className="inline-flex items-center gap-1"><Award className="size-3" aria-hidden /> Certificado</span>}
                      {c.stages.length > 0 && <span title={c.stages.map((s) => s.name).join(', ')}>{c.stages.slice(0, 2).map((s) => s.code).join(', ')}{c.stages.length > 2 ? ` +${c.stages.length - 2}` : ''}</span>}
                    </p>
                  </td>
                  <td className={td}><Pill label={levelLabel(c.level)} color={LEVEL_COLOR[c.level]} /></td>
                  <td className={`${td} text-right tabular-nums`}>{c.lessonCount}</td>
                  <td className={`${td} text-right whitespace-nowrap tabular-nums`}>{formatDuration(c.durationMinutes)}</td>
                  <td className={`${td} text-right whitespace-nowrap tabular-nums ${c.price > 0 ? 'font-semibold text-fur-navy-900' : 'text-muted-foreground'}`}>{coursePriceText(c.price, c.currency)}</td>
                  <td className={`${td} text-right tabular-nums`}>{c.enrolledCount ?? 0}</td>
                  <td className={td}><Pill label={st.label} color={st.color} icon={st.icon} /></td>
                  <td className={`${td} text-right`}>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button size="xs" variant="outline" aria-label={`Gestionar ${c.title}`} onClick={() => navigate(`/courses/${c.id}`)}>
                        <Settings2 /> Gestionar
                      </Button>
                      <StatusAction course={c} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </DataTable>
        ) : (
          <Empty>{all.length === 0 ? <>Aún no hay cursos. <button type="button" className="font-semibold text-fur-navy-900 underline" onClick={() => setCreating(true)}>Crea el primero</button>.</> : 'No hay cursos con estos filtros.'}</Empty>
        )}
      </Panel>
      {rows.length > 0 && <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><ArrowRight className="size-3" aria-hidden /> Entra a un curso para editar sus lecciones y ver a su alumnado.</p>}

      {creating && owner && <CourseFormDialog owner={owner} onClose={() => setCreating(false)} onSaved={(id) => navigate(`/courses/${id}`)} />}
    </>
  )
}
