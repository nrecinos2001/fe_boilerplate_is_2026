"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/current-user";
import {
  RUTA_ESTADO_CUENTA,
  RUTA_PAGOS,
  type PagoRegistrado,
} from "@/lib/estado-cuenta";
import { registrarPago } from "@/lib/pagos-api";
import { expireSession } from "@/lib/session";

export type ErrorPago = {
  /** Código de la API (p. ej. "MONTO_EXCEDE_DEUDA") o "GENERAL". */
  codigo: string;
  titulo: string;
  mensaje: string;
};

export type ResultadoPago = { ok: true; pago: PagoRegistrado } | { ok: false; error: ErrorPago };

export type DatosPago = {
  cuotaIds: number[];
  monto: number;
  referencia: string;
  tarjetaUltimos4: string;
};

const TITULOS: Record<string, string> = {
  PAGO_RECHAZADO: "La tarjeta fue rechazada",
  MONTO_EXCEDE_DEUDA: "El monto supera lo que debes",
  CUOTA_YA_PAGADA: "Ese pago ya no se puede aplicar",
  CUOTA_INEXISTENTE: "Una de las cuotas ya no existe",
  RECURSO_AJENO: "No puedes pagar esta unidad",
  ROL_NO_PERMITIDO: "No puedes realizar pagos",
  SOLICITUD_INVALIDA: "Revisa los datos del pago",
  SIN_CONEXION: "No hay conexión con el servidor",
  GENERAL: "No se pudo procesar el pago",
};

function fallo(codigo: string, mensaje: string): ResultadoPago {
  return { ok: false, error: { codigo, titulo: TITULOS[codigo] ?? TITULOS.GENERAL, mensaje } };
}

// Mensajes propios para los casos en que el de la API no basta para decidir qué hacer.
function mensajeDe(error: ApiError): string {
  switch (error.codigo) {
    case "PAGO_RECHAZADO":
      return "El emisor no autorizó el cargo. No se realizó ningún cobro. Usa otra tarjeta e intenta de nuevo.";
    case "CUOTA_YA_PAGADA":
      return `${error.message} Actualizamos tus cuotas: revisa tu selección. No se realizó ningún cobro.`;
    case "CUOTA_INEXISTENTE":
      return `${error.message} Actualizamos tus cuotas: revisa tu selección.`;
    case "RECURSO_AJENO":
      return "Solo puedes pagar las cuotas de tu propia unidad.";
    case "ROL_NO_PERMITIDO":
      return "Solo los residentes pueden pagar cuotas.";
    case "SIN_CONEXION":
      return "No se pudo contactar al servidor. No se realizó ningún cobro; intenta de nuevo en unos minutos.";
    default:
      return error.codigo ? error.message : "Intenta de nuevo en unos minutos. No se realizó ningún cobro.";
  }
}

/**
 * Paga una o varias cuotas (FE-1.2). La unidad se toma de la sesión, nunca del cliente.
 * No redirige: el flujo muestra el comprobante en la misma pantalla y el estado de cuenta
 * se actualiza al revalidar las rutas.
 */
export async function pagarCuotas(datos: DatosPago): Promise<ResultadoPago> {
  const cuotaIds = [...new Set(datos.cuotaIds)].filter((id) => Number.isInteger(id) && id > 0);
  if (cuotaIds.length === 0) return fallo("SOLICITUD_INVALIDA", "Elige al menos una cuota.");
  if (!(datos.monto > 0) || Math.round(datos.monto * 100) !== datos.monto * 100) {
    return fallo("SOLICITUD_INVALIDA", "El monto debe ser mayor a 0 y tener hasta dos decimales.");
  }
  // Solo llegan los últimos 4 dígitos: el número completo nunca sale del navegador.
  if (!/^\d{4}$/.test(datos.tarjetaUltimos4)) {
    return fallo("SOLICITUD_INVALIDA", "Elige un medio de pago o completa los datos de la tarjeta.");
  }

  const usuario = await getCurrentUser();
  if (!usuario) await expireSession();
  if (usuario?.role !== "RESIDENTE" || !usuario.unit) {
    return fallo("ROL_NO_PERMITIDO", "Solo los residentes con una unidad asignada pueden pagar cuotas.");
  }

  try {
    const pago = await registrarPago({
      unidadId: usuario.unit.id,
      cuotaIds,
      monto: datos.monto,
      referencia: datos.referencia || undefined,
      tarjetaUltimos4: datos.tarjetaUltimos4,
    });
    return { ok: true, pago };
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error("Error al registrar el pago:", error);
      return fallo("GENERAL", "Intenta de nuevo en unos minutos. No se realizó ningún cobro.");
    }
    if (error.status === 401) await expireSession();
    return fallo(error.codigo ?? "GENERAL", mensajeDe(error));
  } finally {
    // Con éxito o error, los saldos pudieron cambiar (p. ej. un 409 porque otra pestaña ya pagó).
    // En una Server Action, revalidatePath también actualiza la pantalla actual sin recargarla.
    revalidatePath(RUTA_ESTADO_CUENTA);
    revalidatePath(RUTA_PAGOS);
  }
}
