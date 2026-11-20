// Contrato de la venta de membresías en recepción (H04 · BE-4.1).
import type { PlanType } from "./plans";

/** Un miembro de GET /members?q= */
export type MemberSearchItem = {
  id: string;
  memberCode: string;
  fullName: string;
  email: string;
};

/** Cuerpo de POST /memberships. */
export type SellMembershipInput = {
  memberId: string;
  planId: number;
  /** AAAA-MM-DD; si se omite, el servidor usa hoy. */
  startDate?: string;
};

export type PaymentMethod = "CASH" | "CARD";

/** Datos de tarjeta de la pasarela simulada. Nunca se guardan en el store. */
export type CardInput = {
  cardNumber: string;
  holderName: string;
  /** MM/AA */
  expiry: string;
  cvv: string;
};

/** Cuerpo de POST /memberships/drop-in (BE-4.2). */
export type SellDropInInput = {
  memberId: string;
  classId: number;
  paymentMethod: PaymentMethod;
  card?: CardInput;
  /** uuid por intento: la misma clave nunca cobra dos veces. */
  idempotencyKey: string;
};

/** Respuesta 201 de POST /memberships/drop-in. */
export type SoldDropIn = {
  membershipId: number;
  reservationId: number;
  receiptNumber: string;
  amount: number;
  /** AAAA-MM-DD: vence al terminar el día. */
  endDate: string;
  className: string;
  classStartsAt: string;
};

/** Respuesta 201 de POST /memberships. */
export type SoldMembership = {
  id: number;
  plan: string;
  planType: PlanType;
  /** AAAA-MM-DD */
  startDate: string;
  /** AAAA-MM-DD, último día con acceso. */
  endDate: string;
  status: "PENDING_PAYMENT";
  isRenewal: boolean;
  chargeId: number;
  amount: number;
};
