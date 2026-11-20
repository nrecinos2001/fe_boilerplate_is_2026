"use client";

import Link from "next/link";
import { useAuthStatus, useRole } from "@/src/stores/useAuthStore";
import type { Role } from "@/src/types/auth";

interface RoleNavigationLinksProps {
  status: "loading" | "authenticated" | "unauthenticated";
  role: Role | null;
}

const linkClass =
  "rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors";

const secondaryLinkClass =
  "rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200 dark:hover:bg-indigo-900/50 transition-colors";

/**
 * Renderiza enlaces de navegación según el rol sin mezclar acciones ADMIN y MEMBER.
 */
export function RoleNavigationLinks({ status, role }: RoleNavigationLinksProps) {
  if (status === "loading") {
    return <span className="text-sm text-zinc-500">Cargando accesos...</span>;
  }

  if (status !== "authenticated" || !role) {
    return null;
  }

  if (role === "ADMIN") {
    return (
      <>
        <Link href="/classes" className={linkClass}>
          📅 Calendario de Clases Grupales
        </Link>
        <Link href="/admin/maquinas" className={linkClass}>
          🛠️ Inventario de máquinas
        </Link>
        <Link href="/admin/planes" className={linkClass}>
          💳 Planes
        </Link>
      </>
    );
  }

  if (role === "MEMBER") {
    return (
      <>
        <Link href="/miembro/clases" className={linkClass}>
          📅 Clases grupales
        </Link>
        <Link href="/miembro/reservas" className={secondaryLinkClass}>
          📋 Mis reservas
        </Link>
        <Link href="/miembro/sesiones/agendar" className={linkClass}>
          💪 Agendar sesión personal
        </Link>
        <Link href="/miembro/sesiones" className={secondaryLinkClass}>
          🗓️ Mis sesiones
        </Link>
        <Link href="/miembro/maquinas" className={secondaryLinkClass}>
          🏋️ Estado de las máquinas
        </Link>
        <Link href="/miembro/pagos" className={linkClass}>
          💳 Mis pagos
        </Link>
      </>
    );
  }

  if (role === "TRAINER") {
    return <Link href="/entrenador/agenda" className={linkClass}>🗓️ Mi agenda de sesiones</Link>;
  }

  return null;
}

export function RoleNavigation() {
  const status = useAuthStatus();
  const role = useRole();

  return <RoleNavigationLinks status={status} role={role} />;
}
