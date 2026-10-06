import { useQuery } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/auth-context'
import { api } from '@/lib/api'
import type { OwnerType } from '@/features/lms/use-lms'

const STORAGE_KEY = 'fur.courses.ownerKey'

export type OrgStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED'

/**
 * Quien ofrece los cursos: el propio ecosistema (solo administradores) o una empresa proveedora/contratista de la que la persona
 * es miembro. El administrador puede además gestionar los cursos de cualquier empresa.
 */
export type Owner = {
  key: string
  type: OwnerType
  /** null para el ecosistema. */
  id: string | null
  name: string
  status: OrgStatus
  verified: boolean
  /** Rol de la persona en la empresa (null = administrador del ecosistema sin ser miembro). */
  role: 'OWNER' | 'MEMBER' | null
}

type OrgRow = { id: string; organizationName: string; status: OrgStatus; verified: boolean; myRole?: 'OWNER' | 'MEMBER' }
type OwnerContextValue = { owners: Owner[]; owner: Owner | null; isLoading: boolean; isError: boolean; select: (key: string) => void }

const OwnerContext = createContext<OwnerContextValue | null>(null)

const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const fromOrg = (type: 'PROVIDER' | 'CONTRACTOR', o: OrgRow): Owner => ({ key: `${type}:${o.id}`, type, id: o.id, name: o.organizationName, status: o.status, verified: o.verified, role: o.myRole ?? null })

export function OwnerProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const enabled = status === 'authenticated'
  const admin = !!user?.isGlobalAdmin

  // Un administrador ve todas las empresas; los demás solo aquellas de las que son miembros.
  const providers = useQuery({
    queryKey: ['owners', 'providers', admin],
    queryFn: async () => (admin ? (await api<{ items: OrgRow[] }>('/providers?status=ALL&pageSize=100')).items : await api<OrgRow[]>('/providers/mine')),
    enabled,
  })
  const contractors = useQuery({
    queryKey: ['owners', 'contractors', admin],
    queryFn: async () => (admin ? (await api<{ items: OrgRow[] }>('/contractors?status=ALL&pageSize=100')).items : await api<OrgRow[]>('/contractors/mine')),
    enabled,
  })
  const [storedKey, setStoredKey] = useState<string | null>(readStored)

  const owners = useMemo<Owner[]>(() => {
    const eco: Owner[] = admin ? [{ key: 'ECOSYSTEM', type: 'ECOSYSTEM', id: null, name: 'Ecosistema FUR', status: 'ACTIVE', verified: true, role: null }] : []
    return [...eco, ...(providers.data ?? []).map((o) => fromOrg('PROVIDER', o)), ...(contractors.data ?? []).map((o) => fromOrg('CONTRACTOR', o))]
  }, [admin, providers.data, contractors.data])

  const owner = owners.find((o) => o.key === storedKey) ?? owners[0] ?? null

  const select = useCallback((key: string) => {
    setStoredKey(key)
    try {
      localStorage.setItem(STORAGE_KEY, key)
    } catch {
      /* almacenamiento no disponible */
    }
  }, [])

  const value = useMemo<OwnerContextValue>(
    () => ({ owners, owner, isLoading: status === 'loading' || (enabled && (providers.isLoading || contractors.isLoading)), isError: providers.isError || contractors.isError, select }),
    [owners, owner, status, enabled, providers.isLoading, contractors.isLoading, providers.isError, contractors.isError, select],
  )
  return <OwnerContext.Provider value={value}>{children}</OwnerContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOwner() {
  const ctx = useContext(OwnerContext)
  if (!ctx) throw new Error('useOwner debe usarse dentro de <OwnerProvider>')
  return ctx
}
