import { ArrowDown, ArrowLeft, ArrowUp, Archive, Award, CheckCircle2, Circle, ExternalLink, Pencil, Plus, Send, Trash2, Undo2, Video } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CourseFormDialog, LessonFormDialog } from '@/components/course-dialogs'
import { DataTable, Empty, Failed, Kpi, Loading, Panel, Pill, Progress, ScreenHeader, Segmented, td } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCourse, useDeleteLesson, useRoster, useUpdateCourse, useUpdateLesson, type CourseDetail, type CourseStatus, type Lesson } from '@/features/lms/use-lms'
import { useOwner } from '@/features/owners/owner-context'
import { ApiError } from '@/lib/api'
import { COURSE_STATUS_META, completionRate, ENROLLMENT_COLOR, ENROLLMENT_LABELS, LEVEL_COLOR } from '@/lib/course-meta'
import { formatDate } from '@/lib/format'
import { coursePriceText, formatDuration, levelLabel } from '@/lib/lms'

type Tab = 'lessons' | 'students'
const errorText = (e: unknown) => (e instanceof ApiError ? (e.fieldErrors[0]?.message ?? e.message) : 'No se pudo completar la acción')

function Lessons({ course }: { course: CourseDetail }) {
  const update = useUpdateLesson(course.id)
  const remove = useDeleteLesson(course.id)
  const [editing, setEditing] = useState<Lesson | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Lesson | null>(null)
  const sorted = [...course.lessons].sort((a, b) => a.position - b.position)

  const move = (l: Lesson, to: number) => update.mutate({ id: l.id, position: to }, { onError: (e) => toast.error(errorText(e)) })

  return (
    <>
      <Panel
        title="Lecciones"
        subtitle={`${sorted.length} lección${sorted.length === 1 ? '' : 'es'} · ${formatDuration(course.durationMinutes)} en total`}
        flush
        action={<Button size="xs" onClick={() => setEditing('new')}><Plus /> Nueva lección</Button>}
      >
        {sorted.length > 0 ? (
          <DataTable head={['#', 'Lección', 'Video', { label: 'Duración', right: true }, { label: 'Acciones', right: true }]}>
            {sorted.map((l, i) => (
              <tr key={l.id}>
                <td className={`${td} tabular-nums`}>{i + 1}</td>
                <td className={td}>
                  <p className="max-w-96 truncate font-medium text-fur-navy-900" title={l.title}>{l.title}</p>
                  <p className="max-w-96 truncate text-xs text-muted-foreground">{l.content ? l.content.slice(0, 90) : 'Sin contenido de texto'}</p>
                </td>
                <td className={td}>
                  {l.videoUrl ? (
                    <a href={l.videoUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs font-semibold text-fur-navy-900 hover:underline"><Video className="size-3.5" aria-hidden /> Ver <ExternalLink className="size-3" aria-hidden /></a>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className={`${td} text-right tabular-nums`}>{formatDuration(l.durationMinutes)}</td>
                <td className={`${td} text-right`}>
                  <div className="flex justify-end gap-1">
                    <Button size="icon-sm" variant="ghost" aria-label={`Subir ${l.title}`} disabled={i === 0 || update.isPending} onClick={() => move(l, i - 1)}><ArrowUp /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Bajar ${l.title}`} disabled={i === sorted.length - 1 || update.isPending} onClick={() => move(l, i + 1)}><ArrowDown /></Button>
                    <Button size="xs" variant="outline" aria-label={`Editar ${l.title}`} onClick={() => setEditing(l)}><Pencil /> Editar</Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Eliminar ${l.title}`} onClick={() => { remove.reset(); setDeleting(l) }}><Trash2 /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <Empty>Este curso aún no tiene lecciones. Agrega la primera para poder publicarlo.</Empty>
        )}
      </Panel>

      {editing && <LessonFormDialog courseId={course.id} lesson={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <Dialog open onOpenChange={(o) => !o && setDeleting(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar lección</DialogTitle>
              <DialogDescription>«{deleting.title}» se eliminará del curso. Si algún alumno ya la completó, el servidor no lo permitirá.</DialogDescription>
            </DialogHeader>
            {remove.isError && <p role="alert" className="text-sm text-fur-red-500">{errorText(remove.error)}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
              <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate(deleting.id, { onSuccess: () => { toast.success('Lección eliminada'); setDeleting(null) } })}>
                {remove.isPending ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function Students({ courseId }: { courseId: string }) {
  const roster = useRoster(courseId)
  const items = roster.data?.items ?? []
  const rate = completionRate(items)
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Inscritos" value={roster.data ? items.filter((i) => i.status !== 'DROPPED').length : '—'} icon={CheckCircle2} hint="Sin contar a quienes abandonaron" />
        <Kpi label="Completaron" value={roster.data?.completed ?? '—'} icon={Award} tone="ok" />
        <Kpi label="Tasa de finalización" value={rate === null ? '—' : `${rate} %`} icon={CheckCircle2} hint={rate === null ? 'Aún no hay inscritos' : 'Sobre quienes siguen o terminaron'} />
      </div>
      <Panel className="mt-4" title="Alumnado" flush>
        {roster.isLoading ? (
          <div className="p-4"><Loading rows={4} /></div>
        ) : roster.isError ? (
          <Failed what="el alumnado" onRetry={() => void roster.refetch()} />
        ) : items.length > 0 ? (
          <DataTable head={['Persona', 'Estado', 'Avance', 'Inscrito', 'Completó']}>
            {items.map((s) => (
              <tr key={s.id}>
                <td className={td}><p className="font-medium text-fur-navy-900">{s.name}</p><p className="text-xs text-muted-foreground">{s.email}</p></td>
                <td className={td}><Pill label={ENROLLMENT_LABELS[s.status]} color={ENROLLMENT_COLOR[s.status]} /></td>
                <td className={`${td} w-48`}><Progress pct={s.progressPercent} tone={s.status === 'COMPLETED' ? 'ok' : 'default'} label={`Avance de ${s.name}`} /></td>
                <td className={td}>{formatDate(s.startedAt)}</td>
                <td className={td}>{formatDate(s.completedAt)}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <Empty>Nadie se ha inscrito todavía.</Empty>
        )}
      </Panel>
    </>
  )
}

/** Lo que el servidor exige para publicar, a la vista: así se sabe qué falta antes de intentarlo. */
function PublishChecklist({ course, orgActive }: { course: CourseDetail; orgActive: boolean }) {
  const items = [
    { label: 'Al menos una lección', done: course.lessons.length > 0 },
    { label: 'Al menos una etapa relacionada', done: course.stages.length > 0 },
    { label: 'La empresa está activa', done: orgActive },
  ]
  return (
    <Panel title="Para publicar este curso" subtitle={items.every((i) => i.done) ? 'Todo listo: ya puedes publicarlo.' : 'Completa lo que falta.'} className="mb-4">
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2">
            {i.done ? <CheckCircle2 className="size-4 text-fur-green-500" aria-hidden /> : <Circle className="size-4 text-fur-gray-300" aria-hidden />}
            <span className={i.done ? 'text-fur-gray-800' : 'text-muted-foreground'}>{i.label}</span>
            <span className="sr-only">{i.done ? 'listo' : 'pendiente'}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export function CourseDetailPage() {
  const { id = '' } = useParams()
  const { owner } = useOwner()
  const q = useCourse(id)
  const update = useUpdateCourse(id)
  const [tab, setTab] = useState<Tab>('lessons')
  const [editing, setEditing] = useState(false)
  const c = q.data

  if (q.isLoading) return <Loading rows={5} />
  if (q.isError || !c) {
    return (
      <Panel>
        <Empty>
          No se encontró el curso o no tienes acceso a él.
          <Button asChild variant="secondary" size="sm"><Link to="/courses"><ArrowLeft /> Volver a cursos</Link></Button>
        </Empty>
      </Panel>
    )
  }
  if (!c.canManage) {
    return (
      <Panel>
        <Empty>
          Solo los miembros de la empresa propietaria y el administrador del ecosistema gestionan este curso.
          <Button asChild variant="secondary" size="sm"><Link to="/courses"><ArrowLeft /> Volver a cursos</Link></Button>
        </Empty>
      </Panel>
    )
  }

  const st = COURSE_STATUS_META[c.status]
  const setStatus = (status: CourseStatus, ok: string) => update.mutate({ status }, { onSuccess: () => toast.success(ok), onError: (e) => toast.error(errorText(e)) })

  return (
    <>
      <ScreenHeader
        title={c.title}
        description={`${c.owner.name} · ${levelLabel(c.level)} · ${formatDuration(c.durationMinutes)}${c.instructorName ? ` · ${c.instructorName}` : ''}`}
        actions={
          <>
            <Pill label={st.label} color={st.color} icon={st.icon} />
            <Pill label={coursePriceText(c.price, c.currency)} color={c.price > 0 ? 'var(--fur-navy-700)' : 'var(--fur-green-500)'} />
            {c.certificate && <Pill label="Emite certificado" color="var(--fur-gold-600)" icon={Award} />}
            <Pill label={levelLabel(c.level)} color={LEVEL_COLOR[c.level]} />
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil /> Editar datos</Button>
            {c.status === 'PUBLISHED' ? (
              <Button size="sm" variant="secondary" disabled={update.isPending} onClick={() => setStatus('ARCHIVED', 'Curso archivado: ya no es visible')}><Archive /> Archivar</Button>
            ) : (
              <Button size="sm" disabled={update.isPending} onClick={() => setStatus('PUBLISHED', 'Curso publicado')}>{c.status === 'ARCHIVED' ? <Undo2 /> : <Send />} {c.status === 'ARCHIVED' ? 'Reactivar' : 'Publicar'}</Button>
            )}
            <Button asChild variant="ghost" size="sm"><Link to="/courses"><ArrowLeft /> Cursos</Link></Button>
          </>
        }
      />

      {c.description && <p className="mb-4 max-w-3xl text-sm text-fur-gray-800">{c.description}</p>}
      {c.status !== 'PUBLISHED' && <PublishChecklist course={c} orgActive={c.owner.type === 'ECOSYSTEM' || owner?.status === 'ACTIVE' || owner?.id !== c.owner.id} />}

      <Segmented<Tab>
        label="Secciones del curso"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'lessons', label: 'Lecciones', count: c.lessons.length },
          { value: 'students', label: 'Alumnado' },
        ]}
      />
      <div className="mt-3">{tab === 'lessons' ? <Lessons course={c} /> : <Students courseId={c.id} />}</div>

      {editing && owner && <CourseFormDialog owner={owner} course={c} onClose={() => setEditing(false)} />}
    </>
  )
}
