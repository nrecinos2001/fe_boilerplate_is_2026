# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

"Habita" — a condominium management frontend (Spanish UI, `lang="es"`) built with Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript. It is a thin BFF in front of a separate NestJS REST backend (sibling repo `../be_boilerplate_is_2026`); there is no database here. Features are developed per user story (H1, H4, H5…) on `feature/H<n>-<descripcion>` branches and merged into `develop`, then `main`. Each story's backend contract comes from a design PDF, but the backend implementation is the source of truth when they differ — check its controllers and DTOs.

## Commands

- `npm run dev` — dev server on http://localhost:3000 (also regenerates `AGENTS.md`). Next 16 allows only one `next dev` per project directory.
- `npm run build` — production build (also the main type check)
- `npm run lint` — ESLint (flat config, `eslint-config-next`)
- `npx next typegen && npx tsc --noEmit` — type check without building. `PageProps`/`LayoutProps` are global types generated into `.next/types`, so plain `tsc` fails until `typegen` (or `dev`/`build`) has run.
- No test framework is configured.

Copy `.env.example` to `.env.local`.
- `API_URL` — backend base **including** the version prefix (e.g. `http://localhost:8000/api/v1`); `apiFetch` throws if it is missing.
- `NEXT_PUBLIC_CONDOMINIO` — name of the condominium this deployment manages, shown across the UI through `CONDOMINIO.nombre` (`lib/condominio.ts`; falls back to "Condominio"). Never hardcode a condominium name. Inlined at build time, like `NEXT_PUBLIC_MONEDA`.
- `NEXT_PUBLIC_MONEDA` — ISO 4217 code (default `USD`) for every amount. Always format money with `formatMonto` / `MONEDA` / `SIMBOLO_MONEDA` from `lib/moneda.ts`; never hardcode a currency code or symbol. It is inlined at build time, so changing it needs a dev-server restart or rebuild.
- `NEXT_PUBLIC_BACKEND_URL` — backend origin as the **browser** sees it (no `/api/v1`), for links to the backend's public `/uploads` files (incidencia photos, cartelera attachments). Also inlined at build time.
- `COOKIE_SECURE` — production only: `false` lets the session cookie work over plain HTTP. Otherwise the browser drops the `Secure` cookie outside localhost and every reload goes back to `/login`.

**Docker.** `Dockerfile` builds the `output: "standalone"` server (`node server.js`). `NEXT_PUBLIC_*` go in as build args; `API_URL` and `COOKIE_SECURE` are runtime env. `docker-compose.yml` is a standalone project: it reaches the backend's own compose (API published on host port 3000) through `host.docker.internal` and serves the frontend on `${FRONTEND_PORT:-3001}`.

## Architecture

