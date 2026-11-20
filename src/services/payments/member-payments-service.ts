import { ACCESS_DENIED_MESSAGE } from "@/src/components/access-denied";
import { apiFetch } from "@/src/services/http/api-client";
import { readErrorMessage } from "@/src/services/http/error-message";
import type {
  CardPaymentInput,
  CardPaymentResult,
  Charge,
  ChargeStatus,
  ReceiptPage,
} from "@/src/types/payments";
import type { ServiceResult } from "@/src/types/service-result";
import { PAYMENT_ERROR, paymentFailure } from "./payments-service";

// "Mis pagos" del miembro (H16). El miembro siempre sale del token: ninguna
// ruta lleva el id de un miembro.

export const LOAD_MY_CHARGES_ERROR = "No pudimos cargar tus cobros. Intenta de nuevo.";
export const LOAD_MY_RECEIPTS_ERROR = "No pudimos cargar tus comprobantes. Intenta de nuevo.";

/** GET /charges/me?status= (BE-16.1). Del que vence primero al último. */
export async function fetchMyCharges(status?: ChargeStatus): Promise<ServiceResult<Charge[]>> {
  try {
    const res = await apiFetch(status ? `charges/me?status=${status}` : "charges/me");
    if (!res.ok) return listFailure(res, LOAD_MY_CHARGES_ERROR);
    const body = (await res.json()) as { data: Charge[] };
    return { ok: true, data: body.data, status: res.status };
  } catch {
    return { ok: false, error: LOAD_MY_CHARGES_ERROR, status: 0 };
  }
}

/** GET /receipts/me?page= (BE-16.1). Del más reciente al más antiguo, 20 por página. */
export async function fetchMyReceipts(page = 1): Promise<ServiceResult<ReceiptPage>> {
  try {
    const res = await apiFetch(`receipts/me?page=${page}`);
    if (!res.ok) return listFailure(res, LOAD_MY_RECEIPTS_ERROR);
    return { ok: true, data: (await res.json()) as ReceiptPage, status: res.status };
  } catch {
    return { ok: false, error: LOAD_MY_RECEIPTS_ERROR, status: 0 };
  }
}

/**
 * POST /charges/{chargeId}/card-payment (BE-16.2). La pasarela simulada tarda
 * unos 2 segundos.
 *
 * - 201: el comprobante emitido y, en una membresía, su estado nuevo.
 * - 400: tarjeta rechazada ("Pago rechazado: <motivo>.") o dato inválido.
 * - 404: el cobro no existe o es de otro miembro.
 * - 409: el cobro ya está pagado.
 */
export async function payMyChargeWithCard(
  chargeId: number,
  input: CardPaymentInput,
): Promise<ServiceResult<CardPaymentResult>> {
  try {
    const res = await apiFetch(`charges/${chargeId}/card-payment`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (res.ok) {
      return { ok: true, data: (await res.json()) as CardPaymentResult, status: res.status };
    }
    return paymentFailure(res);
  } catch {
    // Reintentar es seguro: si el pago ya entró, el servidor responde 409.
    return { ok: false, error: PAYMENT_ERROR, status: 0 };
  }
}

async function listFailure<T>(res: Response, fallback: string): Promise<ServiceResult<T>> {
  if (res.status === 403) return { ok: false, error: ACCESS_DENIED_MESSAGE, status: 403 };
  if (res.status === 400) {
    return { ok: false, error: (await readErrorMessage(res)) ?? fallback, status: 400 };
  }
  return { ok: false, error: fallback, status: res.status };
}
