# Guía de uso

**[COMPLETAR: los pasos salen del código y de la descripción de cada módulo; recorran cada flujo en el sistema y ajusten los nombres exactos de botones y campos. Tomen las capturas con los nombres de archivo indicados y guárdenlas en `docs/img/`.]**

Las credenciales de prueba se entregan en Moodle, no en este repositorio. Todas las pantallas se abren desde el menú lateral (en el celular, desde el menú desplegable) y cada usuario solo ve las secciones que su rol permite.

## Roles

| Rol | Qué puede hacer |
|---|---|
| Administrador | Crea y desactiva cuentas de residentes y de seguridad. Administra las incidencias (asigna prioridad, responsable y fecha, y las marca como resueltas). Gestiona las áreas comunes y sus bloqueos. Define reglas de cuota, genera cuotas manualmente y consulta las unidades en mora y el estado de cuenta de cualquier unidad. Convoca asambleas, las publica y consulta resultados y auditoría. Publica comunicados. Consulta los reportes de incidencias y de votaciones. También puede ver las visitas activas. |
| Residente | Consulta el estado de cuenta de su unidad y paga cuotas. Consulta la disponibilidad de las áreas comunes y reserva o cancela reservas. Reporta incidencias y confirma o rechaza su resolución. Pre-autoriza visitas. Consulta los paquetes de su unidad y su código de retiro. Lee la cartelera de comunicados, consulta el directorio de vecinos y configura su privacidad. Participa en las votaciones de las asambleas (un voto por unidad). Recibe y administra sus notificaciones. |
| Seguridad | Registra la entrada y la salida de visitantes, con o sin pre-autorización, y consulta el panel de visitantes dentro del condominio. Registra la llegada de paquetes y su entrega. Consulta la disponibilidad de las áreas comunes. |

## Flujos principales

### Acceso e inicio

#### Iniciar sesión

1. Abrir la dirección del frontend. Si no hay sesión, el sistema muestra la pantalla de inicio de sesión.
2. Escribir el correo y la contraseña del usuario de prueba del rol que se quiere probar y pulsar **Iniciar sesión**.
3. El sistema abre **Mi comunidad**, la página de inicio, que muestra accesos directos a las secciones disponibles para el rol.
4. Para salir, usar la opción de cerrar sesión del encabezado. Si la sesión vence, el sistema regresa al inicio de sesión con un aviso.

**[COMPLETAR: captura de la pantalla de inicio de sesión y de la página de inicio de cada rol]**

![Pantalla de inicio de sesión](img/login.png)

![Página de inicio Mi comunidad](img/mi-comunidad.png)

### Usuarios (administrador)

#### Registrar una cuenta

1. Entrar a **Usuarios** y pulsar el botón para crear una cuenta.
2. Elegir el rol: **Residente** o **Seguridad**.
3. Escribir el correo y una contraseña (de 8 a 72 caracteres, con minúscula, mayúscula y número).
4. Si el rol es Residente, elegir su unidad. Los usuarios de seguridad no llevan unidad.
5. Guardar. Si el correo ya existe o la unidad ya no existe, el sistema lo indica.

#### Desactivar una cuenta

1. En **Usuarios**, filtrar por rol o estado, o buscar por correo.
2. Pulsar **Desactivar** en la cuenta y confirmar. La acción no se puede deshacer: se cierra su sesión, se cancelan sus reservas futuras y sus pre-autorizaciones activas, y se libera su unidad.

**[COMPLETAR: capturas]**

![Lista de usuarios](img/usuarios.png)

### Incidencias

#### Reportar una incidencia (residente)

1. Entrar a **Incidencias** y pulsar **Nueva incidencia**.
2. Completar el título, la descripción, la categoría y la ubicación, y adjuntar fotos si se desea.
3. Enviar. El sistema asigna un folio y la incidencia aparece en la lista con estado **Abierto**.
4. Abrir el detalle para ver la línea de tiempo de la incidencia.

