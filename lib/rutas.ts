/** Los tres roles que existen. Si el backend devolviera otro, esa cuenta no puede iniciar sesión. */
export const ROLES_PERMITIDOS = ["RESIDENTE", "ADMINISTRADOR", "SEGURIDAD"] as const;
export type RolPermitido = (typeof ROLES_PERMITIDOS)[number];

export function esRolPermitido(role: unknown): role is RolPermitido {
  return (ROLES_PERMITIDOS as readonly unknown[]).includes(role);
}

const R: RolPermitido = "RESIDENTE";
const A: RolPermitido = "ADMINISTRADOR";
const S: RolPermitido = "SEGURIDAD";

/**
 * Qué roles pueden abrir cada página. Gana la primera regla que coincide, así que las
 * rutas más específicas van antes. Una ruta que no aparece aquí queda cerrada para todos:
 * cada página nueva necesita su regla. Los roles siguen a los @Roles del backend, que
 * sigue siendo quien autoriza de verdad los datos.
 */
const REGLAS: { ruta: RegExp; roles: readonly RolPermitido[] }[] = [
  { ruta: /^\/mi-comunidad$/, roles: [R, A, S] },

  // Cuotas y pagos
  { ruta: /^\/estado-de-cuenta$/, roles: [R, A] },
  { ruta: /^\/pagos$/, roles: [R] },

  // Áreas comunes y reservas
  { ruta: /^\/areas\/disponibilidad$/, roles: [R, A, S] },
  { ruta: /^\/reservas(\/nueva)?$/, roles: [R] },

  // Incidencias
  { ruta: /^\/incidencias(\/nuevo|\/[^/]+)?$/, roles: [R, A] },

  // Visitas
  { ruta: /^\/visitas(\/nueva)?$/, roles: [R] },
  { ruta: /^\/seguridad\/(panel|visitas)$/, roles: [S, A] },

  // Paquetes: el guardia registra y entrega; el residente ve los suyos.
  { ruta: /^\/paquetes\/nuevo$/, roles: [S] },
  { ruta: /^\/paquetes\/[^/]+\/entrega$/, roles: [S] },
  { ruta: /^\/paquetes\/[^/]+$/, roles: [R] },
  { ruta: /^\/paquetes$/, roles: [R, S] },

  // Asambleas
  { ruta: /^\/asambleas(\/[^/]+)?$/, roles: [R] },
  { ruta: /^\/admin\/asambleas(\/.*)?$/, roles: [A] },
  { ruta: /^\/admin\/incidencias$/, roles: [A] },

  // Panel de administración
  { ruta: /^\/areas$/, roles: [A] },
  { ruta: /^\/cuotas\/(reglas|generacion)$/, roles: [A] },
  { ruta: /^\/morosidad$/, roles: [A] },
  { ruta: /^\/reportes\/(incidencias|votaciones)$/, roles: [A] },
  { ruta: /^\/administracion\/cartelera\/nuevo$/, roles: [A] },
  { ruta: /^\/usuarios$/, roles: [A] },

  { ruta: /^\/cartelera$/, roles: [R, A] },
  { ruta: /^\/directorio$/, roles: [R, A] },
  { ruta: /^\/perfil\/privacidad$/, roles: [R] },
  { ruta: /^\/(notificaciones|preferencias)$/, roles: [R] },
];

export function puedeAcceder(pathname: string, role: RolPermitido): boolean {
  const ruta = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const regla = REGLAS.find((r) => r.ruta.test(ruta));
  return regla ? regla.roles.includes(role) : false;
}

/** Inicio de los tres roles (cada uno ve sus secciones): tras iniciar sesión o al abrir una ruta ajena. */
export const INICIO = "/mi-comunidad";
