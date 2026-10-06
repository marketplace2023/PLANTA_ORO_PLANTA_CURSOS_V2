import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type StageMaster = { id: string; code: string; name: string; stageGroup: string }

/** Etapas del proceso: clasifican los cursos para que cada persona encuentre los de su área. */
export const useStageMasters = () => useQuery({ queryKey: ['catalog', 'stages'], queryFn: () => api<StageMaster[]>('/stages/catalog'), staleTime: 5 * 60_000 })
