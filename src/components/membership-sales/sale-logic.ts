import type {
  CardInput,
  MemberSearchItem,
  PaymentMethod,
  SellDropInInput,
  SellMembershipInput,
} from "@/src/types/membership-sales";
import type { GymClass } from "@/src/types/classes";
import type { Plan } from "@/src/types/plans";

// Reglas del formulario de venta (FE-4.1). El servidor las vuelve a validar:
// corre la fecha si el miembro tiene una membresía activa y, en la clase
// suelta, verifica el cupo con la clase bloqueada.

export type SaleValues = {
  member: MemberSearchItem | null;
  planId: string;
  /** AAAA-MM-DD; solo Mensual o Trimestral. */
  startDate: string;
  /** Solo Clase suelta. */
  classId: string;
  paymentMethod: PaymentMethod | "";
  card: CardInput;
};

export type SaleField = "member" | "planId" | "startDate" | "classId" | "paymentMethod";
export type CardField = keyof CardInput;
export type SaleErrors = Partial<Record<SaleField | CardField, string>>;

export const EMPTY_CARD: CardInput = { cardNumber: "", holderName: "", expiry: "", cvv: "" };

export const MIN_SEARCH_LENGTH = 2;
export const SEARCH_DEBOUNCE_MS = 400;
export const NO_MEMBERS_FOUND_MESSAGE = "No encontramos miembros con ese dato.";
export const NO_PLANS_FOR_SALE_MESSAGE = "No hay planes activos para vender. Créalos en Planes.";
export const NO_DROP_IN_CLASSES_MESSAGE = "No hay clases de hoy con cupo.";
export const PROCESSING_PAYMENT_MESSAGE = "Procesando pago…";
export const CLASS_FULL_MESSAGE = "La clase está llena.";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
};

export function emptySale(today: string): SaleValues {
  return {
    member: null,
    planId: "",
    startDate: today,
    classId: "",
    paymentMethod: "",
    card: EMPTY_CARD,
  };
}

/** Planes que se venden aquí: los activos, incluida la Clase suelta. */
export function plansForSale(plans: Plan[]): Plan[] {
  return plans.filter((plan) => plan.isActive);
}

export function isDropInPlan(plan: Plan | undefined): boolean {
  return plan?.type === "DROP_IN";
}

/** ¿Hay que buscar con lo escrito? */
export function shouldSearch(term: string): boolean {
  return term.trim().length >= MIN_SEARCH_LENGTH;
}

/** Lugares libres de una clase. */
export function spotsLeft(gymClass: GymClass): number {
  return gymClass.spotsLeft ?? Math.max(0, gymClass.capacity - gymClass.confirmedReservations);
}

/**
 * Clases de hoy que se pueden vender como clase suelta: programadas, que
 * todavía no inician y con cupo, en orden de hora.
 */
export function dropInClassesToday(classes: GymClass[], now: Date): GymClass[] {
  const sameDay = (d: Date) =>
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return classes
    .filter((c) => {
      const startsAt = new Date(c.startsAt);
      return (
        c.status === "SCHEDULED" &&
        sameDay(startsAt) &&
        startsAt.getTime() > now.getTime() &&
        spotsLeft(c) > 0
      );
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Inicio y fin del día local, para pedir las clases de hoy. */
export function todayRange(now: Date): { from: Date; to: Date } {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from, to };
}

/** Reglas de la pasarela simulada; `now` decide si la tarjeta ya venció. */
export function validateCard(card: CardInput, now: Date): Partial<Record<CardField, string>> {
  const errors: Partial<Record<CardField, string>> = {};
  if (!/^\d{16}$/.test(card.cardNumber.replace(/\s+/g, ""))) {
    errors.cardNumber = "El número de tarjeta debe tener 16 dígitos.";
  }
  const holder = card.holderName.trim();
  if (holder.length < 3 || holder.length > 60) {
    errors.holderName = "El nombre del titular debe tener entre 3 y 60 caracteres.";
  }
  const expiry = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(card.expiry.trim());
  if (!expiry) {
    errors.expiry = "El vencimiento debe tener el formato MM/AA.";
  } else {
    const expiresAt = (2000 + Number(expiry[2])) * 12 + Number(expiry[1]);
    if (expiresAt < now.getFullYear() * 12 + now.getMonth() + 1) {
      errors.expiry = "La tarjeta está vencida.";
    }
  }
  if (!/^\d{3}$/.test(card.cvv)) errors.cvv = "El CVV debe tener 3 dígitos.";
  return errors;
}

export function validateSale(values: SaleValues, plan: Plan | undefined, today: string, now: Date): SaleErrors {
  const errors: SaleErrors = {};
  if (!values.member) errors.member = "Busca y elige al miembro.";
  if (!values.planId || !plan) {
    errors.planId = "Elige el plan.";
    return errors;
  }

  if (isDropInPlan(plan)) {
    if (!values.classId) errors.classId = "Elige la clase de hoy.";
    if (!values.paymentMethod) errors.paymentMethod = "Elige cómo paga.";
    if (values.paymentMethod === "CARD") Object.assign(errors, validateCard(values.card, now));
    return errors;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.startDate)) {
    errors.startDate = "Elige la fecha de inicio.";
  } else if (values.startDate < today) {
    errors.startDate = "La fecha de inicio no puede ser anterior a hoy.";
  }
  return errors;
}

/** Cuerpo de POST /memberships a partir de valores ya validados. */
export function toSellInput(values: SaleValues): SellMembershipInput {
  return {
    memberId: (values.member as MemberSearchItem).id,
    planId: Number(values.planId),
    startDate: values.startDate,
  };
}

/** Cuerpo de POST /memberships/drop-in; la tarjeta solo viaja si se paga con ella. */
export function toDropInInput(values: SaleValues, idempotencyKey: string): SellDropInInput {
  const method = values.paymentMethod as PaymentMethod;
  return {
    memberId: (values.member as MemberSearchItem).id,
    classId: Number(values.classId),
    paymentMethod: method,
    ...(method === "CARD"
      ? { card: { ...values.card, cardNumber: values.card.cardNumber.replace(/\s+/g, "") } }
      : {}),
    idempotencyKey,
  };
}

/** "2026-12-09" -> "09/12/2026" */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** Hora local HH:MM de una fecha ISO. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function saleSuccessMessage(endDate: string): string {
  return `Membresía registrada. Vence el ${formatDate(endDate)}.`;
}

export function declinedMessage(reason: string): string {
  return `Pago rechazado: ${reason.replace(/\.$/, "")}.`;
}

/** Pantalla de cobro de recepción (FE-15.1) con el miembro ya elegido. */
export function chargeScreenHref(memberId: string): string {
  return `/recepcion/cobros?${new URLSearchParams({ memberId }).toString()}`;
}
