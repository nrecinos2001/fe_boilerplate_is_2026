import { ACCESS_DENIED_MESSAGE } from "@/src/components/access-denied";
import { apiFetch } from "@/src/services/http/api-client";
import { readErrorMessage } from "@/src/services/http/error-message";
import type {
  SellDropInInput,
  SellMembershipInput,
  SoldDropIn,
  SoldMembership,
} from "@/src/types/membership-sales";
import type { ServiceResult } from "@/src/types/service-result";

export const SELL_MEMBERSHIP_ERROR = "No pudimos registrar la membresía. Intenta de nuevo.";
export const SELL_DROP_IN_ERROR = "No pudimos registrar la clase suelta. Intenta de nuevo.";

/**
 * POST /memberships (BE-4.1, Recepción y Administrador). Registra la compra o
 * renovación con su cobro pendiente.
 *
 * - 400, 404 y 409: el motivo del servidor (plan desactivado, fecha pasada,
 *   miembro o plan inexistente, membresía pendiente de pago).
 * - 403: acceso denegado.
 */
export function sellMembership(input: SellMembershipInput): Promise<ServiceResult<SoldMembership>> {
  return post<SoldMembership>("memberships", input, SELL_MEMBERSHIP_ERROR);
}

/**
 * POST /memberships/drop-in (BE-4.2): cobra la clase suelta y ocupa el cupo en
 * una sola operación. Con 400 por tarjeta rechazada, `error` es el motivo de la
 * pasarela; con 409, el del cupo o la clase ("La clase está llena.").
 */
export function sellDropIn(input: SellDropInInput): Promise<ServiceResult<SoldDropIn>> {
  return post<SoldDropIn>("memberships/drop-in", input, SELL_DROP_IN_ERROR);
}

async function post<T>(path: string, body: object, fallback: string): Promise<ServiceResult<T>> {
  try {
    const res = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
    if (res.status === 201) return { ok: true, data: (await res.json()) as T, status: 201 };
    if (res.status === 403) return { ok: false, error: ACCESS_DENIED_MESSAGE, status: 403 };
    if ([400, 404, 409].includes(res.status)) {
      const error = (await readErrorMessage(res)) ?? fallback;
      return { ok: false, error, status: res.status };
    }
    return { ok: false, error: fallback, status: res.status };
  } catch {
    return { ok: false, error: fallback, status: 0 };
  }
}
