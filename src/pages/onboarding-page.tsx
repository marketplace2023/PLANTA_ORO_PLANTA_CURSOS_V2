import { useMutation, useQueryClient } from '@tanstack/react-query'
import { GraduationCap, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FormDialog, type Values } from '@/components/form-dialog'
import { Panel } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { api, jsonBody } from '@/lib/api'
import { errorMessage } from '@/lib/forms'

type Kind = 'providers' | 'contractors'

const COUNTRIES = ['PE', 'CL', 'AR', 'BO', 'BR', 'CO', 'EC', 'MX', 'PA', 'US', 'CA', 'AU', 'ZA', 'DE', 'ES', 'FI', 'DK', 'CH', 'GB', 'FR']
const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['es'], { type: 'region' }) : null
const countryOptions = COUNTRIES.map((c) => ({ value: c, label: `${regionNames?.of(c) ?? c} (${c})` }))

const KIND_OPTIONS = [
  { value: 'providers', label: 'Proveedor (vende equipos y repuestos)' },
  { value: 'contractors', label: 'Contratista (presta servicios profesionales)' },
]

const opt = (v: string | boolean | undefined) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/** Registro de la organización que ofrecerá cursos. Queda pendiente hasta que el administrador del ecosistema la apruebe. */
function useRegisterOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ kind, ...input }: { kind: Kind } & Record<string, unknown>) => api(`/${kind}`, { method: 'POST', ...jsonBody({ ...input, selfRegistration: true }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['owners'] }),
  })
}

/** La persona tiene cuenta pero todavía no gestiona cursos de ninguna organización: puede registrar la suya. */
export function OnboardingPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const register = useRegisterOrganization()
  const [open, setOpen] = useState(false)

  function submit(v: Values) {
    register.mutate(
      {
        kind: v.kind as Kind,
        organizationName: String(v.organizationName).trim(),
        taxId: opt(v.taxId),
        countryCode: String(v.countryCode),
        city: opt(v.city),
        description: opt(v.description),
        contactEmail: opt(v.contactEmail),
      },
      {
        onSuccess: () => {
          toast.success('Solicitud enviada: el administrador revisará tu organización. Mientras tanto puedes preparar tus cursos en borrador.')
          setOpen(false)
        },
      },
    )
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <Panel className="w-full max-w-lg">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-fur-navy-900 text-fur-gold-400">
            <GraduationCap className="size-6" aria-hidden />
          </span>
          <h1 className="text-xl font-bold text-fur-navy-900">Registra tu organización para ofrecer cursos</h1>
          <p className="text-sm text-muted-foreground">
            Hola {user?.firstName}. Tu cuenta aún no gestiona cursos de ninguna organización. Registra la tuya (empresa proveedora o contratista): el administrador del ecosistema la revisa y, al aprobarla, podrás publicar cursos. Si ya tienes una en otro portal, no hace falta repetirla: se muestra aquí automáticamente.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button onClick={() => { register.reset(); setOpen(true) }}>Registrar mi organización</Button>
            <Button
              variant="outline"
              onClick={async () => {
                await logout()
                navigate('/login')
              }}
            >
              <LogOut /> Cerrar sesión
            </Button>
          </div>
        </div>
      </Panel>

      {open && (
        <FormDialog
          title="Registrar mi organización"
          description="Tu solicitud queda pendiente hasta que el administrador del ecosistema la apruebe."
          fields={[
            { name: 'kind', label: 'Tipo de organización', type: 'select', required: true, wide: true, options: KIND_OPTIONS },
            { name: 'organizationName', label: 'Razón social', required: true, wide: true },
            { name: 'taxId', label: 'Identificación tributaria', hint: 'RUC / NIT / CUIT. Evita registros duplicados.' },
            { name: 'countryCode', label: 'País', type: 'select', required: true, options: countryOptions },
            { name: 'city', label: 'Ciudad' },
            { name: 'contactEmail', label: 'Correo de contacto', type: 'email' },
            { name: 'description', label: 'Descripción', type: 'textarea', placeholder: 'A qué se dedica la organización' },
          ]}
          initial={{ kind: 'providers', countryCode: 'PE' }}
          submitLabel="Enviar solicitud"
          busy={register.isPending}
          error={errorMessage(register.error)}
          onClose={() => setOpen(false)}
          onSubmit={submit}
        />
      )}
    </div>
  )
}
