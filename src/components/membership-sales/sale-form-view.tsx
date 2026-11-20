import { PLAN_TYPE_LABELS, type Plan } from "@/src/types/plans";
import { DropInFields, type DropInFieldsProps } from "./drop-in-fields";
import { MemberPicker, type MemberPickerProps } from "./member-picker";
import {
  NO_PLANS_FOR_SALE_MESSAGE,
  PROCESSING_PAYMENT_MESSAGE,
  type SaleErrors,
  type SaleValues,
} from "./sale-logic";

const INPUT_CLASS =
  "rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100";

export type SaleFormViewProps = {
  picker: Omit<MemberPickerProps, "selected" | "error" | "disabled">;
  dropIn: Omit<DropInFieldsProps, "values" | "errors" | "disabled">;
  values: SaleValues;
  errors: SaleErrors;
  plans: Plan[];
  plansLoading: boolean;
  plansError: string | null;
  today: string;
  submitting: boolean;
  serverError: string | null;
  onPlanChange: (planId: string) => void;
  onStartDateChange: (date: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

function planLabel(plan: Plan): string {
  const duration = plan.durationDays === null ? "mismo día" : `${plan.durationDays} días`;
  return `${plan.name} · ${PLAN_TYPE_LABELS[plan.type]} · ${duration} · $${plan.price.toFixed(2)}`;
}

/**
 * Formulario de venta (FE-4.1), sin estado propio. Cambia según el plan: con
 * Mensual o Trimestral pide la fecha de inicio; con Clase suelta, la clase de
 * hoy y el pago.
 */
export function SaleFormView({
  picker,
  dropIn,
  values,
  errors,
  plans,
  plansLoading,
  plansError,
  today,
  submitting,
  serverError,
  onPlanChange,
  onStartDateChange,
  onSubmit,
  onCancel,
}: SaleFormViewProps) {
  const isDropIn = plans.find((plan) => String(plan.id) === values.planId)?.type === "DROP_IN";
  const processingCard = submitting && isDropIn && values.paymentMethod === "CARD";

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <MemberPicker {...picker} selected={values.member} error={errors.member} disabled={submitting} />

      <div className="flex flex-col gap-1">
        <label htmlFor="sale-plan" className="text-sm font-medium">
          Plan
        </label>
        {plansLoading ? (
          <p className="text-sm text-zinc-500">Cargando planes...</p>
        ) : plansError ? (
          <p className="text-sm text-red-600">{plansError}</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-zinc-500">{NO_PLANS_FOR_SALE_MESSAGE}</p>
        ) : (
          <select
            id="sale-plan"
            value={values.planId}
            disabled={submitting}
            aria-invalid={Boolean(errors.planId)}
            onChange={(event) => onPlanChange(event.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Selecciona un plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {planLabel(plan)}
              </option>
            ))}
          </select>
        )}
        {errors.planId && <p className="text-sm text-red-600">{errors.planId}</p>}
      </div>

      {isDropIn ? (
        <DropInFields
          {...dropIn}
          values={values}
          errors={errors}
          disabled={submitting}
        />
      ) : (
        <div className="flex flex-col gap-1">
          <label htmlFor="sale-start" className="text-sm font-medium">
            Fecha de inicio
          </label>
          <input
            id="sale-start"
            type="date"
            min={today}
            value={values.startDate}
            disabled={submitting}
            aria-invalid={Boolean(errors.startDate)}
            onChange={(event) => onStartDateChange(event.target.value)}
            className={INPUT_CLASS}
          />
          <p className="text-xs text-zinc-500">
            Si el miembro tiene una membresía activa, la nueva inicia el día siguiente a su
            vencimiento.
          </p>
          {errors.startDate && <p className="text-sm text-red-600">{errors.startDate}</p>}
        </div>
      )}

      <p aria-live="polite" className="min-h-5 text-sm text-red-600">
        {serverError}
      </p>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-60"
        >
          {processingCard
            ? PROCESSING_PAYMENT_MESSAGE
            : submitting
              ? "Registrando..."
              : isDropIn
                ? "Cobrar y registrar"
                : "Registrar"}
        </button>
      </div>
    </form>
  );
}
