# Sistema de Tickets — Frontend

Aplicación web para el sistema interno de gestión de tickets de soporte.
Acompaña al backend en
[`sistema-tickets-back`](https://github.com/illeiva2/sistema-tickets-back).

> 📖 **¿Buscás cómo usar el sistema?** El manual de uso para empleados
> (no técnico, paso a paso) está en [`docs/MANUAL_DE_USO.md`](./docs/MANUAL_DE_USO.md).

## Stack

- **Build:** Vite 5
- **Lenguaje:** TypeScript 5 (strict)
- **Framework:** React 18
- **Routing:** React Router v6
- **HTTP:** Axios con interceptor de refresh automático y manejo de 429
- **Styling:** Tailwind CSS 3 con CSS variables HSL (patrón shadcn)
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **Drag & drop:** dnd-kit
- **Notificaciones:** react-hot-toast
- **Tests:** Vitest + Testing Library + jsdom

## Estructura

```
src/
├── App.tsx
├── main.tsx
├── components/
│   ├── layouts/
│   │   ├── _shared.tsx        # NavLink, Breadcrumbs, UserMenu, useNavItems
│   │   ├── QuietProLayout.tsx # Sidebar (theme Quiet Pro)
│   │   └── WorkshopLayout.tsx # Topbar (theme Workshop)
│   ├── Layout.tsx             # Wrapper que ramifica por theme
│   ├── CommandPalette.tsx     # Búsqueda global Cmd/Ctrl+K
│   ├── TicketsKanban.tsx      # Vista kanban con drag & drop
│   ├── TicketTimeline.tsx     # Timeline de actividad (AuditLog)
│   ├── ThemeSwitcher.tsx
│   ├── Avatar.tsx
│   └── dashboards/            # User/Agent/Admin dashboards + shared
├── contexts/
│   ├── AuthContext.tsx        # Sesión, login, refresh, logout
│   ├── TicketsContext.tsx     # State compartido de tickets
│   ├── NotificationsContext.tsx
│   └── ThemeContext.tsx       # quiet-pro / workshop × light / dark
├── pages/
│   ├── LoginPage, RegisterPage
│   ├── DashboardPage          # Ramifica por rol
│   ├── TicketsPage            # Tabla densa + tabs + Kanban
│   ├── TicketDetailPage       # Detalle + comentarios + adjuntos
│   ├── NewTicketPage
│   ├── UsersPage              # ADMIN: gestión de usuarios
│   ├── FileManagementPage     # ADMIN/AGENT: gestión de archivos
│   ├── NotificationsPage
│   └── (Setup|Change)PasswordPage
├── lib/
│   ├── api.ts                 # Axios client + refresh interceptor
│   ├── sla.ts                 # formatSla, slaToneClasses
│   └── logger.ts
├── hooks/
│   ├── useAuth, useTickets    # re-exports de los contexts
│   ├── useDashboard, useNotifications, useFileUpload
└── constants/
    ├── ticketLabels.ts        # Status, priority labels y estilos
    └── ticketCategories.ts    # SOFTWARE/HARDWARE/RED/ERP/OTRO

tests/                          # 36 tests (Vitest + Testing Library)
docs/                           # Manual de uso para empleados
```

## Setup local

### Requisitos

- Node 20+
- Backend corriendo (`sistema-tickets-back`) en `http://localhost:3001`
  (o donde apunte `VITE_API_URL`)

### Variables de entorno

`.env.local`:

```bash
VITE_API_URL=http://localhost:3001
```

En producción (Vercel), apunta a la URL pública del back.

### Comandos

```bash
npm install        # Instalar dependencias
npm run dev        # Levantar Vite en watch mode (puerto 5173)
npm test           # Correr suite de tests
npm run test:watch # Tests en modo watch
npm run build      # tsc + vite build → dist/
npm run preview    # Servir el build local
```

## Themes y layouts

El sistema soporta dos themes que el usuario puede elegir desde el
menú de su perfil:

- **Quiet Pro** (default) — sobrio tipo Linear, sidebar lateral fija,
  accent violeta, tipografía Inter. Tokens HSL definidos en
  `src/index.css` bajo `[data-theme="quiet-pro"]`.
- **Workshop** — cálido tipo Notion, topbar horizontal, accent
  petróleo, fondo crema, Plus Jakarta Sans + Fraunces para titulares.

Ambos combinan con dark/light mode (eje ortogonal). El theme y el
modo se persisten en `localStorage` (`ui:theme`, `ui:dark`) y un
script anti-flash en `index.html` aplica los valores antes del
primer render.

Tokens semánticos del dominio (`--status-*`, `--priority-*`) cambian
con cada theme; los badges y gráficos los consumen.

## Tests

36 tests cubren los flujos críticos:

- **`sla.test.ts`** (11): cálculo de tonos, formato de duración
  (minutos / horas / días / semanas), tickets terminales.
- **`dashboards-shared.test.ts`** (10): `formatHours`, `formatPercent`,
  `padTicketNumber`.
- **`AuthContext.test.tsx`** (5): bootstrap con/sin token, login flow,
  logout, evento global `auth:logout`.
- **`TicketTimeline.test.tsx`** (5): skeleton, empty state, render con
  acciones traducidas, error, refetch en cambio de `refreshKey`.
- **`CommandPalette.test.tsx`** (6): no se renderiza por default, abre
  con Cmd+K, cierra con Esc, debounce, render de resultados, empty
  state.

Setup en `tests/setup.ts`: extiende `expect` con jest-dom matchers,
mockea `matchMedia` y `ResizeObserver`, limpia `localStorage` antes
de cada test.

```bash
npm test
```

## CI

GitHub Actions corre en cada push y PR a `main`:

1. `npm ci`
2. `npx tsc --noEmit` (typecheck)
3. `npm test` (36 tests)
4. `npm run build` (verifica que el bundle compile)

Ver [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

## Deploy

Desplegado en **Vercel**. Build automático en cada push a `main`. La
única env var necesaria es `VITE_API_URL` apuntando al backend de
producción.

## Documentación adicional

- [Manual de uso](./docs/MANUAL_DE_USO.md) — para empleados de la
  empresa, sin conocimientos técnicos.

## Licencia

Propietario. Ver [LICENSE.md](./LICENSE.md).

## Autor

Iván Luis Leiva.
