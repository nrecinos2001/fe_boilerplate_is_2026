// Contrato de cobros, pagos y comprobantes con el backend (BE-15.1, BE-15.2).

export type ChargeType = "MEMBERSHIP" | "PERSONAL_SESSION" | "DROP_IN";
export type ChargeStatus = "PENDING" | "PAID";
export type PaymentMethod = "CASH" | "CARD";

export const CHARGE_TYPE_LABELS: Record<ChargeType, string> = {
  MEMBERSHIP: "Membresía",
  PERSONAL_SESSION: "Sesión personal",
  DROP_IN: "Clase suelta",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
};

/** Un miembro de GET /charges/member-search (máximo 10 por búsqueda). */
export type MemberOption = {
  memberId: string;
  email: string;
};

/** Un cobro de GET /members/{memberId}/charges. */
export type Charge = {
  chargeId: number;
  type: ChargeType;
  concept: string;
  amount: number;
  /** Fecha solo-día, AAAA-MM-DD. */
  dueDate: string;
  status: ChargeStatus;
};

/** Datos de tarjeta para la pasarela simulada. Nunca se guardan en el frontend. */
export type CardInput = {
  /** 16 dígitos, sin espacios. */
  cardNumber: string;
  holderName: string;
  /** MM/AA. */
  expiry: string;
  /** 3 dígitos. */
  cvv: string;
};

/** Cuerpo de POST /payments. El monto no se envía: el servidor lo toma del cobro. */
export type CreatePaymentInput = {
  chargeId: number;
  paymentMethod: PaymentMethod;
  /** Solo con paymentMethod CARD. */
  card?: CardInput;
  /** uuid nuevo en cada clic de "Cobrar". */
  idempotencyKey: string;
};

/**
 * Lo que muestra un comprobante. Lo comparten el pago en recepción (H15) y el
 * pago en línea del miembro (H16).
 */
export type ReceiptView = {
  receiptId: number;
  receiptNumber: string;
  /** Fecha y hora ISO. */
  issuedAt: string;
  concept: string;
  amount: number;
  paymentMethod: PaymentMethod;
  cardLast4: string | null;
};

/** Respuesta 201 de POST /payments (PaymentResponseDto). */
export type PaymentReceipt = ReceiptView & {
  paymentId: number;
  chargeId: number;
};

// --- Mis pagos del miembro (H16: BE-16.1 y BE-16.2) ---

/** Estado de la membresía que devuelve el pago en línea de un cobro de membresía. */
export type MembershipStatusAfterPayment = "ACTIVE" | "PENDING_PAYMENT" | "EXPIRED" | "NONE";

/** Cuerpo de POST /charges/{chargeId}/card-payment. El monto sale del cobro guardado. */
export type CardPaymentInput = {
  card: CardInput;
  /** uuid nuevo en cada clic de "Pagar". */
  idempotencyKey: string;
};

/** Respuesta 201 de POST /charges/{chargeId}/card-payment (CardPaymentResponseDto). */
export type CardPaymentResult = ReceiptView & {
  chargeId: number;
  status: "PAID";
  /** Solo en cobros de membresía; null en los demás. */
  membershipStatus: MembershipStatusAfterPayment | null;
};

/** Un comprobante de GET /receipts/me (ReceiptSummaryDto). */
export type ReceiptSummary = {
  receiptId: number;
  number: string;
  /** Fecha y hora ISO. */
  issuedAt: string;
  concept: string;
  amount: number;
  method: PaymentMethod;
  cardLast4: string | null;
};

/** Respuesta de GET /receipts/me: 20 por página, del más reciente al más antiguo. */
export type ReceiptPage = {
  data: ReceiptSummary[];
  total: number;
  page: number;
  pageSize: number;
};
