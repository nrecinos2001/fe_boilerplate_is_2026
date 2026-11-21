import { getSession } from "@/lib/session";
import { apiFetch } from "@/lib/api";

export type Role = "RESIDENTE" | "ADMINISTRADOR" | "SEGURIDAD";

export type Unidad = {
  id: string;
  code: string;
  tower: string;
  description: string;
};

export type CurrentUser = {
  id: string;
  email: string;
  unit?: Unidad | null;
  role?: Role;
  isActive?: boolean;
  createdAt?: string;
};

/** Nombre legible del rol para la interfaz. */
export function etiquetaRol(role: Role | undefined): string {
  switch (role) {
    case "ADMINISTRADOR": return "Administrador";
    case "SEGURIDAD": return "Seguridad";
    case "RESIDENTE": return "Residente";
    default: return "Invitado";
  }
}

/** Nombre para mostrar a partir del correo: "ana.martinez@…" → "Ana Martinez". */
export function nombreVisible(email: string) {
  const local = email.split("@")[0] ?? "";
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await getSession();
  if (!token) return null;
  try {
    return await apiFetch<CurrentUser>("/auth/me");
  } catch {
    return null;
  }
}
