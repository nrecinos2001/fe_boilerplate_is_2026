"use client";

import Link from "next/link";
import { useRole } from "@/src/stores/useAuthStore";

const linkClass =
  "rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 transition-colors";

/**
 * Accesos de recepción desde el tablero, solo para Recepción y Administrador:
 * inscribir miembros (H01), vender membresías (H04) y registrar ingresos (H13).
 */
export function EnrollMemberLink() {
  const role = useRole();
  if (role !== "RECEPTION" && role !== "ADMIN") return null;

  return (
    <>
      <Link href="/recepcion/miembros/nuevo" className={linkClass}>
        Inscribir miembro
      </Link>
      <Link href="/recepcion/membresias/nueva" className={linkClass}>
        Vender membresía
      </Link>
      <Link href="/recepcion/check-in" className={linkClass}>
        Check-in
      </Link>
    </>
  );
}
