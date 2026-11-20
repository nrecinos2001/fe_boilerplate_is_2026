import { ACCESS_DENIED_MESSAGE } from "@/src/components/access-denied";
import { apiFetch } from "@/src/services/http/api-client";
import { readErrorMessage } from "@/src/services/http/error-message";
import type { CheckInMember, CheckInResult } from "@/src/types/check-ins";
import type { ServiceResult } from "@/src/types/service-result";

export const LOOKUP_ERROR = "No pudimos buscar miembros. Intenta de nuevo.";
export const CHECK_IN_ERROR = "No pudimos registrar el ingreso. Intenta de nuevo.";

/** GET /check-ins/lookup?q= (Recepción y Administrador): máximo 10 miembros con su estado. */
export async function lookupMembers(q: string): Promise<ServiceResult<CheckInMember[]>> {
  try {
    const res = await apiFetch(
      `check-ins/lookup?${new URLSearchParams({ q: q.trim() }).toString()}`,
    );
    if (!res.ok) {
      const error = res.status === 403 ? ACCESS_DENIED_MESSAGE : LOOKUP_ERROR;
      return { ok: false, error, status: res.status };
    }
    const body = (await res.json()) as { data: CheckInMember[] };
    return { ok: true, data: body.data, status: res.status };
  } catch {
    return { ok: false, error: LOOKUP_ERROR, status: 0 };
  }
}

/**
 * POST /check-ins: registra el ingreso con la hora del servidor.
 * 409 trae "Este miembro ya registró su ingreso hace menos de 30 minutos.".
 */
export async function registerCheckIn(memberId: string): Promise<ServiceResult<CheckInResult>> {
  try {
    const res = await apiFetch("check-ins", { method: "POST", body: JSON.stringify({ memberId }) });
    if (res.status === 201) {
      return { ok: true, data: (await res.json()) as CheckInResult, status: 201 };
    }
    if (res.status === 403) return { ok: false, error: ACCESS_DENIED_MESSAGE, status: 403 };
    if ([400, 404, 409].includes(res.status)) {
      const error = (await readErrorMessage(res)) ?? CHECK_IN_ERROR;
      return { ok: false, error, status: res.status };
    }
    return { ok: false, error: CHECK_IN_ERROR, status: res.status };
  } catch {
    return { ok: false, error: CHECK_IN_ERROR, status: 0 };
  }
}
