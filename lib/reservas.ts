// Tipos y utilidades de reservas de áreas comunes (H5). Sin dependencias de servidor.
import { CONDOMINIO } from "@/lib/condominio";

export type EstadoReserva = "PENDIENTE" | "CONFIRMADA" | "CANCELADA";

/** Respuesta de POST /reservas (y, por contrato supuesto, cada elemento de GET /reservas). */
export type Reserva = {
  reservaId: number;
  areaId: number;
  /** ISO 8601 con desfase */
  inicio: string;
  /** ISO 8601 con desfase */
  fin: string;
  estado: EstadoReserva;
};

export type ReservaInput = Pick<Reserva, "areaId" | "inicio" | "fin">;

/** Estado tal como se muestra: una reserva confirmada que ya terminó está "Finalizada". */
export type EstadoVista = "confirmada" | "pendiente" | "finalizada" | "cancelada";

export const ESTADO_VISTA: Record<EstadoVista, { texto: string; clase: string }> = {
  confirmada: { texto: "Confirmada", clase: "bg-sage/30" },
  pendiente: { texto: "Pendiente", clase: "bg-sand/40" },
  finalizada: { texto: "Finalizada", clase: "bg-sand/40" },
  cancelada: { texto: "Cancelada", clase: "bg-sand/40" },
};

export type ReservaVista = {
  id: number;
  areaId: number;
  folio: string;
  /** Año en hora local, para el filtro de periodo. */
  anio: number;
  /** "07 nov 2026" */
  fecha: string;
  /** "16:00–18:00 h" */
  horario: string;
  estado: EstadoVista;
  /** Próxima: aún no termina y no está cancelada. Solo estas se pueden cancelar. */
  proxima: boolean;
  /** Para ordenar. */
  inicioMs: number;
};

const zona = { timeZone: CONDOMINIO.zonaHoraria };
const formatoDia = new Intl.DateTimeFormat("en-CA", zona);
const formatoFecha = new Intl.DateTimeFormat("es", {
  ...zona,
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const formatoHora = new Intl.DateTimeFormat("es", {
  ...zona,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Folio legible: "HB-261107-014" (fecha local de la reserva + id). */
export function folio(reserva: Pick<Reserva, "reservaId" | "inicio">) {
  const [anio, mes, dia] = formatoDia.format(new Date(reserva.inicio)).split("-");
  return `HB-${anio.slice(2)}${mes}${dia}-${String(reserva.reservaId).padStart(3, "0")}`;
}

export function aVistaReserva(reserva: Reserva, ahora: number): ReservaVista {
  const inicio = new Date(reserva.inicio);
  const fin = new Date(reserva.fin);
  const terminada = fin.getTime() <= ahora;
  const estado: EstadoVista =
    reserva.estado === "CANCELADA"
      ? "cancelada"
      : terminada
        ? "finalizada"
        : reserva.estado === "PENDIENTE"
          ? "pendiente"
          : "confirmada";
  return {
    id: reserva.reservaId,
    areaId: reserva.areaId,
    folio: folio(reserva),
    anio: Number(formatoDia.format(inicio).slice(0, 4)),
    fecha: formatoFecha.format(inicio).replace(".", ""),
    horario: `${formatoHora.format(inicio)}–${formatoHora.format(fin)} h`,
    estado,
    proxima: estado === "confirmada" || estado === "pendiente",
    inicioMs: inicio.getTime(),
  };
}

/** Reservas listas para mostrar, de la más reciente a la más antigua. */
export function reservasVista(reservas: Reserva[], ahora = Date.now()) {
  return reservas.map((r) => aVistaReserva(r, ahora)).sort((a, b) => b.inicioMs - a.inicioMs);
}

export function formatDuracion(minutos: number) {
  if (minutos % 60 === 0) {
    const horas = minutos / 60;
    return `${horas} ${horas === 1 ? "hora" : "horas"}`;
  }
  return `${minutos} min`;
}

export const RUTA_NUEVA_RESERVA = "/reservas/nueva";
export const RUTA_MIS_RESERVAS = "/reservas";

export function hrefNuevaReserva({
  area,
  fecha,
  franja,
}: {
  area?: number | string;
  fecha?: string;
  franja?: string;
}) {
  const sp = new URLSearchParams();
  if (area !== undefined && area !== "") sp.set("area", String(area));
  if (fecha) sp.set("fecha", fecha);
  if (franja) sp.set("franja", franja);
  const qs = sp.toString();
  return `${RUTA_NUEVA_RESERVA}${qs ? `?${qs}` : ""}`;
}