**Auth/session.** `app/actions/auth.ts` (`login`) POSTs to `${API_URL}/auth/login` and stores the returned bearer token in an httpOnly cookie named `session` (`lib/session.ts`). `proxy.ts` (Next 16's replacement for `middleware.ts`) guards every page on GET:
- Non-GET requests (Server Actions are POSTs to the page) pass through untouched. A redirect there breaks the action on the client ("An unexpected response was received from the server"), e.g. logging out with an expired token. So **every Server Action must handle a 401 itself**, with `if (error instanceof ApiError && error.status === 401) await expireSession();`. `expireSession()` clears the cookie and goes to `/login?motivo=vencida`.
- No cookie → `/login`.
- Otherwise it validates the token with `GET /auth/me` (the JWT carries no role). The result is cached in memory for 60 s per token.
  - Rejected token → the cookie is cleared and the user goes to `/login?motivo=vencida`.
  - Any role other than `RESIDENTE`/`ADMINISTRADOR`/`SEGURIDAD` → `/login?motivo=rol`. The backend has only those three roles (`MANTENIMIENTO` was removed; incidencias are assigned to and resolved by admins), so this is only a safeguard. The `login` action also refuses such accounts.
  - Backend unreachable → the request passes through and the page shows its own error.
- A valid session on `/login`, or on a route its role may not open, is redirected to `INICIO` (`/mi-comunidad`).

Per-route roles live in `REGLAS` in `lib/rutas.ts`, mirroring the backend `@Roles`. First match wins and an unlisted route is closed to everyone, so **every new page needs a rule there**. `/api/*` route handlers are outside the proxy matcher; the backend authorizes them. A 401 later on still makes Server Actions call `expireSession()` (Server Components can't modify cookies, so pages show a "sesión vencida" notice with a logout form instead). The current user comes from `GET /auth/me` via `getCurrentUser()` in `lib/current-user.ts`: `id`, `email`, `role` (`RESIDENTE | ADMINISTRADOR | SEGURIDAD`) and `unit` (`{ id (uuid), code, tower, description }` or null). Use it rather than calling `/auth/me` ad hoc. When a request needs the resident's unit, take it from the session on the server, never from the client.

**Backend access — server only.** All backend calls go through `apiFetch` in `lib/api.ts` (marked `server-only`; the token never reaches the browser). It resolves the path against `API_URL`, attaches `Authorization: Bearer <session>`, disables caching, and throws `ApiError(status, message, codigo?)`:
- Caller `headers` are merged in. `Content-Type: application/json` is added only for string bodies, so send JSON as `JSON.stringify(...)`; a `FormData` body is sent as multipart (incidencia photos).
- Errors are read from both backend shapes: `{ codigo, mensaje }` (modules using `ApiExceptionFilter`) and Nest's default `{ message: string | string[] }` (the rest). Branch on `codigo` when present. No session → `ApiError(401, …, "NO_AUTENTICADO")`; network failure → `ApiError(0, …, "SIN_CONEXION")`.
- An empty success body (e.g. `204 No Content` from DELETE) resolves to `undefined`.

Two patterns sit on top of it:

1. **Server Components + Server Actions** (most screens: areas, cuota rules, manual generation, morosidad, disponibilidad, reservas, estado de cuenta, pagos). Pages call typed wrappers in `lib/*-api.ts` directly and keep filters/pagination in the URL (`searchParams`). Mutations live in `app/actions/*.ts`: either `useActionState` actions returning `{ error, fieldErrors, values }` followed by `revalidatePath` + `redirect` with `?ok=…` for a success banner, or actions called directly from a client component that return a result union (e.g. `pagarCuotas` → `{ ok: true, pago } | { ok: false, error }`). Backend `codigo`s are mapped to Spanish messages in the action. `revalidatePath` inside a Server Action also re-renders the current page in the same round trip, so the UI refreshes without a reload.
2. **Client Components + Route Handler proxy** (incidencias, paquetes, asambleas, visitas): `"use client"` components `fetch('/api/...')`; the handlers in `app/api/**/route.ts` forward to the backend with `forward(() => apiFetch(...))` from `lib/api-route.ts`, which converts `ApiError` into a JSON `{ message }` response with the same status.

**Route groups / layouts.** Two UI shells exist. Admin screens live in `(dashboard)`: there is no separate admin shell, so never add another sidebar.
- `app/(dashboard)/` — the main shell for residents, security and admins: `app/components/layout/*` (`Sidebar` picks `ResidentNav` or `SecurityNav` by role; `Header`; `Breadcrumb` maps pathnames to crumbs; `MenuMovil` replaces the sidebar below `md`), `lucide-react` icons. Feature components live in `app/components/<feature>/`. New pages need a nav entry in `ResidentNav`/`SecurityNav`, a case in `Breadcrumb` and a rule in `lib/rutas.ts`.
- `app/(residente)/` — notifications shell: `components/residente/*`. Its sidebar mirrors `ResidentNav` for a resident and only links items marked `disponible: true`; below `md` it becomes `MenuMovil`. Its color tokens (`habita-*`, `crema`, `arena`, `borde`) are aliases of the palette in `globals.css`.

Keep both sidebars in step: when a resident page is added, link it in `ResidentNav` and in `components/residente/sidebar.tsx`. `components/icons.tsx` (inline SVG icons) is still used by the admin screens that came from the old admin shell. The `(dashboard)` header bell (`NotificationBell`) only shows for residents, because the backend gives notifications only to them.

**Domain modules in `lib/`.** Each domain has a client-safe module with types, constants and formatters (`areas.ts`, `bloqueos.ts`, `disponibilidad.ts`, `reservas.ts`, `estado-cuenta.ts`, `reglas-cuota.ts`, `paquetes.ts`…) and a separate server-only `*-api.ts` with the `apiFetch` wrappers. Condo dates use `America/El_Salvador` via `lib/condominio.ts` (`hoyEnCondominio`, `horaEnCondominio`, `aIsoCondominio`); `CONDOMINIO` also holds the condominium name from `NEXT_PUBLIC_CONDOMINIO`.

**User accounts.** There is no public sign-up. `/usuarios` (admin only) creates accounts with `POST /users`: `RESIDENTE` with a mandatory `unitId` (picked from `GET /unidades`, active units grouped by tower) or `SEGURIDAD` without one (the backend answers 400 if it is sent). Administrators come from the backend seed. Password rules mirror the backend DTO (8–72 chars, a lowercase letter, an uppercase letter and a digit; `lib/usuarios.ts`). The action never returns the password; 409 means the email is taken and 404 that the unit no longer exists. The backend has no endpoint to list or edit users yet.

**Payments (H1).** The backend computes every balance (`saldo`, `saldoTotal`); the UI shows them and must not recompute them. "Vencida" is derived on the client per the project definition: `PENDIENTE`/`PARCIAL` with a due date before today (`esVencida`). The card gateway is simulated by the backend (`POST /pagos` with `tarjetaUltimos4`: it waits 5 s, always declines cards ending in 2000 and approves the rest, including 2026). The UI must not reveal that rule. Full card data never leaves the browser: `lib/tarjeta.ts` validates the one-time card client-side and only the last 4 digits are sent. Each review step generates a unique `referencia`, so the backend answers a duplicate submit with 409 instead of charging twice.

**Manual fee generation (H34).** `/cuotas/generacion`, admin only. Rule, period and history page live in the URL; the page fetches the backend preview (`POST …/generacion/vista-previa`, read-only) while rendering, and `ConfirmarGeneracion` can only confirm the preview on screen (checkbox, disabled while pending, ref guard against double click). Periods are limited to the current one and earlier (`periodoActual()` uses the condo time zone, the same as the backend's `APP_TIMEZONE`). The execution summary must show exactly what the service returned, including each error's `causa`; `diferenciasConVista` flags when it differs from the confirmed preview. The backend reuses `REGLA_INACTIVA` (422) for both an inactive rule and a future period; its message tells them apart.

**Delinquency (H2).** `/morosidad`, admin only. Filters (`torre`, `antiguedad` → backend `antiguedadMinDias`), sort (`orden`, `-` prefix for descending) and page live in the URL; `leerFiltros` drops values the backend would reject with 400. The table shows `GET /unidades/mora` items as returned. The summary cards come from `resumenMora`, which walks every backend page (max `tamano` 100) because the backend returns no aggregates. Rows link to `/estado-de-cuenta?unidad=<id>`. The backend has no section (`seccion`) concept, only `torre`, and `responsable` is an email (users have no name).

A horizontally scrolling table container needs `relative` (`relative overflow-x-auto`): otherwise the absolutely positioned `sr-only` spans inside it escape the clip and widen the whole page at 360 px.

**Validation.** Mix of hand-written validation in Server Actions (areas, reservas, pagos), client-side helpers (`lib/tarjeta.ts`), and Zod schemas + `react-hook-form` (`lib/validation.ts`, incidencias form).

**Styling.** Tailwind v4 configured CSS-first in `app/globals.css` via `@theme` (no `tailwind.config`). Prefer semantic tokens (`bg-background`, `text-foreground`, `bg-primary`, `text-muted`, `border-border`, `bg-surface`, `text-danger`) over raw palette colors (`forest`, `moss`, `sage`, `cream`, `sand`); use opacity modifiers for intermediate shades. Fonts: Inter (`font-sans`) and Source Serif 4 (`font-serif`). Pages must work at 360 px wide.

**Path alias:** `@/*` → repo root.
