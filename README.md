# Portal de Cursos · Ecosistema FUR

Entorno donde se gestiona **todo lo referente a cursos** del ecosistema. Mismo layout y diseño que el panel de planta, el de
administración y el de proveedores (navy + gold, `docs/design.md`).

## Quién ofrece los cursos

Cada curso pertenece a un **dueño**, que se elige en el selector de la barra lateral:

| Dueño | Quién lo gestiona |
|---|---|
| **Ecosistema FUR** | Solo el administrador del ecosistema |
| Una empresa **proveedora** | Los miembros de esa empresa (y el administrador) |
| Una empresa **contratista** | Los miembros de esa empresa (y el administrador) |

- Una persona ve solo las empresas de las que es miembro. El administrador ve el ecosistema y todas las empresas.
- Una empresa **pendiente** o **suspendida** no puede crear ni publicar cursos (el portal lo avisa).
- Quien no gestiona ningún curso ve una explicación de cómo conseguirlo.

## Registro y acceso

Hay **una sola cuenta para todos los portales**: se crea desde «Crea una» en el login (nombre, apellido, correo y contraseña de al menos 10 caracteres) y esa misma credencial entra a los demás portales. Crear la cuenta no da acceso a nada por sí sola: quien no gestiona ninguna organización puede **registrar la suya** (proveedor o contratista) desde este portal; queda *pendiente* hasta que el administrador la apruebe. Si la misma cuenta ya registró una empresa en proveedores o servicios, aparece aquí automáticamente. Mientras la solicitud esté pendiente se puede preparar el perfil, pero no operar. La política de seguridad definitiva está por analizar.

## Pantallas

| Sección | Qué hace |
|---|---|
| Resumen | Cursos publicados y borradores, personas inscritas, completaron, tasa de finalización, contenido publicado, cursos con más inscritos, borradores por publicar, inscripciones recientes |
| Cursos | Crear, editar, publicar, archivar y reactivar; **fijar el precio** (y la moneda) del curso; filtros por estado y búsqueda |
| Curso (detalle) | Qué falta para publicar (lección, etapa, empresa activa); **lecciones** (alta, edición, reordenar, eliminar; video como enlace externo, contenido en texto plano); **alumnado** del curso con avance |
| Alumnado | Todas las inscripciones de los cursos del dueño elegido, con filtros por curso y estado |

**Precio:** lo fija el facilitador al crear o editar el curso; vacío o 0 = **gratis**. La web lo muestra en cada tarjeta y en la página del curso, y permite filtrar por *Gratis / De pago* y ordenar por precio. Hoy el precio es informativo: la inscripción sigue siendo inmediata (aún no hay módulo de pagos).

El contenido que ve el alumnado, su avance y los certificados verificables (`/certificates/:código`) los sirve la web original.

## Ejecutar

```bash
# En ../planta_beneficio_oro
npm run db:local        # Postgres local
npm run dev:api         # API en :3000

# En esta carpeta
npm install
npm run dev             # http://localhost:5178
```

En desarrollo, Vite reenvía `/api` a `http://localhost:3000` (ver `vite.config.ts`): no hay que configurar CORS.
En producción define `VITE_API_URL` con la URL absoluta de la API.

Usuarios de demo (contraseña `fur-local-2026`):
`admin@fur.local` (ecosistema y todas las empresas), `proveedor@fur.local` (Repuestos Andinos), `contratista@fur.local` (Mecánica Industrial Minera).

Verificación: `npm run lint && npm test && npm run build`.
