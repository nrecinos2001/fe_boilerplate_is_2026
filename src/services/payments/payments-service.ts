import { ACCESS_DENIED_MESSAGE } from "@/src/components/access-denied";
import { apiFetch } from "@/src/services/http/api-client";
import { readErrorMessage } from "@/src/services/http/error-message";
import type {
  Charge,
  CreatePaymentInput,
  MemberOption,
  PaymentReceipt,
} from "@/src/types/payments";
import type { ServiceResult } from "@/src/types/service-result";

export const SEARCH_MEMBERS_ERROR = "No pudimos buscar miembros. Intenta de nuevo.";
export const LOAD_CHARGES_ERROR = "No pudimos cargar los cobros. Intenta de nuevo.";
export const PAYMENT_ERROR = "No se pudo registrar el pago. Intenta de nuevo.";
export const CHARGE_ALREADY_PAID_MESSAGE = "Este cobro ya está pagado.";
export const CHARGE_NOT_FOUND_MESSAGE = "No encontramos ese cobro.";
export const RECEIPT_DOWNLOAD_ERROR = "No pudimos descargar el comprobante. Intenta de nuevo.";

/** Mensaje de una tarjeta rechazada por la pasarela: "Pago rechazado: Fondos insuficientes." */
export function declinedMessage(reason: string): string {
  return `Pago rechazado: ${reason.trim().replace(/\.$/, "")}.`;
}

/** GET /charges/member-search?q= (Recepción y Administrador). */
export async function searchMembers(query: string): Promise<ServiceResult<MemberOption[]>> {
  try {
    const res = await apiFetch(`charges/member-search?q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) return failure(res, SEARCH_MEMBERS_ERROR);
    const body = (await res.json()) as { data: MemberOption[] };
    return { ok: true, data: body.data, status: res.status };
  } catch {
    return { ok: false, error: SEARCH_MEMBERS_ERROR, status: 0 };
  }
}

/** GET /members/{memberId}/charges?status=PENDING (Recepción y Administrador). */
export async function fetchPendingCharges(memberId: string): Promise<ServiceResult<Charge[]>> {
  try {
    const res = await apiFetch(`members/${encodeURIComponent(memberId)}/charges?status=PENDING`);
    if (!res.ok) return failure(res, LOAD_CHARGES_ERROR);
    const body = (await res.json()) as { data: Charge[] };
    return { ok: true, data: body.data, status: res.status };
  } catch {
    return { ok: false, error: LOAD_CHARGES_ERROR, status: 0 };
  }
}

/**
 * POST /payments (BE-15.2, Recepción y Administrador).
 *
 * - 201: el comprobante emitido.
 * - 400: tarjeta rechazada ("Pago rechazado: <motivo>.") o dato inválido.
 * - 403: el rol no puede cobrar.
 * - 404: el cobro no existe.
 * - 409: el cobro ya está pagado.
 */
export async function registerPayment(
  input: CreatePaymentInput,
): Promise<ServiceResult<PaymentReceipt>> {
  try {
    const res = await apiFetch("payments", {
      method: "POST",
      body: JSON.stringify(input),
    });

    if (res.ok) {
      return { ok: true, data: (await res.json()) as PaymentReceipt, status: res.status };
    }
    return paymentFailure(res);
  } catch {
    // Sin respuesta no se sabe si el pago entró. Reintentar es seguro: si ya
    // quedó pagado, el servidor responde 409 y no cobra dos veces.
    return { ok: false, error: PAYMENT_ERROR, status: 0 };
  }
}

/**
 * Respuesta no exitosa de un pago. La comparten POST /payments (H15) y
 * POST /charges/{chargeId}/card-payment (H16), que responden igual:
 * 400 con `declineReason` si la pasarela rechaza la tarjeta.
 */
export async function paymentFailure<T>(res: Response): Promise<ServiceResult<T>> {
  if (res.status === 409) return { ok: false, error: CHARGE_ALREADY_PAID_MESSAGE, status: 409 };
  if (res.status === 404) return { ok: false, error: CHARGE_NOT_FOUND_MESSAGE, status: 404 };
  if (res.status === 403) return { ok: false, error: ACCESS_DENIED_MESSAGE, status: 403 };
  if (res.status === 400) {
    const body = (await res.json().catch(() => null)) as {
      message?: unknown;
      declineReason?: unknown;
    } | null;
    if (typeof body?.declineReason === "string" && body.declineReason) {
      return { ok: false, error: declinedMessage(body.declineReason), status: 400 };
    }
    return { ok: false, error: messageFromBody(body?.message) ?? PAYMENT_ERROR, status: 400 };
  }
  return { ok: false, error: PAYMENT_ERROR, status: res.status };
}

export type ReceiptFile = { blob: Blob; filename: string };

/**
 * GET /receipts/{receiptId}/pdf. Recepción y Administrador pueden bajar
 * cualquiera; el Miembro, solo los suyos (H16). Pasa por apiFetch para que
 * vaya el access token: un enlace directo no lo llevaría.
 */
export async function downloadReceiptPdf(
  receiptId: number,
  receiptNumber: string,
): Promise<ServiceResult<ReceiptFile>> {
  try {
    const res = await apiFetch(`receipts/${receiptId}/pdf`);
    if (res.status === 403) return { ok: false, error: ACCESS_DENIED_MESSAGE, status: 403 };
    if (!res.ok) return { ok: false, error: RECEIPT_DOWNLOAD_ERROR, status: res.status };
    const filename =
      filenameFromDisposition(res.headers.get("content-disposition")) ??
      `comprobante-${receiptNumber}.pdf`;
    return { ok: true, data: { blob: await res.blob(), filename }, status: res.status };
  } catch {
    return { ok: false, error: RECEIPT_DOWNLOAD_ERROR, status: 0 };
  }
}

/** Nombre del archivo en `attachment; filename="comprobante-C-000001.pdf"`. */
export function filenameFromDisposition(header: string | null): string | null {
  const match = header ? /filename="?([^";]+)"?/i.exec(header) : null;
  return match ? match[1] : null;
}

async function failure<T>(res: Response, fallback: string): Promise<ServiceResult<T>> {
  if (res.status === 403) return { ok: false, error: ACCESS_DENIED_MESSAGE, status: 403 };
  if (res.status === 400 || res.status === 404) {
    return { ok: false, error: (await readErrorMessage(res)) ?? fallback, status: res.status };
  }
  return { ok: false, error: fallback, status: res.status };
}

function messageFromBody(message: unknown): string | null {
  if (typeof message === "string" && message) return message;
  if (Array.isArray(message)) {
    const parts = message.filter((m): m is string => typeof m === "string");
    return parts.length > 0 ? parts.join(" ") : null;
  }
  return null;
}
