"use server";

import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { cambiarLeida } from "@/lib/notificaciones-api";

export type ResultadoAccion = { ok: true } | { ok: false; mensaje: string };


export async function marcarLeida(
  id: number,
  leida: boolean,
): Promise<ResultadoAccion> {
  try {
    await cambiarLeida(id, leida);
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) redirect("/login");
      if (error.status === 403 || error.status === 404) {
        return { ok: false, mensaje: "No se encontró esta notificación." };
      }
      if (error.status === 0) {
        return { ok: false, mensaje: "No se pudo conectar con el servidor." };
      }
    } else {
      console.error("Error al marcar la notificación:", error);
    }
    return { ok: false, mensaje: "No se pudo actualizar. Intenta de nuevo." };
  }
}

export async function marcarTodasLeidasAccion(): Promise<ResultadoAccion> {
  try {
    const { marcarTodasLeidas } = await import("@/lib/notificaciones-api");
    await marcarTodasLeidas();
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) redirect("/login");
      if (error.status === 0) {
        return { ok: false, mensaje: "No se pudo conectar con el servidor." };
      }
    }
    console.error("Error al marcar todas como leídas:", error);
    return { ok: false, mensaje: "No se pudieron marcar todas. Intenta de nuevo." };
  }
}