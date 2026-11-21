// Tipos y utilidades de la consulta de disponibilidad de áreas (H4). Sin dependencias
// de servidor: se puede importar desde componentes cliente.
import type { Area } from "@/lib/areas";
import { limitesFranjas } from "@/lib/bloqueos";

/** Por qué un área no está disponible en el intervalo consultado. */
export type MotivoNoDisponible = "FUERA_DE_HORARIO" | "BLOQUEADA" | "RESERVADA";

export type DisponibilidadArea = {
  areaId: number;
  nombre: string;
  capacidad: number;
  disponible: boolean;
  motivo: MotivoNoDisponible | null;
};

/** Respuesta de GET /areas/disponibilidad. */
export type Disponibilidad = {
  fecha: string;
  hora: string;
  areas: DisponibilidadArea[];
};

export type ConsultaDisponibilidad = {
  /** "YYYY-MM-DD" */
  fecha: string;
  /** "HH:mm" */
  hora: string;
  duracionMin: number;
  areaId?: number;
};

/** Franja horaria de un día, en hora local del condominio ("HH:mm"). */
export type Franja = { inicio: string; fin: string };

export const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const RUTA_DISPONIBILIDAD = "/areas/disponibilidad";

/** Filtros de la consulta, tal como viajan en la URL. */
export type FiltrosDisponibilidad = {
  fecha?: string;
  area?: string | number;
  franja?: string;
  pagina?: number;
};

export function hrefDisponibilidad({ fecha, area, franja, pagina }: FiltrosDisponibilidad) {
  const sp = new URLSearchParams();
  if (fecha) sp.set("fecha", fecha);
  if (area !== undefined && area !== "") sp.set("area", String(area));
  if (franja) sp.set("franja", franja);
  if (pagina && pagina > 1) sp.set("pagina", String(pagina));
  const qs = sp.toString();
  return `${RUTA_DISPONIBILIDAD}${qs ? `?${qs}` : ""}`;
}

const aMinutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

/** Identificador estable de una franja, para URLs y keys: "10:00-12:00". */
export function franjaId({ inicio, fin }: Franja) {
  return `${inicio}-${fin}`;
}

export function formatFranja({ inicio, fin }: Franja) {
  return `${inicio}–${fin}`;
}

export function duracionMin({ inicio, fin }: Franja) {
  return aMinutos(fin) - aMinutos(inicio);
}

/** Franjas reservables de un área en una fecha (según su horario y su bloque). */
export function franjasDeArea(area: Area, fecha: string): Franja[] {
  const limites = limitesFranjas(area.horarios ?? [], fecha, area.duracionBloque || 1);
  return limites.slice(0, -1).map((inicio, i) => ({ inicio, fin: limites[i + 1] }));
}

/** Unión ordenada de las franjas de varias áreas: son las columnas de la tabla. */
export function franjasDelDia(areas: Area[], fecha: string): Franja[] {
  const unicas = new Map<string, Franja>();
  for (const area of areas) {
    for (const franja of franjasDeArea(area, fecha)) unicas.set(franjaId(franja), franja);
  }
  return [...unicas.values()].sort(
    (a, b) => a.inicio.localeCompare(b.inicio) || a.fin.localeCompare(b.fin),
  );
}

/** true si `fecha` es "YYYY-MM-DD" y corresponde a un día real (descarta "2026-02-30"). */
export function esFechaValida(fecha: string) {
  if (!FECHA_REGEX.test(fecha)) return false;
  const d = new Date(`${fecha}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

/** Suma (o resta) días a una fecha "YYYY-MM-DD". */
export function sumarDias(fecha: string, dias: number) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const enUTC = (fecha: string) => new Date(`${fecha}T12:00:00Z`);

/** "2026-11-07" → "07 nov 2026" */
export function fechaCorta(fecha: string) {
  return new Intl.DateTimeFormat("es", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(enUTC(fecha))
    .replace(".", "");
}

/** "2026-11-07" → "Sábado, 07 de noviembre de 2026" */
export function fechaTitulo(fecha: string) {
  const texto = new Intl.DateTimeFormat("es", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(enUTC(fecha));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
