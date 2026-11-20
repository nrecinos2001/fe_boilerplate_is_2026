import { apiFetch } from "@/src/services/http/api-client";
import type { MembershipServiceResult, MyMembership } from "@/src/types/membership";

export const LOAD_MEMBERSHIP_ERROR = "No pudimos cargar tu membresía.";
export const MEMBERSHIP_UNAVAILABLE_ERROR = "La consulta de membresías todavía no está disponible.";

/**
 * H05 · Membresía del miembro que inició sesión. No recibe ningún id: el
 * backend toma al miembro del token, así que no se puede pedir la de otro.
 */
export async function fetchMyMembership(): Promise<MembershipServiceResult<MyMembership>> {
  try {
    const res = await apiFetch("memberships/me");
    if (res.ok) return { ok: true, data: (await res.json()) as MyMembership };
    // 503: el cálculo de estado (H04) aún no está desplegado.
    const error = res.status === 503 ? MEMBERSHIP_UNAVAILABLE_ERROR : LOAD_MEMBERSHIP_ERROR;
    return { ok: false, error, status: res.status };
  } catch {
    return { ok: false, error: LOAD_MEMBERSHIP_ERROR, status: 0 };
  }
}
