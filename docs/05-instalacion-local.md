# Instalación local

Hay dos repositorios que se levantan por separado: primero el backend (API y base de datos) y después el frontend.

## Requisitos

- Docker y docker-compose v2 o superior **[COMPLETAR: versión usada]**
- Node.js 24 (la versión de las imágenes Docker; el backend requiere como mínimo 20.19) y npm, solo si se corre fuera de Docker

## Pasos

### 1. Backend

1. Clonar el repositorio del backend.
2. Copiar el archivo de variables: `cp .env.example .env` y completar los valores (ver la tabla de abajo). `SEED_DEMO_PASSWORD` es obligatoria para cargar los datos semilla.
3. Levantar los servicios, con una de estas dos opciones:
   - **Todo con Docker:** `docker compose up --build`. La API aplica las migraciones al arrancar.
   - **Base en Docker y API en la máquina (recomendada para desarrollar):**
     ```bash
     docker compose up -d postgres
     npm install
     npm run prisma:migrate
     npm run start:dev
     ```
4. Cargar los datos semilla:
   - Con Docker completo: `docker compose exec api npx prisma db seed`
   - API en la máquina: `npm run db:seed`
5. Abrir la documentación de la API en http://localhost:3000/api/docs y verificar que `http://localhost:3000/api/v1` responde.

### 2. Frontend

1. Clonar el repositorio del frontend.
2. Copiar el archivo de variables: `cp .env.example .env.local` y ajustar `API_URL` (ver la tabla de abajo).
3. Con Node: `npm install` y `npm run dev`. Con Docker: `docker compose up --build`.
4. Abrir [http://localhost:3000](http://localhost:3000) con Node, o [http://localhost:3001](http://localhost:3001) con Docker.

Si el backend corre en el puerto 3000 y el frontend se levanta con `npm run dev`, el frontend tomará otro puerto libre: revisen el que muestra la terminal.

## Variables de entorno

### Backend (`.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `PORT` | Puerto HTTP de la API | `3000` |
| `APP_TIMEZONE` | Zona horaria de los horarios de las áreas y de la generación de cuotas | `America/El_Salvador` |
| `PAGO_SIMULADO_ESPERA_MS` | Espera de la pasarela de pago simulada, en milisegundos | `5000` |
| `TRUST_PROXY_HOPS` | Proxies delante de la API (0 en local) | `0` |
| `CORS_ORIGINS` | Orígenes del frontend con permiso CORS, separados por coma (vacío = ninguno) | `http://localhost:3001` |
| `POSTGRES_USER` | Usuario con el que se crea la base en Docker | `postgres` |
| `POSTGRES_PASSWORD` | Contraseña de ese usuario | `una-contraseña-propia` |
| `POSTGRES_DB` | Nombre de la base | `si_be_boilerplate` |
| `POSTGRES_PORT` | Puerto publicado en la máquina (solo en 127.0.0.1) | `5432` |
| `DATABASE_URL` | Cadena de conexión de Prisma | `postgresql://postgres:contraseña@localhost:5432/si_be_boilerplate?schema=public` |
| `JWT_SECRET` | Secreto para firmar los JWT (mínimo 32 caracteres) | resultado de `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | Vigencia del access token | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | Vigencia del refresh token en días | `7` |
| `BCRYPT_SALT_ROUNDS` | Costo de bcrypt | `12` |
| `SEED_DEMO_PASSWORD` | Contraseña de todas las cuentas demo (12 a 72 caracteres, con minúscula, mayúscula y número) | `una-contraseña-propia` |

### Frontend (`.env.local`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `API_URL` | URL de la API vista desde el servidor de Next.js, incluyendo `/api/v1` | `http://localhost:3000/api/v1` |
| `NEXT_PUBLIC_BACKEND_URL` | URL del backend vista desde el navegador, sin `/api/v1` (para los archivos de `/uploads`) | `http://localhost:3000` |
| `NEXT_PUBLIC_CONDOMINIO` | Nombre del condominio que se muestra en la interfaz | `Mi condominio` |
| `NEXT_PUBLIC_MONEDA` | Moneda de los importes (ISO 4217) | `USD` |
| `COOKIE_SECURE` | Solo producción: `false` permite la cookie de sesión por HTTP | `false` |

Las variables `NEXT_PUBLIC_*` se incrustan al compilar: si se cambian, hay que reiniciar `npm run dev` o reconstruir la imagen.

## Datos semilla

`npm run db:seed` (o `npx prisma db seed` dentro del contenedor) crea los roles, las unidades, los usuarios de prueba y datos de ejemplo para recorrer los módulos. Se puede ejecutar varias veces. Todas las cuentas comparten la contraseña de `SEED_DEMO_PASSWORD`; las credenciales de la entrega se dan en Moodle, no en este repositorio.

| Rol | Correos de ejemplo |
|---|---|
| Administrador | `admin@example.com`, `laura.admin@example.com` |
| Residente | `demo@example.com` (unidad A-19), `otro@example.com` (A-20) y residentes de la Torre B |
| Seguridad | `ricardo.soto@example.com` |

## Pruebas automatizadas

``` shell
pnpm test            # pruebas unitarias (backend)
pnpm run test:e2e    # pruebas de extremo a extremo (backend)
pnpm run lint        # análisis estático (backend y frontend)
```

- **Backend, unitarias:** archivos `*.spec.ts` junto al código que prueban, dentro de `src/`. Se ejecutan con Vitest.
- **Backend, e2e:** archivos `*.e2e-spec.ts` en la carpeta `test/`. Necesitan PostgreSQL levantado: crean y migran automáticamente una base con el mismo nombre de `DATABASE_URL` más el sufijo `_test`, y desactivan el límite de peticiones y la espera de la pasarela de pago.
- **Frontend:** no tiene framework de pruebas; se revisa con `npm run lint` y `npm run build`.
