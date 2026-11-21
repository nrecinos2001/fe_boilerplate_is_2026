/** Alta de usuarios (solo administrador): POST /users. Los administradores salen del seed. */
export const ROLES_CREABLES = ["RESIDENTE", "SEGURIDAD"] as const;
export type RolCreable = (typeof ROLES_CREABLES)[number];

export function esRolCreable(valor: unknown): valor is RolCreable {
  return (ROLES_CREABLES as readonly unknown[]).includes(valor);
}

export const ROL_CREABLE: Record<
  RolCreable,
  { titulo: string; descripcion: string; boton: string; registrado: string }
> = {
  RESIDENTE: {
    titulo: "Residente",
    descripcion: "Vive en una unidad: paga cuotas, reserva áreas, reporta incidencias y vota.",
    boton: "Registrar residente",
    registrado: "Residente registrado",
  },
  SEGURIDAD: {
    titulo: "Seguridad",
    descripcion: "Personal de caseta: registra visitas y paquetes. No pertenece a una unidad.",
    boton: "Registrar personal de seguridad",
    registrado: "Personal de seguridad registrado",
  },
};

/** Ítem de GET /unidades. */
export type UnidadCondominio = {
  id: string;
  code: string;
  tower: string;
  description: string;
  type: string;
  active: boolean;
};

export type NuevoUsuario = {
  email: string;
  password: string;
  role: RolCreable;
  /** Obligatorio para RESIDENTE; no se envía para SEGURIDAD. */
  unitId?: string;
};

/** Respuesta de POST /users. */
export type UsuarioCreado = {
  id: string;
  email: string;
  isActive: boolean;
  role: RolCreable;
  unit: { id: string; code: string; tower: string; description: string } | null;
  createdAt: string;
};

// Mismas reglas que CreateUserDto del backend.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;
export const EMAIL_MAX = 254;

export function errorPassword(password: string): string | undefined {
  if (password.length < PASSWORD_MIN) return `Debe tener al menos ${PASSWORD_MIN} caracteres.`;
  if (password.length > PASSWORD_MAX) return `No puede superar los ${PASSWORD_MAX} caracteres.`;
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "Debe incluir al menos una minúscula, una mayúscula y un número.";
  }
  return undefined;
}

export function errorEmail(email: string): string | undefined {
  if (!email) return "Ingresa el correo del usuario.";
  if (email.length > EMAIL_MAX) return `El correo no puede superar los ${EMAIL_MAX} caracteres.`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "El correo no tiene un formato válido.";
  return undefined;
}

/** Unidades activas agrupadas por torre, cada grupo ordenado por código. */
export function unidadesPorTorre(unidades: UnidadCondominio[]) {
  const grupos = new Map<string, UnidadCondominio[]>();
  for (const u of unidades.filter((x) => x.active)) {
    grupos.set(u.tower, [...(grupos.get(u.tower) ?? []), u]);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es", { numeric: true }))
    .map(([torre, items]) => ({
      torre,
      unidades: items.sort((a, b) => a.code.localeCompare(b.code, "es", { numeric: true })),
    }));
}
