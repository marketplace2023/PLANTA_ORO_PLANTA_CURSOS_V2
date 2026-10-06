import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, jsonBody } from '@/lib/api'

export type Tag = { code: string; name: string }
export type CourseLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type OwnerType = 'ECOSYSTEM' | 'PROVIDER' | 'CONTRACTOR'
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number }

export type CourseCard = {
  id: string
  title: string
  description: string | null
  level: CourseLevel
  durationMinutes: number
  certificate: boolean
  /** Precio que fija quien ofrece el curso; 0 = gratuito. */
  price: number
  currency: string
  instructorName: string | null
  status: CourseStatus
  owner: { type: OwnerType; id: string | null; name: string; verified: boolean }
  stages: Tag[]
  lessonCount: number
  createdAt: string
  /** Solo en el listado de gestión: inscritos sin contar a quienes abandonaron. */
  enrolledCount?: number
}

export type Lesson = {
  id: string
  position: number
  title: string
  durationMinutes: number
  content: string | null
  videoUrl: string | null
}

export type CourseDetail = Omit<CourseCard, 'enrolledCount'> & { canManage: boolean; lessons: Lesson[] }

export type RosterItem = { id: string; name: string; email: string; status: 'ENROLLED' | 'COMPLETED' | 'DROPPED'; progressPercent: number; startedAt: string; completedAt: string | null }
export type Roster = { total: number; completed: number; items: RosterItem[] }

export type Owner = { ownerType: OwnerType; ownerId?: string }

const toQuery = (params: Record<string, string | number | undefined>) => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

// Todo cuelga de ['lms', …]: los cursos son globales y se invalidan juntos.
export const useManagedCourses = (owner: Owner | null) =>
  useQuery({
    queryKey: ['lms', 'manage', owner],
    queryFn: () => api<Page<CourseCard>>(`/courses/manage${toQuery({ ownerType: owner!.ownerType, ownerId: owner!.ownerId, pageSize: 100 })}`),
    enabled: !!owner,
    retry: false,
  })

export const useCourse = (id: string | undefined) => useQuery({ queryKey: ['lms', 'course', id], queryFn: () => api<CourseDetail>(`/courses/${id}`), enabled: !!id, retry: false })

export const useRoster = (id: string | undefined) => useQuery({ queryKey: ['lms', 'roster', id], queryFn: () => api<Roster>(`/courses/${id}/enrollments`), enabled: !!id })

/** Alumnado de varios cursos a la vez (resumen y vista global de estudiantes). */
export function useRosters(courses: Array<{ id: string; title: string }>) {
  const results = useQueries({
    queries: courses.map((c) => ({ queryKey: ['lms', 'roster', c.id], queryFn: () => api<Roster>(`/courses/${c.id}/enrollments`), staleTime: 30_000 })),
  })
  return {
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
    rows: courses.flatMap((c, i) => (results[i].data?.items ?? []).map((e) => ({ ...e, courseId: c.id, courseTitle: c.title }))),
  }
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: ['lms'] })
}

export type CourseInput = { ownerType: OwnerType; ownerId?: string; title: string; description?: string; level: CourseLevel; instructorName?: string; certificate: boolean; price: number; currency: string; stageCodes: string[] }

export function useCreateCourse() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (input: CourseInput) => api<CourseDetail>('/courses', { method: 'POST', ...jsonBody(input) }), onSuccess: invalidate })
}

export type CoursePatch = Partial<Omit<CourseInput, 'ownerType' | 'ownerId' | 'description' | 'instructorName'>> & { description?: string | null; instructorName?: string | null; status?: CourseStatus }

export function useUpdateCourse(id: string) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (input: CoursePatch) => api<CourseDetail>(`/courses/${id}`, { method: 'PATCH', ...jsonBody(input) }), onSuccess: invalidate })
}

export type LessonInput = { title: string; content?: string; videoUrl?: string; durationMinutes: number }
export type LessonPatch = Partial<Omit<LessonInput, 'content' | 'videoUrl'>> & { content?: string | null; videoUrl?: string | null; position?: number }

export function useAddLesson(courseId: string) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (input: LessonInput) => api<CourseDetail>(`/courses/${courseId}/lessons`, { method: 'POST', ...jsonBody(input) }), onSuccess: invalidate })
}

export function useUpdateLesson(courseId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & LessonPatch) => api<CourseDetail>(`/courses/${courseId}/lessons/${id}`, { method: 'PATCH', ...jsonBody(input) }),
    onSuccess: invalidate,
  })
}

export function useDeleteLesson(courseId: string) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (lessonId: string) => api<CourseDetail>(`/courses/${courseId}/lessons/${lessonId}`, { method: 'DELETE' }), onSuccess: invalidate })
}
