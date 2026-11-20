import { apiFetch } from "@/src/services/http/api-client";
import type {
  MachineArea,
  MachineAvailability,
  MachinePage,
  MachineServiceResult,
  MachineStatus,
  MachineStatusChange,
  MachineStatusChangeResult,
} from "@/src/types/machines";

export const LOAD_MACHINES_ERROR = "No pudimos cargar las máquinas.";
export const LOAD_HISTORY_ERROR = "No pudimos cargar el historial.";
export const SAVE_STATUS_ERROR = "No pudimos guardar el cambio. Vuelve a intentarlo.";

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join(" ");
    if (typeof data.message === "string") return data.message;
  } catch {
    // Sin cuerpo JSON: se usa el mensaje genérico.
  }
  return fallback;
}

async function request<T>(
  path: string,
  fallback: string,
  init?: RequestInit,
): Promise<MachineServiceResult<T>> {
  try {
    const res = await apiFetch(path, init);
    if (!res.ok) {
      // En un 5xx el mensaje del servidor no le sirve al usuario.
      const error = res.status >= 500 ? fallback : await parseErrorMessage(res, fallback);
      return { ok: false, error, status: res.status };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, error: fallback, status: 0 };
  }
}

/** Inventario paginado del administrador (H20), ordenado por área y nombre. */
export function fetchMachines(
  page: number,
  area?: MachineArea,
): Promise<MachineServiceResult<MachinePage>> {
  const query = new URLSearchParams({ page: String(page) });
  if (area) query.set("area", area);
  return request<MachinePage>(`machines?${query.toString()}`, LOAD_MACHINES_ERROR);
}

/** Historial de una máquina, del más reciente al más antiguo (H20). */
export async function fetchMachineHistory(
  machineId: number,
): Promise<MachineServiceResult<MachineStatusChange[]>> {
  const res = await request<{ data: MachineStatusChange[] }>(
    `machines/${machineId}/status-history`,
    LOAD_HISTORY_ERROR,
  );
  return res.ok ? { ok: true, data: res.data.data } : res;
}

/**
 * Cambia el estado de una máquina con su motivo (H20). Un 400 o 409 trae el
 * mensaje del backend, por ejemplo "La máquina ya está en ese estado.".
 */
export function changeMachineStatus(
  machineId: number,
  status: MachineStatus,
  reason: string,
): Promise<MachineServiceResult<MachineStatusChangeResult>> {
  return request<MachineStatusChangeResult>(`machines/${machineId}/status`, SAVE_STATUS_ERROR, {
    method: "PATCH",
    body: JSON.stringify({ status, reason: reason.trim() }),
  });
}

/** Estado público de las máquinas, para cualquier usuario con sesión (H21). */
export async function fetchMachineAvailability(filters: {
  area?: MachineArea;
  status?: MachineStatus;
}): Promise<MachineServiceResult<MachineAvailability[]>> {
  const query = new URLSearchParams();
  if (filters.area) query.set("area", filters.area);
  if (filters.status) query.set("status", filters.status);
  const qs = query.toString();
  const res = await request<{ data: MachineAvailability[] }>(
    `machines/availability${qs ? `?${qs}` : ""}`,
    LOAD_MACHINES_ERROR,
  );
  return res.ok ? { ok: true, data: res.data.data } : res;
}
