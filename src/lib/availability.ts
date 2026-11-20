import type { AvailabilityBlock } from "@/src/types/availability";

export const SLOT_MINUTES = 60;
/** Franja horaria que muestra la grilla (06:00 – 22:00). */
export const GRID_HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
export const WEEKDAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const WEEKDAY_LONG = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function formatMinutes(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Valida el rango del formulario. Devuelve el mensaje de error o null si es válido. */
export function validateRange(start: string, end: string): string | null {
  if (!TIME_RE.test(start) || !TIME_RE.test(end)) return "Completa la hora de inicio y de fin.";
  const diff = toMinutes(end) - toMinutes(start);
  if (diff <= 0) return "La hora de fin debe ser posterior a la de inicio.";
  if (diff < SLOT_MINUTES) return "El bloque debe durar al menos 60 minutos.";
  return null;
}

/** Cantidad de espacios completos de 60 min que caben en el rango. */
export function slotCount(start: string, end: string): number {
  return Math.max(0, Math.floor((toMinutes(end) - toMinutes(start)) / SLOT_MINUTES));
}

/** Total de espacios de 60 min que ofrece un bloque. */
export function blockSlots(block: Pick<AvailabilityBlock, "startTime" | "endTime">): number {
  return slotCount(block.startTime, block.endTime);
}

/** Lunes (00:00 local) de la semana que contiene `date`. */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Bloque que se solapa con la celda [hour:00, hour+1:00) del día `weekday` (1-7). */
export function blockAtCell(
  blocks: AvailabilityBlock[],
  weekday: number,
  hour: number,
): AvailabilityBlock | undefined {
  const cellStart = hour * 60;
  const cellEnd = cellStart + SLOT_MINUTES;
  return blocks.find(
    (b) =>
      b.weekday === weekday &&
      toMinutes(b.startTime) < cellEnd &&
      toMinutes(b.endTime) > cellStart,
  );
}

/** Espacios ofrecidos por día (índice 0 = lunes). */
export function slotsPerWeekday(blocks: AvailabilityBlock[]): number[] {
  const result = [0, 0, 0, 0, 0, 0, 0];
  for (const b of blocks) result[b.weekday - 1] += blockSlots(b);
  return result;
}

/** Primer espacio de 60 min que empieza después de `now` en la semana de `monday`. */
export function nextFreeSlot(
  blocks: AvailabilityBlock[],
  monday: Date,
  now: Date,
): { date: Date; weekdayIndex: number } | null {
  const slots: Date[] = [];
  for (const b of blocks) {
    const day = addDays(monday, b.weekday - 1);
    const start = toMinutes(b.startTime);
    for (let i = 0; i < blockSlots(b); i++) {
      const d = new Date(day);
      d.setMinutes(start + i * SLOT_MINUTES);
      slots.push(d);
    }
  }
  const next = slots.filter((d) => d > now).sort((a, b) => a.getTime() - b.getTime())[0];
  return next ? { date: next, weekdayIndex: (next.getDay() + 6) % 7 } : null;
}
