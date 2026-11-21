// Tipos y utilidades de bloqueos de áreas. Sin dependencias de servidor.
import type { Horario } from "@/lib/areas";
import { CONDOMINIO } from "@/lib/condominio";

export const MOTIVOS = {
  MANTENIMIENTO: "Mantenimiento",
  RENOVACION: "Renovación",
  OTRO: "Otro",
} as const;

export type MotivoBloqueo = keyof typeof MOTIVOS;

export type Bloqueo = {
  id: number;
  areaId: number;
  /** ISO 8601 */
  inicio: string;
  /** ISO 8601 */
  fin: string;
  motivo: MotivoBloqueo;
  creadoEn: string;
};

export type BloqueoInput = Pick<Bloqueo, "inicio" | "fin" | "motivo">;

/** Bloqueo listo para mostrar (formateado en la zona horaria del condominio). */
export type BloqueoVista = {
  id: number;
  fecha: string;
  franja: string;
  motivo: string;
};

const aMinutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

const aHora = (minutos: number) =>
  `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

/** Día de la semana (0 = domingo) de una fecha "YYYY-MM-DD", sin depender de la zona horaria. */
export function diaSemana(fecha: string) {
  return new Date(`${fecha}T12:00:00Z`).getUTCDay();
}

/**
 * Límites de las franjas reservables de un día: con apertura 10:00, cierre 20:00 y bloques
 * de 2 h devuelve ["10:00", "12:00", …, "20:00"]. Vacío si el área no abre ese día.
 */
export function limitesFranjas(horarios: Horario[], fecha: string, duracionHoras: number) {
  const horario = horarios.find((h) => h.diaSemana === diaSemana(fecha));
  if (!horario) return [];

  const apertura = aMinutos(horario.horaApertura.slice(0, 5));
  const cierre = aMinutos(horario.horaCierre.slice(0, 5));
  const paso = Math.max(1, duracionHoras) * 60;

  const limites: string[] = [];
  for (let t = apertura; t < cierre; t += paso) limites.push(aHora(t));
  limites.push(aHora(cierre));
  return limites;
}

const zona = { timeZone: CONDOMINIO.zonaHoraria };
const formatoFecha = new Intl.DateTimeFormat("es", {
  ...zona,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const formatoHora = new Intl.DateTimeFormat("es", {
  ...zona,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const formatoDia = new Intl.DateTimeFormat("en-CA", zona);

/** Prepara un bloqueo para mostrarlo en la zona horaria del condominio. */
export function aVista(bloqueo: Bloqueo): BloqueoVista {
  const inicio = new Date(bloqueo.inicio);
  const fin = new Date(bloqueo.fin);
  const mismoDia = formatoDia.format(inicio) === formatoDia.format(fin);
  return {
    id: bloqueo.id,
    fecha: mismoDia
      ? formatoFecha.format(inicio)
      : `${formatoFecha.format(inicio)} – ${formatoFecha.format(fin)}`,
    franja: mismoDia
      ? `${formatoHora.format(inicio)}–${formatoHora.format(fin)} h`
      : `${formatoHora.format(inicio)} – ${formatoHora.format(fin)} h`,
    motivo: MOTIVOS[bloqueo.motivo] ?? bloqueo.motivo,
  };
}

/** "2026-11-14" → "sábado, 14 de noviembre de 2026" */
export function fechaLarga(fecha: string) {
  return new Intl.DateTimeFormat("es", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${fecha}T12:00:00Z`));
}

/** Bloqueos que aún no terminan, ordenados por inicio y listos para mostrar. */
export function bloqueosVigentes(bloqueos: Bloqueo[], ahora = Date.now()) {
  return bloqueos
    .filter((b) => new Date(b.fin).getTime() >= ahora)
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
    .map(aVista);
}