#### Atender una incidencia (administrador)

1. Entrar a **Panel de incidencias** y abrir la incidencia.
2. Asignar prioridad, responsable (un administrador activo) y fecha límite.
3. Cuando el problema se resuelve, marcar la incidencia como **Resuelta** y escribir el comentario de resolución.
4. El residente la confirma (queda **Cerrada**) o la rechaza. **[COMPLETAR: indicar a qué estado vuelve una incidencia rechazada]**

**[COMPLETAR: capturas]**

![Formulario de nueva incidencia](img/incidencia-nueva.png)

![Panel de incidencias del administrador](img/incidencias-admin.png)

### Visitas y control de acceso

#### Pre-autorizar una visita (residente)

1. Entrar a **Mis visitas** y abrir **Nueva pre-autorización**.
2. Escribir el nombre y el documento del visitante, el número de acompañantes, el motivo (opcional) y el periodo en que puede ingresar.
3. Guardar. El sistema genera un código que el visitante presenta en la entrada.

#### Registrar la entrada y la salida de un visitante (seguridad)

1. Entrar a **Registro de entrada**.
2. Buscar la pre-autorización por código, documento o nombre.
3. Si la visita está pre-autorizada, registrar la entrada con sus datos; la pre-autorización pasa a **Usada**.
4. Si no hay pre-autorización, registrar la entrada indicando nombre, documento, unidad y motivo (de 10 a 200 caracteres). La visita aparece como **Sin autorización**.
5. En **Panel de seguridad** se ven los visitantes que están dentro. Cuando se retiran, pulsar **Registrar salida**.

**[COMPLETAR: capturas]**

![Pre-autorización de visita](img/visita-preautorizacion.png)

![Panel de seguridad](img/seguridad-panel.png)

### Paquetes

#### Registrar y entregar un paquete (seguridad)

1. Entrar a **Llegada de paquete**, elegir la unidad destinataria y completar los datos del paquete (transportista, referencia, descripción).
2. Guardar. El sistema asigna un folio y un código de retiro de 6 dígitos, y el residente recibe un aviso.
3. Cuando alguien de la unidad llega por el paquete, abrirlo desde **Paquetes pendientes** y registrar la entrega. Solo se entrega si quien lo recoge presenta el código de retiro.

#### Consultar mis paquetes (residente)

1. Entrar a **Paquetes**. Se listan los paquetes de la unidad; los pendientes muestran su código de retiro.
2. Abrir un paquete para ver su detalle. Un paquete de otra unidad no se puede ver.

**[COMPLETAR: capturas]**

![Registro de paquete](img/paquete-nuevo.png)

![Mis paquetes](img/paquetes-residente.png)

### Áreas comunes y reservas

#### Consultar disponibilidad y reservar (residente)

1. Entrar a **Áreas comunes**, elegir la fecha, la hora y la duración, y revisar qué áreas están disponibles. Una no disponible indica el motivo: fuera de horario, bloqueada o ya reservada.
2. Entrar a **Nueva reserva**, elegir el área y el horario, y confirmar. Si el horario se cruza con otra reserva, el sistema no la acepta.
3. En **Mis reservas** se consultan las reservas de la unidad y se pueden cancelar las confirmadas que aún no terminaron.

#### Administrar las áreas (administrador)

1. Entrar a **Gestión de áreas** para crear un área (nombre, capacidad, ubicación, duración del bloque, condiciones de uso y horarios por día), editarla o eliminarla.
2. Desde el área, bloquear un horario por mantenimiento, renovación u otro motivo. No se puede bloquear un horario que ya tiene reservas.

**[COMPLETAR: capturas]**

![Disponibilidad de áreas](img/areas-disponibilidad.png)

![Nueva reserva](img/reserva-nueva.png)

### Cuotas, pagos y morosidad

#### Consultar el estado de cuenta y pagar (residente)

