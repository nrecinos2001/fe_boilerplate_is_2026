"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import {
  cambiarEstadoReglaCuota,
  createReglaCuota,
  updateReglaCuota,
} from "@/lib/reglas-cuota-api";
import {
  RUTA_REGLAS,
  validarRegla,
  type EstadoRegla,
  type ReglaFieldErrors,
  type ReglaFormValues,
} from "@/lib/reglas-cuota";
import { expireSession } from "@/lib/session";

export type ReglaFormState = {
  error?: { titulo: string; mensaje: string };
  fieldErrors?: ReglaFieldErrors;
};

export type EstadoReglaState = {
  error?: { titulo: string; mensaje: string };
};

const ESTADOS: EstadoRegla[] = ["ACTIVA", "PAUSADA", "INACTIVA"];

function mensajeError(error: ApiError, operacion: "guardar" | "estado") {
  switch (error.codigo) {
    case "REGLA_INCOMPLETA":
      // El backend detalla qué falta: "Para activar la regla falta: el monto, unidades aplicables."
      return {
        titulo: "Falta configurar la regla",
        mensaje:
          error.message +
          (operacion === "guardar"
            ? " Complétalo o guarda la regla como inactiva para terminarla después."
            : " Configúralo antes de activarla."),
      };
    case "REGLA_DUPLICADA":
      return {
        titulo: "La regla ya existe",
        mensaje: "Ya hay una regla vigente con el mismo concepto y alcance. Cambia uno de los dos.",
      };
    case "TRANSICION_INVALIDA":
      return { titulo: "La regla ya tiene ese estado", mensaje: "Recarga la página para ver su estado actual." };
    case "REGLA_INEXISTENTE":
      return { titulo: "La regla ya no existe", mensaje: "Vuelve a la lista y recárgala." };
    case "ROL_NO_PERMITIDO":
      return {
        titulo: "Sin permiso",
        mensaje: "Solo un administrador puede configurar las reglas de cuotas.",
      };
    case "SOLICITUD_INVALIDA":
      return { titulo: "Revisa los datos", mensaje: error.message };
    default:
      return {
        titulo: operacion === "guardar" ? "No se pudo guardar la regla" : "No se pudo cambiar el estado",
        mensaje: "Intenta de nuevo en unos minutos.",
      };
  }
}

export async function guardarRegla(
  _prevState: ReglaFormState,
  formData: FormData,
): Promise<ReglaFormState> {
  const id = Number(formData.get("id")) || null;

  let values: ReglaFormValues;
  try {
    values = JSON.parse(String(formData.get("valores") ?? ""));
  } catch {
    return { error: { titulo: "Revisa los datos", mensaje: "El formulario llegó incompleto." } };
  }

  const { errors, input } = validarRegla(values, { creando: !id });
  if (Object.keys(errors).length > 0) {
    return {
      error: { titulo: "Revisa los campos marcados", mensaje: "Hay datos faltantes o fuera de rango." },
      fieldErrors: errors,
    };
  }

  try {
    if (id) await updateReglaCuota(id, input);
    else await createReglaCuota(input);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) await expireSession();
      return { error: mensajeError(error, "guardar") };
    }
    console.error("Error al guardar la regla de cuota:", error);
    return { error: mensajeError(new ApiError(500, ""), "guardar") };
  }

  revalidatePath(RUTA_REGLAS);
  redirect(`${RUTA_REGLAS}?ok=${id ? "actualizada" : "creada"}`);
}

export async function cambiarEstadoRegla(
  _prevState: EstadoReglaState,
  formData: FormData,
): Promise<EstadoReglaState> {
  const id = Number(formData.get("id"));
  const estado = String(formData.get("estado")) as EstadoRegla;
  if (!id || !ESTADOS.includes(estado)) {
    return { error: { titulo: "Solicitud no válida", mensaje: "Recarga la página e intenta de nuevo." } };
  }

  try {
    await cambiarEstadoReglaCuota(id, estado);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) await expireSession();
      return { error: mensajeError(error, "estado") };
    }
    console.error("Error al cambiar el estado de la regla:", error);
    return { error: mensajeError(new ApiError(500, ""), "estado") };
  }

  revalidatePath(RUTA_REGLAS);
  redirect(`${RUTA_REGLAS}?ok=${estado.toLowerCase()}`);
}
