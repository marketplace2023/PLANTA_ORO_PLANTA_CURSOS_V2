import { BadgeCheck, BookOpen, ChevronsUpDown, GraduationCap, LayoutDashboard, LogOut, Menu, RefreshCw, Users, X, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/auth-context'
import { useOwner, type Owner } from '@/features/owners/owner-context'
import { OWNER_LABELS } from '@/lib/lms'
import { cn } from '@/lib/utils'

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean }

const SECTIONS: Array<{ title: string; items: Item[] }> = [
  {
    title: 'Formación',
    items: [
      { to: '/', label: 'Resumen', icon: LayoutDashboard, end: true },
      { to: '/courses', label: 'Cursos', icon: BookOpen },
      { to: '/students', label: 'Alumnado', icon: Users },
    ],
  },
]

const ORG_STATUS: Record<string, string> = { PENDING: 'Pendiente de aprobación', ACTIVE: 'Activa', SUSPENDED: 'Suspendida' }

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
      <span className="grid size-9 place-items-center rounded-lg bg-fur-gold-500 text-sm font-extrabold text-fur-navy-950">FUR</span>
      <div className="leading-tight">
        <p className="text-sm font-bold text-white">Portal de Cursos</p>
        <p className="text-[11px] text-white/60">Ecosistema FUR</p>
      </div>
    </div>
  )
}

/** Equivale al selector de planta del panel de planta: aquí se elige quién ofrece los cursos que se gestionan. */
function OwnerSwitcher() {
  const { owner, owners, select } = useOwner()
  if (!owner) return null
  const body = (
    <span className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-fur-navy-900 px-3 py-2.5 text-left">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-fur-gold-500 text-fur-navy-950">
        <GraduationCap className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold tracking-widest text-fur-gold-400 uppercase">Ofrece los cursos</span>
        <span className="flex items-center gap-1 text-sm font-semibold text-white">
          <span className="truncate">{owner.name}</span>
          {owner.verified && owner.type !== 'ECOSYSTEM' && <BadgeCheck className="size-3.5 shrink-0 text-fur-gold-400" aria-label="Verificada" />}
        </span>
        <span className="block text-[11px] text-white/60">{owner.type === 'ECOSYSTEM' ? OWNER_LABELS.ECOSYSTEM : `${OWNER_LABELS[owner.type]} · ${ORG_STATUS[owner.status]}`}</span>
      </span>
      {owners.length > 1 && <ChevronsUpDown className="size-4 shrink-0 text-white/60" aria-hidden />}
    </span>
  )
  if (owners.length < 2) return body
  const group = (type: Owner['type'], title: string) => {
    const items = owners.filter((o) => o.type === type)
    if (items.length === 0) return null
    return (
      <>
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        {items.map((o) => (
          <DropdownMenuItem key={o.key} onSelect={() => select(o.key)}>
            <span className="truncate font-medium">{o.name}</span>
            {o.type !== 'ECOSYSTEM' && o.status !== 'ACTIVE' && <span className="ml-auto text-xs text-muted-foreground">{ORG_STATUS[o.status]}</span>}
          </DropdownMenuItem>
        ))}
      </>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="w-full rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/60" aria-label="Cambiar quién ofrece los cursos">
          {body}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
        {group('ECOSYSTEM', 'Ecosistema')}
        {owners.some((o) => o.type === 'ECOSYSTEM') && owners.some((o) => o.type !== 'ECOSYSTEM') && <DropdownMenuSeparator />}
        {group('PROVIDER', 'Proveedores')}
        {group('CONTRACTOR', 'Contratistas')}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Secciones del portal de cursos" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {SECTIONS.map((s) => (
        <div key={s.title}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-widest text-white/50 uppercase">{s.title}</p>
          <ul className="space-y-0.5">
            {s.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/60',
                      isActive ? 'border-fur-gold-500 bg-fur-navy-800 text-white' : 'border-transparent text-white/75 hover:bg-fur-navy-900 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn('size-[18px]', isActive && 'text-fur-gold-400')} aria-hidden />
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function UserCard() {
  const { user, logout } = useAuth()
  const { owner } = useOwner()
  const navigate = useNavigate()
  if (!user) return null
  const role = owner?.type === 'ECOSYSTEM' || user.isGlobalAdmin ? 'Administrador del ecosistema' : owner?.role === 'OWNER' ? 'Responsable' : 'Miembro'
  return (
    <div className="flex items-center gap-3 border-t border-white/10 p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fur-navy-800 text-sm font-bold text-fur-gold-400" aria-hidden>
        {user.firstName[0]}
        {user.lastName[0]}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold text-white">
          {user.firstName} {user.lastName}
        </p>
        <p className="truncate text-xs text-white/60">{user.isGlobalAdmin ? 'Admin. del ecosistema' : role}</p>
      </div>
      <button
        type="button"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        onClick={async () => {
          await logout()
          navigate('/login')
        }}
        className="grid size-9 place-items-center rounded-lg text-white/70 outline-none hover:bg-fur-navy-800 hover:text-white focus-visible:ring-3 focus-visible:ring-ring/60"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Brand />
      <div className="px-3 pb-1">
        <OwnerSwitcher />
      </div>
      <Nav onNavigate={onNavigate} />
      <UserCard />
    </>
  )
}

/** Marco del portal: mismo layout que el panel de planta, el de administración y el de proveedores. */
export function Shell() {
  const [open, setOpen] = useState(false)
  const { owner } = useOwner()
  const queryClient = useQueryClient()
  const fetching = useIsFetching() > 0

  return (
    <div className="min-h-screen bg-background lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-fur-navy-950 lg:flex">
        <SidebarBody />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-fur-navy-950">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-3 right-3 grid size-9 place-items-center rounded-lg text-white/70 hover:bg-fur-navy-800" aria-label="Cerrar menú">
              <X className="size-5" />
            </button>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur lg:px-8">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Abrir menú" onClick={() => setOpen(true)}>
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fur-navy-900">{owner?.name ?? 'Portal de Cursos'}</p>
            <p className="truncate text-xs text-muted-foreground">Cursos, lecciones y alumnado</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void queryClient.invalidateQueries()} aria-label="Actualizar datos">
            <RefreshCw className={cn(fetching && 'animate-spin')} /> <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">
            {owner && owner.type !== 'ECOSYSTEM' && owner.status !== 'ACTIVE' && (
              <p role="status" className="mb-5 rounded-lg border border-fur-orange-500 bg-fur-orange-500/10 p-3 text-sm">
                {owner.status === 'PENDING'
                  ? `${owner.name} está pendiente de aprobación: aún no puede crear ni publicar cursos. El administrador del ecosistema debe aprobarla.`
                  : `${owner.name} está suspendida: sus cursos no son visibles y no puede publicar. Contacta al administrador del ecosistema.`}
              </p>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
