"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/current-user";
import {
  RUTA_GENERACION,
  esPeriodoValido,
  periodoActual,
  periodoEnTexto,
  type ResultadoEjecucion,
} from "@/lib/generacion-cuotas";
import { ejecutarGeneracion } from "@/lib/generacion-cuotas-api";
import { expireSession } from "@/lib/session";

export type ErrorGeneracion = {
  /** Código de la API (p. ej. "EJECUCION_EN_CURSO") o "GENERAL". */
  codigo: string;
  titulo: string;
  mensaje: string;
  /** No sabemos si la generación llegó a correr (sin respuesta del servidor). */
  incierto?: boolean;
};

export type ResultadoGeneracion =
  | { ok: true; resultado: ResultadoEjecucion }
  | { ok: false; error: ErrorGeneracion };

const REINTENTO_SEGURO =
  "Revisa el historial antes de reintentar. Volver a ejecutar es seguro: solo se crean las cuotas que falten.";

function fallo(codigo: string, titulo: string, mensaje: string, incierto = false): ResultadoGeneracion {
  return { ok: false, error: { codigo, titulo, mensaje, ...(incierto ? { incierto } : {}) } };
}

function desdeApi(error: ApiError, periodo: string): ResultadoGeneracion {
  switch (error.codigo) {
    case "EJECUCION_EN_CURSO":
      return fallo(
        error.codigo,
        "Ya hay una generación en curso",
        `Otra ejecución de esta regla para ${periodoEnTexto(periodo)} todavía no termina (puede ser la ` +
          "automática). No se creó ninguna cuota. Espera unos minutos y revisa el historial.",
      );
    case "REGLA_INACTIVA":
      // El backend usa el mismo código para una regla no activa y para un periodo futuro;
      // su mensaje dice cuál de los dos casos es.
      return fallo(error.codigo, "No se puede generar este periodo", error.message);
    case "REGLA_INEXISTENTE":
      return fallo(error.codigo, "La regla ya no existe", "Vuelve a la lista de reglas y recárgala.");
    case "ROL_NO_PERMITIDO":
      return fallo(error.codigo, "Sin permiso", "Solo un administrador puede generar cuotas.");
    case "SOLICITUD_INVALIDA":
      return fallo(error.codigo, "Revisa el periodo", error.message);
    case "SIN_CONEXION":
      return fallo(
        error.codigo,
        "No hay conexión con el servidor",
        `No sabemos si la generación llegó a correr. ${REINTENTO_SEGURO}`,
        true,
      );
    default:
      return fallo(
        "GENERAL",
        "No se pudo completar la generación",
        `El servidor respondió con un error. ${REINTENTO_SEGURO}`,
        true,
      );
  }
}

/**
 * Ejecuta la generación manual del periodo (FE-34.1). El cliente solo la llama después de
 * mostrar la vista previa de esa misma regla y periodo.
 */
export async function generarPeriodo(datos: { reglaId: number; periodo: string }): Promise<ResultadoGeneracion> {
  const { reglaId, periodo } = datos;
  if (!Number.isInteger(reglaId) || reglaId <= 0) {
    return fallo("SOLICITUD_INVALIDA", "Solicitud no válida", "Recarga la página e intenta de nuevo.");
  }
  if (!esPeriodoValido(periodo)) {
    return fallo("SOLICITUD_INVALIDA", "Revisa el periodo", "El periodo debe tener el formato AAAA-MM.");
  }
  if (periodo > periodoActual()) {
    return fallo("SOLICITUD_INVALIDA", "No se puede generar este periodo", "No se pueden generar periodos futuros.");
  }

  const usuario = await getCurrentUser();
  if (!usuario) await expireSession();
  if (usuario?.role !== "ADMINISTRADOR") {
    return fallo("ROL_NO_PERMITIDO", "Sin permiso", "Solo un administrador puede generar cuotas.");
  }

  try {
    return { ok: true, resultado: await ejecutarGeneracion(reglaId, periodo) };
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error("Error al generar cuotas:", error);
      return desdeApi(new ApiError(500, ""), periodo);
    }
    if (error.status === 401) await expireSession();
    return desdeApi(error, periodo);
  } finally {
    // Con éxito o error (p. ej. un 409), la vista previa y el historial pudieron cambiar.
    // revalidatePath en una Server Action también vuelve a renderizar la página actual.
    revalidatePath(RUTA_GENERACION);
  }
}
