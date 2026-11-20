// Contrato del módulo de máquinas del backend (H20 y H21).

export type MachineArea = "CARDIO" | "STRENGTH" | "FREE_WEIGHTS" | "FUNCTIONAL";

export type MachineStatus = "OPERATIONAL" | "UNDER_MAINTENANCE" | "OUT_OF_SERVICE";

/** Fila del inventario que ve el administrador (GET /machines). */
export interface Machine {
  id: number;
  code: string;
  name: string;
  area: MachineArea;
  status: MachineStatus;
}

export interface MachinePage {
  data: Machine[];
  total: number;
  page: number;
  pageSize: number;
}

/** Una fila del historial (GET /machines/{id}/status-history). */
export interface MachineStatusChange {
  fromStatus: MachineStatus;
  toStatus: MachineStatus;
  reason: string;
  changedBy: string;
  changedAt: string;
}

/** Respuesta de PATCH /machines/{id}/status. */
export interface MachineStatusChangeResult {
  machineId: number;
  status: MachineStatus;
  changedAt: string;
  changedBy: string;
}

/** Lo que ve cualquier usuario de una máquina (GET /machines/availability). */
export interface MachineAvailability {
  name: string;
  area: MachineArea;
  status: MachineStatus;
}

export type MachineServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

// Orden del backend: los enums de Postgres se ordenan como se declararon.
export const MACHINE_AREAS: readonly MachineArea[] = [
  "CARDIO",
  "STRENGTH",
  "FREE_WEIGHTS",
  "FUNCTIONAL",
];

export const MACHINE_STATUSES: readonly MachineStatus[] = [
  "OPERATIONAL",
  "UNDER_MAINTENANCE",
  "OUT_OF_SERVICE",
];

export const AREA_LABELS: Record<MachineArea, string> = {
  CARDIO: "Cardio",
  STRENGTH: "Fuerza",
  FREE_WEIGHTS: "Peso libre",
  FUNCTIONAL: "Funcional",
};

export const STATUS_LABELS: Record<MachineStatus, string> = {
  OPERATIONAL: "Operativa",
  UNDER_MAINTENANCE: "En mantenimiento",
  OUT_OF_SERVICE: "Fuera de servicio",
};

export const REASON_MIN_LENGTH = 5;
export const REASON_MAX_LENGTH = 200;
export const MISSING_REASON_MESSAGE = "Escribe el motivo del cambio.";
export const REASON_LENGTH_MESSAGE = `El motivo debe tener entre ${REASON_MIN_LENGTH} y ${REASON_MAX_LENGTH} caracteres.`;

/** Estados a los que puede pasar una máquina: nunca el que ya tiene. */
export function statusOptionsFor(current: MachineStatus): MachineStatus[] {
  return MACHINE_STATUSES.filter((status) => status !== current);
}

/**
 * Valida el motivo igual que el backend (se recorta antes de validar).
 * Devuelve el mensaje de error o null si es válido.
 */
export function validateReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (trimmed.length === 0) return MISSING_REASON_MESSAGE;
  if (trimmed.length < REASON_MIN_LENGTH || trimmed.length > REASON_MAX_LENGTH) {
    return REASON_LENGTH_MESSAGE;
  }
  return null;
}

/** "07/11/2026 18:30" en la hora local del navegador. */
export function formatChangeDate(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
