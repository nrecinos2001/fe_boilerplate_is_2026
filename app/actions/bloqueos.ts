"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { createBloqueo, deleteBloqueo } from "@/lib/areas-api";
import { MOTIVOS, type MotivoBloqueo } from "@/lib/bloqueos";
import { aIsoCondominio, hoyEnCondominio } from "@/lib/condominio";
import { expireSession } from "@/lib/session";

export type BloqueoFormState = {
  error?: string;
  ok?: string;
};

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function mensajeError(error: ApiError, operacion: "crear" | "quitar") {
  // Si la API envía un mensaje propio, se muestra tal cual.
  if (error.codigo && error.message) return error.message;
  switch (error.status) {
    case 403:
      return "Solo un administrador puede gestionar bloqueos.";
    case 404:
      return "El área o el bloqueo ya no existe. Recarga la página.";
    case 409:
      return "La franja se cruza con otro bloqueo o con reservas confirmadas.";
    case 400:
    case 422:
      return "Revisa la fecha y la franja horaria.";
    default:
      return `No se pudo ${operacion} el bloqueo. Intenta más tarde.`;
  }
}

export async function crearBloqueo(
  _prevState: BloqueoFormState,
  formData: FormData,
): Promise<BloqueoFormState> {
  const areaId = Number(formData.get("areaId"));
  const fecha = String(formData.get("fecha") ?? "");
  const desde = String(formData.get("desde") ?? "");
  const hasta = String(formData.get("hasta") ?? "");
  const motivo = String(formData.get("motivo") ?? "") as MotivoBloqueo;

  if (!areaId) return { error: "Área no válida." };
  if (!FECHA_REGEX.test(fecha)) return { error: "Elige la fecha del bloqueo." };
  if (fecha < hoyEnCondominio()) return { error: "La fecha no puede ser anterior a hoy." };
  if (!HORA_REGEX.test(desde) || !HORA_REGEX.test(hasta)) {
    return { error: "Elige la franja horaria." };
  }
  if (hasta <= desde) return { error: "El fin debe ser posterior al inicio." };
  if (!(motivo in MOTIVOS)) return { error: "Elige el motivo del bloqueo." };

  try {
    await createBloqueo(areaId, {
      inicio: aIsoCondominio(fecha, desde),
      fin: aIsoCondominio(fecha, hasta),
      motivo,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) await expireSession();
      return { error: mensajeError(error, "crear") };
    }
    console.error("Error al crear el bloqueo:", error);
    return { error: "No se pudo crear el bloqueo. Intenta más tarde." };
  }

  revalidatePath("/areas");
  return { ok: "Bloqueo aplicado. La franja ya no está disponible para reservas." };
}

export async function quitarBloqueo(
  _prevState: BloqueoFormState,
  formData: FormData,
): Promise<BloqueoFormState> {
  const areaId = Number(formData.get("areaId"));
  const bloqueoId = Number(formData.get("bloqueoId"));
  if (!areaId || !bloqueoId) return { error: "Bloqueo no válido." };

  try {
    await deleteBloqueo(areaId, bloqueoId);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) await expireSession();
      return { error: mensajeError(error, "quitar") };
    }
    console.error("Error al quitar el bloqueo:", error);
    return { error: "No se pudo quitar el bloqueo. Intenta más tarde." };
  }

  revalidatePath("/areas");
  return { ok: "Bloqueo quitado." };
}
