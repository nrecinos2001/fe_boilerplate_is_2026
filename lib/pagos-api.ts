import { ApiError, apiFetch } from "@/lib/api";
import type { Unidad } from "@/lib/current-user";
import type { EstadoCuenta, PagoInput, PagoRegistrado } from "@/lib/estado-cuenta";

// Estado de cuenta y pagos (H1). Solo usar en el servidor.

/** GET /unidades/{unidadId}/estado-de-cuenta. El residente solo puede consultar su unidad. */
export function obtenerEstadoCuenta(unidadId: string) {
  return apiFetch<EstadoCuenta>(`unidades/${encodeURIComponent(unidadId)}/estado-de-cuenta`);
}

export type ErrorEstadoCuenta = "sesion" | "ajena" | "inexistente" | "general";

/** Carga el estado de cuenta y clasifica el error para que la página muestre el aviso adecuado. */
export async function cargarEstadoCuenta(
  unidadId: string,
): Promise<{ estado: EstadoCuenta; error?: never } | { estado?: never; error: ErrorEstadoCuenta }> {
  try {
    return { estado: await obtenerEstadoCuenta(unidadId) };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) return { error: "sesion" };
      if (error.status === 403) return { error: "ajena" };
      if (error.status === 404) return { error: "inexistente" };
    }
    console.error("Error al cargar el estado de cuenta:", error);
    return { error: "general" };
  }
}

/** Texto de cada error de carga. */
export const MENSAJES_ERROR_CARGA: Record<Exclude<ErrorEstadoCuenta, "sesion">, string> = {
  ajena: "Esta unidad no pertenece a tu cuenta, así que no puedes ver su estado de cuenta.",
  inexistente: "La unidad no existe o fue dada de baja.",
  general: "No se pudo cargar el estado de cuenta. Revisa tu conexión e intenta de nuevo.",
};

/**
 * POST /pagos. Si se indica `tarjetaUltimos4`, la pasarela simulada tarda 5 s y rechaza la
 * tarjeta que termina en 2000 (402 PAGO_RECHAZADO).
 */
export function registrarPago(input: PagoInput) {
  return apiFetch<PagoRegistrado>("pagos", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** GET /unidades: solo ADMINISTRADOR y SEGURIDAD. */
export function listarUnidades() {
  return apiFetch<(Unidad & { active?: boolean })[]>("unidades");
}
