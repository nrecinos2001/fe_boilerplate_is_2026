"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { consultarDisponibilidad } from "@/lib/areas-api";
import { aIsoCondominio, hoyEnCondominio } from "@/lib/condominio";
import { duracionMin, esFechaValida, type MotivoNoDisponible } from "@/lib/disponibilidad";
import { cancelarReserva, crearReserva } from "@/lib/reservas-api";
import { RUTA_MIS_RESERVAS, RUTA_NUEVA_RESERVA } from "@/lib/reservas";
import { expireSession } from "@/lib/session";

/** Por qué no se pudo reservar; define el título del aviso. */
export type MotivoRechazo = "reservada" | "bloqueada" | "fuera-de-horario" | "general";

export type ReservaFormState = {
  error?: { motivo: MotivoRechazo; titulo: string; mensaje: string };
};

export type CancelarReservaState = { error?: string };

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const TITULOS: Record<MotivoRechazo, string> = {
  reservada: "Ese horario ya fue reservado",
  bloqueada: "El área está bloqueada en ese horario",
  "fuera-de-horario": "Horario no permitido",
  general: "No se pudo crear la reserva",
};

const MOTIVO_DISPONIBILIDAD: Record<MotivoNoDisponible, MotivoRechazo> = {
  RESERVADA: "reservada",
  BLOQUEADA: "bloqueada",
  FUERA_DE_HORARIO: "fuera-de-horario",
};

const MENSAJES_POR_MOTIVO: Record<MotivoRechazo, string> = {
  reservada: "Otra reserva ocupa esa franja. Elige otro horario disponible.",
  bloqueada:
    "La administración bloqueó el área en esa franja (por mantenimiento u otro motivo). Elige otro horario.",
  "fuera-de-horario":
    "La franja está fuera del horario de uso del área o ya pasó. Elige otro horario.",
  general: "Intenta de nuevo en unos minutos.",
};

function rechazo(motivo: MotivoRechazo, mensaje?: string): ReservaFormState {
  return { error: { motivo, titulo: TITULOS[motivo], mensaje: mensaje || MENSAJES_POR_MOTIVO[motivo] } };
}

// El 422 FUERA_DE_HORARIO agrupa horario no permitido, bloqueo y fecha pasada: se vuelve a
// consultar la disponibilidad de la franja para decirle al residente la causa exacta.
async function motivoReal(areaId: number, fecha: string, inicio: string, fin: string) {
  try {
    const { areas } = await consultarDisponibilidad({
      fecha,
      hora: inicio,
      duracionMin: duracionMin({ inicio, fin }),
      areaId,
    });
    const area = areas.find((a) => a.areaId === areaId);
    if (area && !area.disponible && area.motivo) return MOTIVO_DISPONIBILIDAD[area.motivo];
  } catch {
    // Sin detalle: se usa el mensaje de la API.
  }
  return null;
}

export async function reservar(
  _prevState: ReservaFormState,
  formData: FormData,
): Promise<ReservaFormState> {
  const areaId = Number(formData.get("areaId"));
  const fecha = String(formData.get("fecha") ?? "");
  const inicio = String(formData.get("inicio") ?? "");
  const fin = String(formData.get("fin") ?? "");

  if (!areaId) return rechazo("general", "Elige un área común.");
  if (!esFechaValida(fecha)) return rechazo("general", "Elige una fecha válida.");
  if (fecha < hoyEnCondominio()) return rechazo("fuera-de-horario", "No se puede reservar en una fecha pasada.");
  if (!HORA_REGEX.test(inicio) || !HORA_REGEX.test(fin) || fin <= inicio) {
    return rechazo("general", "Elige un horario.");
  }
  if (formData.get("acepta") !== "on") {
    return rechazo("general", "Confirma que leíste las condiciones de uso del área.");
  }

  let reservaId: number;
  try {
    const reserva = await crearReserva({
      areaId,
      inicio: aIsoCondominio(fecha, inicio),
      fin: aIsoCondominio(fecha, fin),
    });
    reservaId = reserva.reservaId;
  } catch (error) {
    // La disponibilidad cambió: se refresca la pantalla para que la franja se vea ocupada.
    revalidatePath(RUTA_NUEVA_RESERVA);
    if (!(error instanceof ApiError)) {
      console.error("Error al crear la reserva:", error);
      return rechazo("general");
    }
    if (error.status === 401) await expireSession();

    const mensajeApi = error.codigo ? error.message : undefined;
    switch (error.codigo) {
      case "RESERVA_CRUZADA":
        return rechazo("reservada", mensajeApi);
      case "FUERA_DE_HORARIO": {
        const motivo = (await motivoReal(areaId, fecha, inicio, fin)) ?? "fuera-de-horario";
        // Si se identificó la causa, el mensaje propio es más claro que el genérico de la API.
        return rechazo(motivo, motivo === "fuera-de-horario" ? mensajeApi : undefined);
      }
      case "AREA_INEXISTENTE":
        return rechazo("general", "El área ya no existe. Elige otra.");
      case "ROL_NO_PERMITIDO":
        return rechazo("general", "Solo los residentes pueden reservar áreas comunes.");
      case "SOLICITUD_INVALIDA":
        return rechazo("general", "Revisa el área, la fecha y el horario.");
      default:
        return rechazo("general", mensajeApi);
    }
  }

  revalidatePath(RUTA_MIS_RESERVAS);
  revalidatePath(RUTA_NUEVA_RESERVA);
  redirect(`${RUTA_MIS_RESERVAS}?ok=creada&reserva=${reservaId}`);
}

export async function cancelar(
  _prevState: CancelarReservaState,
  formData: FormData,
): Promise<CancelarReservaState> {
  const reservaId = Number(formData.get("reservaId"));
  if (!reservaId) return { error: "Reserva no válida." };

  try {
    await cancelarReserva(reservaId);
  } catch (error) {
    if (!(error instanceof ApiError)) {
      console.error("Error al cancelar la reserva:", error);
      return { error: "No se pudo cancelar la reserva. Intenta más tarde." };
    }
    if (error.status === 401) await expireSession();
    switch (error.codigo) {
      case "TRANSICION_INVALIDA":
        return { error: error.message || "Esta reserva ya no se puede cancelar." };
      case "RECURSO_AJENO":
        return { error: "Solo puedes cancelar reservas de tu unidad." };
      default:
        return {
          error: error.codigo ? error.message : "No se pudo cancelar la reserva. Intenta más tarde.",
        };
    }
  }

  revalidatePath(RUTA_MIS_RESERVAS);
  redirect(`${RUTA_MIS_RESERVAS}?ok=cancelada`);
}
