// Contrato de planes con el backend (BE-3.1).

export type PlanType = "MONTHLY" | "QUARTERLY" | "DROP_IN";

export const PLAN_TYPES: PlanType[] = ["MONTHLY", "QUARTERLY", "DROP_IN"];

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  DROP_IN: "Clase suelta",
};

/** Plan tal como lo devuelve GET /plans. */
export type Plan = {
  id: number;
  name: string;
  type: PlanType;
  /** null en Clase suelta. */
  durationDays: number | null;
  price: number;
  benefits: string | null;
  isActive: boolean;
};

/** Cuerpo de POST /plans. */
export type CreatePlanInput = {
  name: string;
  type: PlanType;
  durationDays?: number;
  price: number;
  benefits?: string;
};

/** Cuerpo de PATCH /plans/{id}. El tipo no se puede cambiar. */
export type UpdatePlanInput = {
  name?: string;
  durationDays?: number;
  price?: number;
  benefits?: string | null;
};
