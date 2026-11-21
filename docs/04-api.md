# API

**Documentación interactiva (Swagger):** **[COMPLETAR: https://.../api/docs]**

Todas las rutas cuelgan del prefijo `/api/v1`. Los errores tienen la forma `{ "codigo": "...", "mensaje": "..." }` en los módulos de áreas, reservas, cuotas y pagos, y la forma estándar de NestJS `{ "message", "error", "statusCode" }` en el resto.

## Autenticación

1. `POST /api/v1/auth/login` con `{ "email", "password" }` devuelve un `accessToken` (JWT firmado con HS256), un `refreshToken` y `expiresIn` en segundos.
2. Las demás peticiones envían el access token en el encabezado `Authorization: Bearer <accessToken>`.
3. El access token dura 15 minutos (`JWT_EXPIRES_IN`, configurable). El refresh token dura 7 días (`REFRESH_TOKEN_EXPIRES_IN_DAYS`) y se canjea en `POST /auth/refresh` por un par nuevo; cada refresh token solo sirve una vez, y reusar uno ya canjeado cierra todas las sesiones del usuario.
4. No hay registro público: las cuentas las crea un administrador con `POST /users`.
5. Todas las rutas requieren sesión salvo `GET /`, `POST /auth/login`, `POST /auth/refresh` y `POST /auth/logout`. Si el rol no alcanza, la API responde `403 ROL_NO_PERMITIDO`.
6. El frontend guarda el token en una cookie `httpOnly` y llama a la API desde el servidor; el navegador no lo ve.

Roles: **Administrador** (`ADMINISTRADOR`), **Residente** (`RESIDENTE`) y **Seguridad** (`SEGURIDAD`).


## Endpoints por módulo

### Autenticación y usuarios

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| GET | /api/v1 | Verificación de que la API responde | Público |
| POST | /api/v1/auth/login | Inicia sesión con correo y contraseña | Público |
| POST | /api/v1/auth/refresh | Renueva el par de tokens | Público |
| POST | /api/v1/auth/logout | Cierra la sesión (204) | Público |
| GET | /api/v1/auth/me | Usuario autenticado con su rol y unidad | Todos |
| POST | /api/v1/users | Crea un residente (con `unitId`) o un usuario de seguridad | Administrador |
| GET | /api/v1/users | Lista residentes y personal de seguridad | Administrador |
| PATCH | /api/v1/users/{id}/desactivar | Desactiva una cuenta (no se puede revertir) | Administrador |
| GET | /api/v1/unidades | Lista las unidades | Seguridad, Administrador |

### Incidencias

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| POST | /api/v1/incidencias | Crea un reporte de incidencia con fotos opcionales (multipart) | Residente |
| GET | /api/v1/incidencias | Lista los reportes propios | Residente |
| GET | /api/v1/incidencias/{id} | Detalle de un reporte con su línea de tiempo | Residente (dueño), Administrador |
| GET | /api/v1/incidencias/admin/list | Lista todos los reportes | Administrador |
| GET | /api/v1/incidencias/responsables | Administradores activos que pueden asignarse | Administrador |
| PATCH | /api/v1/incidencias/{id}/asignar | Asigna prioridad, responsable y fecha | Administrador |
| PATCH | /api/v1/incidencias/{id}/resolver | Marca el reporte como resuelto | Administrador |
| PATCH | /api/v1/incidencias/{id}/confirmar | El residente confirma la resolución | Residente (dueño) |
| PATCH | /api/v1/incidencias/{id}/rechazar | El residente rechaza la resolución | Residente (dueño) |

### Visitas

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| POST | /api/v1/preautorizaciones | Crea una pre-autorización de visitante | Residente |
| GET | /api/v1/preautorizaciones | Lista las pre-autorizaciones propias | Residente |
| GET | /api/v1/preautorizaciones/{id} | Detalle de una pre-autorización | Residente |
| GET | /api/v1/visitas/buscar | Busca una pre-autorización por código o documento | Seguridad, Administrador |
| POST | /api/v1/visitas/entrada | Registra la entrada de un visitante | Seguridad, Administrador |
| PATCH | /api/v1/visitas/{id}/salida | Registra la salida | Seguridad, Administrador |
| GET | /api/v1/visitas/activas | Visitantes dentro del condominio | Seguridad, Administrador |
| GET | /api/v1/visitas/activas/count | Cantidad de visitantes dentro | Seguridad, Administrador |

### Paquetes

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| POST | /api/v1/paquetes | Registra la llegada de un paquete | Seguridad |
| GET | /api/v1/paquetes | Paquetes pendientes de retiro | Seguridad |
| GET | /api/v1/paquetes/mis-paquetes | Paquetes de la unidad del residente | Residente |
| GET | /api/v1/paquetes/{id} | Detalle de un paquete | Seguridad, Administrador, Residente (su unidad) |
| PATCH | /api/v1/paquetes/{id}/entrega | Registra la entrega del paquete | Seguridad |

### Áreas comunes y reservas

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| GET | /api/v1/areas | Lista las áreas activas con sus horarios | Todos |
| GET | /api/v1/areas/disponibilidad | Disponibilidad de las áreas en un intervalo | Todos |
| GET | /api/v1/areas/{id} | Consulta un área | Todos |
| POST | /api/v1/areas | Crea un área común | Administrador |
| PUT | /api/v1/areas/{id} | Reemplaza los datos y horarios de un área | Administrador |
| DELETE | /api/v1/areas/{id} | Elimina un área (lógica); 409 si tiene reservas por realizarse | Administrador |
| GET | /api/v1/areas/{areaId}/bloqueos | Lista los bloqueos de un área | Administrador |
| POST | /api/v1/areas/{areaId}/bloqueos | Bloquea un horario | Administrador |
| DELETE | /api/v1/areas/{areaId}/bloqueos/{blockId} | Elimina un bloqueo que no ha terminado | Administrador |
| POST | /api/v1/reservas | Reserva un área para la unidad del residente | Residente |
| GET | /api/v1/reservas | Reservas de la unidad | Residente |
| PATCH | /api/v1/reservas/{id}/cancelar | Cancela una reserva confirmada | Residente |

### Cuotas, pagos y morosidad

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| POST | /api/v1/reglas-cuota | Crea una regla de cuota | Administrador |
| GET | /api/v1/reglas-cuota | Lista las reglas | Administrador |
| GET | /api/v1/reglas-cuota/{id} | Consulta una regla | Administrador |
| PUT | /api/v1/reglas-cuota/{id} | Reemplaza la configuración de una regla | Administrador |
| PATCH | /api/v1/reglas-cuota/{id}/estado | Activa, pausa o desactiva una regla | Administrador |
| GET | /api/v1/reglas-cuota/{id}/historial | Auditoría de la regla | Administrador |
| POST | /api/v1/reglas-cuota/{id}/generacion/vista-previa | Simula la generación de un periodo sin escribir | Administrador |
| POST | /api/v1/reglas-cuota/{id}/generacion | Genera las cuotas faltantes de un periodo | Administrador |
| GET | /api/v1/reglas-cuota/{id}/ejecuciones | Historial de ejecuciones, paginado | Administrador |
| GET | /api/v1/unidades/{unidadId}/estado-de-cuenta | Saldo, cuotas y pagos de una unidad | Residente (su unidad), Administrador |
| POST | /api/v1/pagos | Paga una o varias cuotas | Residente |
| GET | /api/v1/unidades/mora | Unidades en mora, con filtros, orden y paginación | Administrador |

### Asambleas y votaciones

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| GET | /api/v1/asambleas | Lista las asambleas (los residentes solo ven las publicadas) | Residente, Administrador |
| GET | /api/v1/asambleas/audiencia | Cantidad de residentes que recibirán la convocatoria | Administrador |
| GET | /api/v1/asambleas/{id} | Detalle con agenda y propuestas | Residente, Administrador |
| POST | /api/v1/asambleas | Crea una convocatoria en borrador | Administrador |
| PUT | /api/v1/asambleas/{id} | Reemplaza el contenido de un borrador | Administrador |
| POST | /api/v1/asambleas/{id}/publicacion | Publica la convocatoria | Administrador |
| PUT | /api/v1/temas/{temaId} | Modifica una propuesta antes de que abra su votación | Administrador |
| POST | /api/v1/temas/{temaId}/votos | Registra el voto de la unidad del residente | Residente |
| GET | /api/v1/temas/{temaId}/resultados | Resultados de un tema | Administrador |
| GET | /api/v1/temas/{temaId}/auditoria | Auditoría de un tema cerrado | Administrador |
| GET | /api/v1/temas/{temaId}/auditoria/pdf | Auditoría en PDF | Administrador |

### Comunicados (cartelera)

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| GET | /api/v1/anuncios/muro | Cartelera de comunicados del usuario | Residente, Administrador |
| GET | /api/v1/anuncios/{id} | Detalle de un comunicado | Residente, Administrador |
| POST | /api/v1/anuncios/{id}/leer | Marca un comunicado como leído | Residente |
| POST | /api/v1/anuncios | Publica un comunicado con adjuntos opcionales | Administrador |
| PUT | /api/v1/anuncios/{id} | Reemplaza un comunicado | Administrador |
| PATCH | /api/v1/anuncios/{id} | Modifica un comunicado | Administrador |
| DELETE | /api/v1/anuncios/{id} | Elimina un comunicado | Administrador |

**[COMPLETAR: verificar en Swagger los roles de lectura/edición de comunicados y el detalle de las rutas PUT, PATCH y DELETE.]**

### Notificaciones y directorio

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| GET | /api/v1/notificaciones | Notificaciones del residente, paginadas | Residente |
| GET | /api/v1/notificaciones/no-leidas/conteo | Cantidad de no leídas | Residente |
| PATCH | /api/v1/notificaciones/leidas/todas | Marca todas como leídas | Residente |
| PATCH | /api/v1/notificaciones/{id}/leida | Marca una como leída | Residente |
| GET | /api/v1/notificaciones/preferencias | Consulta las preferencias de notificación | Residente |
| PUT | /api/v1/notificaciones/preferencias | Actualiza las preferencias | Residente |
| GET | /api/v1/directorio | Busca vecinos respetando su privacidad | Residente, Administrador |
| GET | /api/v1/directorio/preferencias | Consulta la privacidad propia en el directorio | Residente |
| PUT | /api/v1/directorio/preferencias | Actualiza la privacidad propia | Residente |

### Reportes e indicadores

| Método | Ruta | Descripción | Roles |
|---|---|---|---|
| GET | /api/v1/reportes/resumen | Indicadores generales: morosidad, ocupación, incidencias abiertas y participación | Administrador |
| GET | /api/v1/reportes/incidencias | Incidencias abiertas por estado y prioridad | Administrador |
| GET | /api/v1/reportes/votaciones | Participación en votaciones cerradas (sin el sentido del voto) | Administrador |
