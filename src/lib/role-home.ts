import type { AuthUser, Role } from "@/src/types/auth";

export const CHANGE_PASSWORD_PATH = "/cambiar-contrasena";

// Rutas que no exigen sesión: aquí nunca se fuerza el cambio de contraseña.
const ROUTES_WITHOUT_SESSION = ["/", "/home", "/login"];

// Mientras no existan los layouts por rol (FE-2.2), todos entran al tablero.
const ROLE_HOME: Record<Role, string> = {
  MEMBER: "/dashboard",
  TRAINER: "/trainer",
  RECEPTION: "/dashboard",
  ADMIN: "/dashboard",
};

/** Pantalla de inicio de cada rol. */
export function roleHomePath(role: Role | null | undefined): string {
  return role ? ROLE_HOME[role] : "/dashboard";
}

/**
 * A dónde hay que mandar al usuario según su obligación de cambiar la
 * contraseña temporal (FE-1.2), o null si puede quedarse donde está.
 *
 * - Con mustChangePassword en true, cualquier ruta privada lleva a
 *   /cambiar-contrasena.
 * - Sin esa obligación, /cambiar-contrasena lleva al inicio de su rol.
 */
export function passwordChangeRedirect(
  pathname: string,
  user: Pick<AuthUser, "role" | "mustChangePassword"> | null,
): string | null {
  if (!user || ROUTES_WITHOUT_SESSION.includes(pathname)) return null;
  const onChangePage = pathname === CHANGE_PASSWORD_PATH;
  if (user.mustChangePassword) return onChangePage ? null : CHANGE_PASSWORD_PATH;
  return onChangePage ? roleHomePath(user.role) : null;
}

/** Destino después de un login exitoso. */
export function pathAfterLogin(user: Pick<AuthUser, "role" | "mustChangePassword">): string {
  return user.mustChangePassword ? CHANGE_PASSWORD_PATH : roleHomePath(user.role);
}
