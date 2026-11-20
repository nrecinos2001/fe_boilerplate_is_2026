import { ACCESS_DENIED_MESSAGE } from "@/src/components/access-denied";
import { apiFetch } from "@/src/services/http/api-client";
import { readErrorMessage } from "@/src/services/http/error-message";
import type { CreatePlanInput, Plan, UpdatePlanInput } from "@/src/types/plans";
import type { ServiceResult } from "@/src/types/service-result";

export const PLAN_NAME_TAKEN_MESSAGE = "Ya existe un plan con ese nombre.";
export const LOAD_PLANS_ERROR = "No pudimos cargar los planes. Intenta de nuevo.";
export const SAVE_PLAN_ERROR = "No pudimos guardar el plan. Intenta de nuevo.";
export const DEACTIVATE_PLAN_ERROR = "No pudimos desactivar el plan. Intenta de nuevo.";

/** GET /plans: todos los planes, o solo los activos con `activeOnly`. */
export async function fetchPlans(activeOnly = false): Promise<ServiceResult<Plan[]>> {
  try {
    const res = await apiFetch(activeOnly ? "plans?active=true" : "plans");
    if (!res.ok) return failure(res, LOAD_PLANS_ERROR);
    const body = (await res.json()) as { data: Plan[] };
    return { ok: true, data: body.data, status: res.status };
  } catch {
    return { ok: false, error: LOAD_PLANS_ERROR, status: 0 };
  }
}

/** POST /plans (Administrador). */
export function createPlan(input: CreatePlanInput): Promise<ServiceResult<Plan>> {
  return sendPlan("plans", "POST", input, SAVE_PLAN_ERROR);
}

/** PATCH /plans/{id} (Administrador). */
export function updatePlan(id: number, input: UpdatePlanInput): Promise<ServiceResult<Plan>> {
  return sendPlan(`plans/${id}`, "PATCH", input, SAVE_PLAN_ERROR);
}

/** PATCH /plans/{id}/deactivate (Administrador). */
export function deactivatePlan(id: number): Promise<ServiceResult<Plan>> {
  return sendPlan(`plans/${id}/deactivate`, "PATCH", undefined, DEACTIVATE_PLAN_ERROR);
}

async function sendPlan(
  path: string,
  method: "POST" | "PATCH",
  body: object | undefined,
  fallback: string,
): Promise<ServiceResult<Plan>> {
  try {
    const res = await apiFetch(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) return failure(res, fallback);
    return { ok: true, data: (await res.json()) as Plan, status: res.status };
  } catch {
    return { ok: false, error: fallback, status: 0 };
  }
}

/**
 * - 400 y 409: el motivo del servidor (dato inválido, nombre repetido o clase
 *   suelta activa duplicada).
 * - 403: acceso denegado.
 * - El resto: el mensaje genérico de la acción.
 */
async function failure(res: Response, fallback: string): Promise<{ ok: false; error: string; status: number }> {
  if (res.status === 403) return { ok: false, error: ACCESS_DENIED_MESSAGE, status: 403 };
  if (res.status === 400 || res.status === 409) {
    const message = await readErrorMessage(res);
    const error = message ?? (res.status === 409 ? PLAN_NAME_TAKEN_MESSAGE : fallback);
    return { ok: false, error, status: res.status };
  }
  return { ok: false, error: fallback, status: res.status };
}
