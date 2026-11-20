import type { CreatePlanInput, Plan, PlanType, UpdatePlanInput } from "@/src/types/plans";

// Reglas del formulario de planes (FE-3.1). Coinciden con CreatePlanDto y
// UpdatePlanDto del backend, que las vuelve a validar.

export type PlanFormValues = {
  name: string;
  type: PlanType | "";
  durationDays: string;
  price: string;
  benefits: string;
};

export type PlanFormErrors = Partial<Record<keyof PlanFormValues, string>>;

export const EMPTY_PLAN_FORM: PlanFormValues = {
  name: "",
  type: "",
  durationDays: "",
  price: "",
  benefits: "",
};

export const PLAN_SAVED_MESSAGE = "Plan guardado.";
export const EMPTY_PLANS_MESSAGE = "Aún no hay planes.";
export const PRICE_MESSAGE = "El precio debe ser mayor a $0.00, con 2 decimales como máximo.";

const MAX_PRICE = 999_999.99;
const PRICE_FORMAT = /^\d+(\.\d{1,2})?$/;
const WHOLE_NUMBER = /^\d+$/;

/** Valores del formulario para editar un plan existente. */
export function planToFormValues(plan: Plan): PlanFormValues {
  return {
    name: plan.name,
    type: plan.type,
    durationDays: plan.durationDays === null ? "" : String(plan.durationDays),
    price: plan.price.toFixed(2),
    benefits: plan.benefits ?? "",
  };
}

export function deactivateConfirmation(plan: Pick<Plan, "name">): string {
  return `¿Desactivar el plan ${plan.name}? Ya no se podrá vender.`;
}

export function validatePlanForm(values: PlanFormValues): PlanFormErrors {
  const errors: PlanFormErrors = {};

  const name = values.name.trim();
  if (name.length < 3 || name.length > 40) {
    errors.name = "El nombre debe tener de 3 a 40 caracteres.";
  }

  if (!values.type) {
    errors.type = "Selecciona el tipo de plan.";
  }

  // La Clase suelta no lleva duración: el campo ni se muestra.
  if (values.type && values.type !== "DROP_IN") {
    const days = values.durationDays.trim();
    const n = Number(days);
    if (!WHOLE_NUMBER.test(days) || n < 1 || n > 365) {
      errors.durationDays = "La duración debe ser un número entero de 1 a 365 días.";
    }
  }

  const price = values.price.trim();
  if (!PRICE_FORMAT.test(price) || Number(price) <= 0 || Number(price) > MAX_PRICE) {
    errors.price = PRICE_MESSAGE;
  }

  if (values.benefits.trim().length > 300) {
    errors.benefits = "Los beneficios no pueden superar los 300 caracteres.";
  }

  return errors;
}

/** Cuerpo de POST /plans a partir de valores ya validados. */
export function toCreatePlanInput(values: PlanFormValues): CreatePlanInput {
  const type = values.type as PlanType;
  const benefits = values.benefits.trim();
  return {
    name: values.name.trim(),
    type,
    ...(type === "DROP_IN" ? {} : { durationDays: Number(values.durationDays) }),
    price: Number(values.price),
    ...(benefits ? { benefits } : {}),
  };
}

/** Cuerpo de PATCH /plans/{id}. Nunca envía el tipo, que no se puede cambiar. */
export function toUpdatePlanInput(values: PlanFormValues, type: PlanType): UpdatePlanInput {
  const benefits = values.benefits.trim();
  return {
    name: values.name.trim(),
    ...(type === "DROP_IN" ? {} : { durationDays: Number(values.durationDays) }),
    price: Number(values.price),
    benefits: benefits ? benefits : null,
  };
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function formatDuration(plan: Pick<Plan, "durationDays">): string {
  if (plan.durationDays === null) return "Mismo día";
  return plan.durationDays === 1 ? "1 día" : `${plan.durationDays} días`;
}
