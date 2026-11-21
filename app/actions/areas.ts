"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { createArea, deleteArea, updateArea } from "@/lib/areas-api";
import { DIAS, type AreaInput, type Horario } from "@/lib/areas";
import { expireSession } from "@/lib/session";

export type HorarioDiaValues = {
  activo: boolean;
  apertura: string;
  cierre: string;
};

export type AreaFormValues = {
  nombre: string;
  ubicacion: string;
  capacidad: string;
  duracionBloque: string;
  condicionesUso: string;
  /** Indexado por diaSemana (0 = domingo … 6 = sábado). */
  horarios: Record<number, HorarioDiaValues>;
};

export type AreaFormState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  values?: AreaFormValues;
};

export type DeleteAreaState = { error?: string };

const HORARIO_POR_DEFECTO = { apertura: "08:00", cierre: "20:00" };
const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function readValues(formData: FormData): AreaFormValues {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const horarios: AreaFormValues["horarios"] = {};
  for (const { valor } of DIAS) {
    horarios[valor] = {
      activo: formData.get(`dia-${valor}`) === "on",
      // Los inputs de días deshabilitados no se envían: se usa el valor por defecto.
      apertura: text(`apertura-${valor}`) || HORARIO_POR_DEFECTO.apertura,
      cierre: text(`cierre-${valor}`) || HORARIO_POR_DEFECTO.cierre,
    };
  }
  return {
    nombre: text("nombre"),
    ubicacion: text("ubicacion"),
    capacidad: text("capacidad"),
    duracionBloque: text("duracionBloque"),
    condicionesUso: text("condicionesUso"),
    horarios,
  };
}

function validate(values: AreaFormValues) {
  const errors: Record<string, string> = {};
  const entero = (v: string) => (/^\d+$/.test(v) ? Number(v) : NaN);

  if (!values.nombre) errors.nombre = "Ingresa el nombre del área.";
  if (!values.ubicacion) errors.ubicacion = "Ingresa la ubicación.";

  const capacidad = entero(values.capacidad);
  if (!(capacidad > 0)) errors.capacidad = "La capacidad debe ser un número mayor a 0.";

  const duracionBloque = entero(values.duracionBloque);
  if (!(duracionBloque > 0)) errors.duracionBloque = "Elige la duración del bloque.";

  if (!values.condicionesUso) errors.condicionesUso = "Describe las condiciones de uso.";

  const horarios: Horario[] = [];
  for (const { valor, nombre } of DIAS) {
    const dia = values.horarios[valor];
    if (!dia.activo) continue;
    if (!HORA_REGEX.test(dia.apertura) || !HORA_REGEX.test(dia.cierre)) {
      errors[`horario-${valor}`] = `Completa la apertura y el cierre del ${nombre.toLowerCase()}.`;
    } else if (dia.cierre <= dia.apertura) {
      errors[`horario-${valor}`] = "El cierre debe ser posterior a la apertura.";
    } else {
      horarios.push({ diaSemana: valor, horaApertura: dia.apertura, horaCierre: dia.cierre });
    }
  }
  if (!Object.values(values.horarios).some((d) => d.activo)) {
    errors.horarios = "Habilita al menos un día.";
  }

  const input: AreaInput = {
    nombre: values.nombre,
    capacidad,
    ubicacion: values.ubicacion,
    duracionBloque,
    condicionesUso: values.condicionesUso,
    horarios,
  };
  return { errors, input };
}

function apiErrorMessage(error: ApiError, operacion: "guardar" | "eliminar") {
  switch (error.codigo) {
    case "AREA_DUPLICADA":
      return operacion === "eliminar"
        ? "No se puede eliminar: el área tiene reservas futuras confirmadas."
        : "Ya existe un área activa con ese nombre.";
    case "DATOS_INVALIDOS":
      return error.message || "Revisa la capacidad y que el cierre sea posterior a la apertura.";
    case "SOLICITUD_INVALIDA":
      return "Algún dato no tiene el formato esperado. Revisa el formulario.";
    case "ROL_NO_PERMITIDO":
      return "Solo un administrador puede modificar las áreas comunes.";
    case "AREA_INEXISTENTE":
      return "El área ya no existe. Recarga la lista.";
    default:
      return `No se pudo ${operacion} el área. Intenta más tarde.`;
  }
}

export async function saveArea(
  _prevState: AreaFormState,
  formData: FormData,
): Promise<AreaFormState> {
  const id = Number(formData.get("id")) || null;
  const values = readValues(formData);
  const { errors, input } = validate(values);

  if (Object.keys(errors).length > 0) {
    return { error: "Revisa los campos marcados.", fieldErrors: errors, values };
  }

  try {
    if (id) await updateArea(id, input);
    else await createArea(input);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) await expireSession();
      return { error: apiErrorMessage(error, "guardar"), values };
    }
    console.error("Error al guardar el área:", error);
    return { error: "No se pudo guardar el área. Intenta más tarde.", values };
  }

  revalidatePath("/areas");
  redirect(`/areas?ok=${id ? "actualizada" : "creada"}`);
}

export async function removeArea(
  _prevState: DeleteAreaState,
  formData: FormData,
): Promise<DeleteAreaState> {
  const id = Number(formData.get("id"));
  if (!id) return { error: "Área no válida." };

  try {
    await deleteArea(id);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) await expireSession();
      return { error: apiErrorMessage(error, "eliminar") };
    }
    console.error("Error al eliminar el área:", error);
    return { error: "No se pudo eliminar el área. Intenta más tarde." };
  }

  revalidatePath("/areas");
  redirect("/areas?ok=eliminada");
}
