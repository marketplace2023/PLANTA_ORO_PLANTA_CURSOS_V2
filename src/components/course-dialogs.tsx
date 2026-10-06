import { useState } from 'react'
import { toast } from 'sonner'
import { CheckGroup } from '@/components/check-group'
import { FormDialog, type Values } from '@/components/form-dialog'
import { useStageMasters } from '@/features/catalog/use-catalog'
import { useAddLesson, useCreateCourse, useUpdateCourse, useUpdateLesson, type CourseCard, type CourseDetail, type CourseLevel, type Lesson } from '@/features/lms/use-lms'
import type { Owner } from '@/features/owners/owner-context'
import { errorMessage } from '@/lib/forms'
import { CURRENCIES, LEVELS, LEVEL_LABELS, parsePrice } from '@/lib/lms'

const opt = (v: string | boolean | undefined) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const nul = (v: string | boolean | undefined) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** Alta o edición de los datos generales de un curso. Se crea como borrador; se publica cuando está listo. */
export function CourseFormDialog({ owner, course, onClose, onSaved }: { owner: Owner; course?: CourseCard | CourseDetail; onClose: () => void; onSaved?: (id: string) => void }) {
  const create = useCreateCourse()
  const update = useUpdateCourse(course?.id ?? '')
  const stages = useStageMasters()
  const [stageCodes, setStageCodes] = useState<string[]>(course?.stages.map((s) => s.code) ?? [])
  const [priceError, setPriceError] = useState<string | null>(null)
  const m = course ? update : create

  function submit(v: Values) {
    const price = parsePrice(String(v.price))
    if (!price.ok) return setPriceError(price.error)
    setPriceError(null)
    const done = (id: string) => () => {
      toast.success(course ? 'Curso actualizado' : 'Curso creado como borrador')
      onSaved?.(id)
      onClose()
    }
    if (course) {
      update.mutate(
        { title: String(v.title).trim(), description: nul(v.description), level: v.level as CourseLevel, instructorName: nul(v.instructorName), certificate: !!v.certificate, price: price.value, currency: String(v.currency), stageCodes },
        { onSuccess: done(course.id) },
      )
    } else {
      create.mutate(
        {
          ownerType: owner.type,
          ownerId: owner.id ?? undefined,
          title: String(v.title).trim(),
          description: opt(v.description),
          level: v.level as CourseLevel,
          instructorName: opt(v.instructorName),
          certificate: !!v.certificate,
          price: price.value,
          currency: String(v.currency),
          stageCodes,
        },
        { onSuccess: (c) => done(c.id)() },
      )
    }
  }

  return (
    <FormDialog
      title={course ? 'Editar curso' : 'Nuevo curso'}
      description={course ? undefined : `Lo ofrecerá ${owner.name}. Se crea como borrador: agrega lecciones y etapas para poder publicarlo.`}
      fields={[
        { name: 'title', label: 'Título del curso', required: true, wide: true },
        { name: 'level', label: 'Nivel', type: 'select', required: true, options: LEVELS.map((l) => ({ value: l, label: LEVEL_LABELS[l] })) },
        { name: 'instructorName', label: 'Instructor', placeholder: 'Nombre de quien lo dicta' },
        { name: 'price', label: 'Precio del curso', type: 'number', min: 0, step: '0.01', placeholder: '0.00', hint: 'Es el precio que verán en la web. Déjalo vacío o en 0 para ofrecerlo gratis.' },
        { name: 'currency', label: 'Moneda', type: 'select', required: true, options: CURRENCIES.map((c) => ({ value: c, label: c })) },
        { name: 'certificate', label: 'Emite certificado verificable al completarlo', type: 'checkbox', wide: true },
        { name: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Qué aprenderá quien lo tome' },
      ]}
      initial={
        course
          ? { title: course.title, level: course.level, instructorName: course.instructorName ?? '', certificate: course.certificate, price: course.price > 0 ? String(course.price) : '', currency: course.currency, description: course.description ?? '' }
          : { level: 'BASIC', certificate: true, currency: 'USD' }
      }
      submitLabel={course ? 'Guardar cambios' : 'Crear curso'}
      busy={m.isPending}
      error={priceError ?? errorMessage(m.error)}
      extra={
        <CheckGroup
          legend="Etapas relacionadas"
          options={(stages.data ?? []).map((s) => ({ value: s.code, label: `${s.code} · ${s.name}` }))}
          value={stageCodes}
          onChange={setStageCodes}
          help="Para publicar el curso necesitas al menos una etapa."
        />
      }
      onClose={onClose}
      onSubmit={submit}
    />
  )
}

/** Alta o edición de una lección. El contenido es texto plano (nunca HTML) y el video un enlace externo http(s). */
export function LessonFormDialog({ courseId, lesson, onClose }: { courseId: string; lesson?: Lesson; onClose: () => void }) {
  const add = useAddLesson(courseId)
  const update = useUpdateLesson(courseId)
  const m = lesson ? update : add

  function submit(v: Values) {
    const minutes = String(v.durationMinutes).trim() === '' ? 0 : Number(v.durationMinutes)
    const done = { onSuccess: () => { toast.success(lesson ? 'Lección actualizada' : 'Lección agregada'); onClose() } }
    if (lesson) update.mutate({ id: lesson.id, title: String(v.title).trim(), durationMinutes: minutes, videoUrl: nul(v.videoUrl), content: nul(v.content) }, done)
    else add.mutate({ title: String(v.title).trim(), durationMinutes: minutes, videoUrl: opt(v.videoUrl), content: opt(v.content) }, done)
  }

  return (
    <FormDialog
      title={lesson ? 'Editar lección' : 'Nueva lección'}
      fields={[
        { name: 'title', label: 'Título de la lección', required: true, wide: true },
        { name: 'durationMinutes', label: 'Duración (minutos)', type: 'number', min: 0, step: '1', hint: 'Suma a la duración total del curso.' },
        { name: 'videoUrl', label: 'Video (enlace)', type: 'url', placeholder: 'https://…', hint: 'Se abre en otra pestaña; no se incrusta.' },
        { name: 'content', label: 'Contenido', type: 'textarea', placeholder: 'Texto de la lección (solo texto plano)' },
      ]}
      initial={lesson ? { title: lesson.title, durationMinutes: String(lesson.durationMinutes), videoUrl: lesson.videoUrl ?? '', content: lesson.content ?? '' } : { durationMinutes: '10' }}
      submitLabel={lesson ? 'Guardar cambios' : 'Agregar lección'}
      busy={m.isPending}
      error={errorMessage(m.error)}
      onClose={onClose}
      onSubmit={submit}
    />
  )
}
