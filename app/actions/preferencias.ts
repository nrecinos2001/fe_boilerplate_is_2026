// app/actions/preferencias.ts
"use server";

import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { guardarPreferencias } from "@/lib/preferencias-api";
import type { PreferenciasResponse } from "@/lib/preferencias";

export type ResultadoPreferencias =
    | { ok: true }
    | { ok: false; mensaje: string };

export async function actualizarPreferencias(
    preferencias: PreferenciasResponse
): Promise<ResultadoPreferencias> {
  try {
    await guardarPreferencias(preferencias);
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) redirect("/login");
      if (error.status === 400) {
        return {
          ok: false,
          mensaje: "Uno de los módulos no es válido. Verifica la configuración.",
        };
      }
      if (error.status === 403) {
        return {
          ok: false,
          mensaje: "No tienes permisos para modificar estas preferencias.",
        };
      }
      if (error.status === 0) {
        return { ok: false, mensaje: "No se pudo conectar con el servidor." };
      }
    }
    console.error("Error al guardar preferencias:", error);
    return { ok: false, mensaje: "No se pudieron guardar las preferencias. Intenta de nuevo." };
  }
}