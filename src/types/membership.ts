// Contrato de GET /api/v1/memberships/me (H05 · BE-5.1).

export type MembershipStatus = "ACTIVE" | "PENDING_PAYMENT" | "EXPIRED" | "NONE";
export type PlanType = "MONTHLY" | "QUARTERLY" | "DROP_IN";

export type IncludedClass = {
  name: string;
  /** ISO 8601 en UTC. */
  startsAt: string;
};

export type MyMembership = {
  status: MembershipStatus;
  planName: string | null;
  planType: PlanType | null;
  /** AAAA-MM-DD, ya en la fecha del gimnasio. */
  endDate: string | null;
  daysLeft: number | null;
  includedClass: IncludedClass | null;
};

export type MembershipServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

/** Zona horaria del gimnasio: la hora de la clase se muestra en El Salvador. */
export const GYM_TIME_ZONE = "America/El_Salvador";

export const RENEW_MESSAGE = "Renueva o paga tu membresía en recepción o desde Mis pagos.";
export const NO_MEMBERSHIP_MESSAGE =
  "Aún no tienes una membresía. Acércate a recepción para adquirir un plan.";
export const DROP_IN_PLAN_LABEL = "Clase suelta";

/** Color de la tarjeta según el estado. */
export type MembershipTone = "success" | "warning" | "danger" | "neutral";

export const STATUS_LABELS: Record<MembershipStatus, string> = {
  ACTIVE: "Activa",
  PENDING_PAYMENT: "Pendiente de pago",
  EXPIRED: "Vencida",
  NONE: "Sin membresía",
};

const STATUS_TONES: Record<MembershipStatus, MembershipTone> = {
  ACTIVE: "success",
  PENDING_PAYMENT: "warning",
  EXPIRED: "danger",
  NONE: "neutral",
};

/** Lo que muestra la tarjeta, ya resuelto a partir de la respuesta del backend. */
export type MembershipView = {
  tone: MembershipTone;
  statusLabel: string;
  /** Vencida o pendiente de pago: el estado se resalta. */
  highlighted: boolean;
  planLabel: string | null;
  endDateLabel: string | null;
  daysLeftLabel: string | null;
  includedClassLabel: string | null;
  message: string | null;
};

/** "2026-12-15" -> "15/12/2026". La fecha ya viene en hora del gimnasio. */
export function formatEndDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function formatDaysLeft(daysLeft: number): string {
  if (daysLeft <= 0) return "Vence hoy";
  if (daysLeft === 1) return "1 día restante";
  return `${daysLeft} días restantes`;
}

/** "Spinning Matutino · hoy a las 07:00" (hora de El Salvador). */
export function formatIncludedClass(included: IncludedClass): string {
  const time = new Intl.DateTimeFormat("es-SV", {
    timeZone: GYM_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(included.startsAt));
  return `${included.name} · a las ${time}`;
}

export function membershipView(membership: MyMembership): MembershipView {
  const { status } = membership;
  if (status === "NONE") {
    return {
      tone: STATUS_TONES.NONE,
      statusLabel: STATUS_LABELS.NONE,
      highlighted: false,
      planLabel: null,
      endDateLabel: null,
      daysLeftLabel: null,
      includedClassLabel: null,
      message: NO_MEMBERSHIP_MESSAGE,
    };
  }

  const isDropIn = membership.planType === "DROP_IN";
  const needsAction = status === "EXPIRED" || status === "PENDING_PAYMENT";

  return {
    tone: STATUS_TONES[status],
    statusLabel: STATUS_LABELS[status],
    highlighted: needsAction,
    planLabel: isDropIn ? DROP_IN_PLAN_LABEL : membership.planName,
    endDateLabel: membership.endDate ? formatEndDate(membership.endDate) : null,
    // Una membresía vencida ya no tiene días restantes que mostrar.
    daysLeftLabel:
      status === "EXPIRED" || membership.daysLeft === null
        ? null
        : formatDaysLeft(membership.daysLeft),
    includedClassLabel:
      isDropIn && membership.includedClass ? formatIncludedClass(membership.includedClass) : null,
    message: needsAction ? RENEW_MESSAGE : null,
  };
}