1. Entrar a **Estado de cuenta** para ver el saldo pendiente, las cuotas y el historial de pagos de la unidad.
2. Pulsar **Realizar pago**, elegir las cuotas (las vencidas vienen preseleccionadas) y, si se desea, un monto menor para un pago parcial.
3. Elegir el medio de pago, revisar y confirmar. No se debe pulsar dos veces el botón de confirmar.
4. El sistema muestra el comprobante y actualiza el estado de cuenta.

#### Configurar y generar cuotas (administrador)

1. En **Cuotas y reglas**, crear una regla: concepto, monto (fijo o por tipo de unidad), día de generación y de vencimiento, a quién aplica y qué hacer con las unidades inactivas. Una regla se puede activar, pausar o desactivar.
2. Las cuotas de las reglas activas se generan solas cada día a las 00:05.
3. Para generar un periodo a pedido, entrar a **Generación de cuotas**, elegir la regla y el periodo, revisar la vista previa, marcar la casilla de confirmación y pulsar generar. El resumen muestra cuántas cuotas se crearon, omitieron o fallaron.
4. En **Morosidad** se listan las unidades con cuotas vencidas, con filtros por torre y antigüedad. Desde cada fila se abre el estado de cuenta de la unidad.

**[COMPLETAR: capturas]**

![Estado de cuenta](img/estado-de-cuenta.png)

![Generación manual de cuotas](img/cuotas-generacion.png)

![Unidades en mora](img/morosidad.png)

### Asambleas y votaciones

#### Convocar una asamblea (administrador)

1. Entrar a **Convocar asamblea** y completar el título, el tipo, la modalidad, la fecha, el lugar y la agenda.
2. Agregar las propuestas a votar, cada una con sus opciones y su plazo de votación.
3. Guardar como borrador, revisar y **publicar**. Al publicarse, los residentes pueden verla y reciben un aviso.

#### Votar (residente)

1. Entrar a **Asambleas** y abrir la asamblea publicada.
2. En una propuesta con votación abierta, elegir una opción y confirmar. Cada unidad vota una sola vez por propuesta.

#### Consultar resultados (administrador)

1. En **Asambleas**, abrir la asamblea y luego los resultados de la propuesta.
2. Para una votación cerrada se puede ver la auditoría y descargarla en PDF. Los reportes no revelan el sentido de cada voto.

**[COMPLETAR: capturas]**

![Convocatoria de asamblea](img/asamblea-nueva.png)

![Votación de una propuesta](img/asamblea-votar.png)

### Comunicados, directorio y notificaciones

#### Publicar un comunicado (administrador)

1. Entrar a **Publicar comunicado**, escribir el título y el cuerpo, y elegir la categoría, la prioridad y la audiencia (todo el condominio o una torre).
2. Adjuntar archivos si se desea y publicar.

#### Leer la cartelera (residente y administrador)

1. Entrar a **Cartelera**. Los comunicados urgentes se muestran en una ventana al ingresar.
2. Abrir un comunicado lo marca como leído.

#### Directorio de vecinos y privacidad (residente)

1. En **Directorio** se buscan vecinos; solo se muestran los datos que cada uno autorizó.
2. En **Privacidad** se elige qué datos propios (nombre, unidad, teléfono, correo) pueden ver los demás.

#### Notificaciones (residente)

1. Entrar a **Notificaciones** para ver los avisos, filtrarlos y marcarlos como leídos. La campana del encabezado muestra cuántos hay sin leer.
2. En **Preferencias** se elige de qué módulos se quieren recibir avisos.

**[COMPLETAR: capturas]**

![Cartelera de comunicados](img/cartelera.png)

![Notificaciones](img/notificaciones.png)

### Reportes (administrador)

1. **Reporte de incidencias:** incidencias abiertas agrupadas por estado y prioridad, con filtros por fecha y sección.
2. **Reporte de votaciones:** porcentaje de participación por votación cerrada.

**[COMPLETAR: capturas]**

![Reporte de incidencias](img/reporte-incidencias.png)
