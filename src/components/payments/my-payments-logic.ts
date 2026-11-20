import { formatUsdPrice, getGymDateKey } from "@/src/lib/gym-datetime";
import type {
  CardPaymentInput,
  CardPaymentResult,
  Charge,
  MembershipStatusAfterPayment,
  ReceiptPage,
  ReceiptSummary,
  ReceiptView,
} from "@/src/types/payments";
import { toCardInput, type CardValues } from "./card-logic";
import { formatDueDate } from "./register-payment-logic";

// Reglas de "Mis pagos" del miembro (FE-16.1) y del pago en línea (FE-16.2).

export const NO_PENDING_CHARGES_MINE_MESSAGE = "No tienes cobros pendientes.";
export const NO_RECEIPTS_MESSAGE = "Aún no tienes comprobantes.";
export const PROCESSING_MESSAGE = "Estamos procesando tu pago. No cierres esta página.";

/** Texto del botón de pago: "Pagar $25.00". */
export function payButtonLabel(amount: number): string {
  return `Pagar ${formatUsdPrice(amount)}`;
}

/** Un cobro está vencido si su fecha ya pasó en el calendario del gimnasio. */
export function isOverdue(dueDate: string, now: Date = new Date()): boolean {
  return dueDate < getGymDateKey(now);
}

/** "Vence 24/11/2026" o "Venció 18/11/2026". */
export function dueDateText(charge: Pick<Charge, "dueDate">, now: Date = new Date()): string {
  const date = formatDueDate(charge.dueDate);
  return isOverdue(charge.dueDate, now) ? `Venció ${date}` : `Vence ${date}`;
}

/** Suma de lo que debe el miembro, para el encabezado de la lista. */
export function totalPending(charges: Charge[]): number {
  // En centavos para que 0.1 + 0.2 no deje decimales sueltos.
  const cents = charges.reduce((sum, charge) => sum + Math.round(charge.amount * 100), 0);
  return cents / 100;
}

/** Cuerpo de POST /charges/{chargeId}/card-payment. */
export function buildCardPaymentInput(card: CardValues, idempotencyKey: string): CardPaymentInput {
  return { card: toCardInput(card), idempotencyKey };
}

/** Un comprobante de la lista, con la forma que usan la tarjeta y la descarga. */
export function receiptViewFromSummary(receipt: ReceiptSummary): ReceiptView {
  return {
    receiptId: receipt.receiptId,
    receiptNumber: receipt.number,
    issuedAt: receipt.issuedAt,
    concept: receipt.concept,
    amount: receipt.amount,
    paymentMethod: receipt.method,
    cardLast4: receipt.cardLast4,
  };
}

const MEMBERSHIP_STATUS_MESSAGES: Record<MembershipStatusAfterPayment, string | null> = {
  ACTIVE: "Tu membresía está activa.",
  PENDING_PAYMENT: "Tu membresía sigue pendiente de pago.",
  EXPIRED: "Tu membresía está vencida.",
  NONE: null,
};

/** Aviso del estado de la membresía después de pagarla; null en los demás cobros. */
export function membershipStatusMessage(result: Pick<CardPaymentResult, "membershipStatus">): string | null {
  return result.membershipStatus ? MEMBERSHIP_STATUS_MESSAGES[result.membershipStatus] : null;
}

/** Cantidad de páginas de comprobantes (al menos 1). */
export function totalPages(page: Pick<ReceiptPage, "total" | "pageSize">): number {
  if (page.pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(page.total / page.pageSize));
}
