<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Contexto del Proyecto
Frontend de **GymHub**, plataforma web de gestión de gimnasios construida con Next.js (App Router), React y TypeScript, conectada a un backend REST API en NestJS.

## Stack Tecnológico
- **Framework:** Next.js 16 (App Router)
- **Lenguaje:** TypeScript (modo estricto)
- **Estado Global:** Zustand
- **Estilos:** Tailwind CSS
- **Backend API:** NestJS (REST)

## Comandos Esenciales
- `npm run dev` — Inicia el servidor de desarrollo en `http://localhost:3001` (usar `next dev --webpack -p 3001` si existen bloqueos de binarios nativos de Turbopack en Windows).
- `npm run build` — Genera el build de producción.
- `npm run lint` — Ejecuta ESLint para validar calidad y estilo de código.
- `npx tsc --noEmit` — Verifica errores de tipado en todo el proyecto sin compilar.

## Arquitectura y Estructura de Directorios
- `src/app/` — Rutas, páginas, layouts y manejadores de ruta (App Router).
- `src/components/` — Componentes reutilizables de UI y componentes específicos de dominio.
- `src/store/` — Stores globales de Zustand (autenticación, sesión, roles, estado global).
- `src/services/` — Cliente HTTP, llamadas a endpoints del backend e interceptores de renovación de token.
- `src/types/` — Interfaces, tipos y DTOs compartidos.
- `src/lib/` — Funciones utilitarias y helpers puros.

## Reglas Estrictas de Desarrollo
1. **Server vs. Client Components:** Todos los componentes son Server Components por defecto. Agrega `'use client'` únicamente cuando el componente requiera interactividad, hooks de React o lectura/escritura de stores de Zustand.
2. **Tipado Estricto:** Prohibido el uso de `any`. Define interfaces o tipos explícitos para todas las props, estados y respuestas de la API.
3. **Autenticación y Manejo de Tokens:**
   - Centraliza el estado de sesión, el rol del usuario y el flujo de renovación de tokens (refresh token sin duplicación de peticiones) exclusivamente en el store global de autenticación.
   - No leas ni escribas tokens manualmente en `localStorage` o cookies desde componentes de UI.
4. **Control de Acceso por Roles:** Respeta las validaciones de rol del usuario (`ADMIN`, `TRAINER`, `CLIENT`, etc.) antes de renderizar vistas o ejecutar acciones protegidas.
5. **Idioma:** Todos los textos visibles para el usuario en la interfaz deben redactarse en español.
6. **Flujo de Git:** Las ramas nuevas deben partir de `develop` siguiendo el formato `feature/FE-X.X-descripcion-corta`.

## Verificación antes de finalizar tareas
Antes de dar por terminada cualquier modificación:
- Asegúrate de que `npx tsc --noEmit` no arroje errores de tipos.
- Asegúrate de que `npm run lint` pase sin advertencias críticas.
- Verifica que no queden `console.log` innecesarios ni código comentado.
