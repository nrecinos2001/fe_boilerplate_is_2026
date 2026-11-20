import { PLAN_TYPE_LABELS, PLAN_TYPES } from "@/src/types/plans";
import type { PlanFormErrors, PlanFormValues } from "./plan-form-logic";

type Field = keyof PlanFormValues;

const INPUT_CLASS =
  "rounded-lg border border-zinc-300 px-3 py-2 font-normal outline-none focus:border-zinc-900 aria-invalid:border-red-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-zinc-100";

export type PlanFormDialogProps = {
  mode: "create" | "edit";
  values: PlanFormValues;
  errors: PlanFormErrors;
  saving: boolean;
  serverError: string | null;
  onChange: (field: Field, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

/**
 * Ventana de alta y edición de un plan (FE-3.1), sin estado propio.
 * - La duración desaparece al elegir Clase suelta.
 * - Al editar, el tipo se muestra pero no se puede cambiar.
 */
export function PlanFormDialog({
  mode,
  values,
  errors,
  saving,
  serverError,
  onChange,
  onSubmit,
  onClose,
}: PlanFormDialogProps) {
  const isDropIn = values.type === "DROP_IN";

  const fieldProps = (name: Field) => ({
    id: `plan-${name}`,
    name,
    disabled: saving,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `plan-${name}-error` : undefined,
    className: INPUT_CLASS,
  });

  const fieldError = (name: Field) =>
    errors[name] ? (
      <p id={`plan-${name}-error`} className="text-xs font-normal text-red-600">
        {errors[name]}
      </p>
    ) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl dark:bg-zinc-900"
      >
        <header className="flex items-center justify-between bg-zinc-900 px-4 py-3 text-white">
          <h2 id="plan-form-title" className="text-sm font-semibold">
            {mode === "create" ? "Nuevo plan" : `Editar plan · ${values.name}`}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-lg">
            ✕
          </button>
        </header>

        <div className="flex flex-col gap-4 p-4 text-sm">
          <label htmlFor="plan-name" className="flex flex-col gap-1 font-semibold">
            Nombre
            <input
              {...fieldProps("name")}
              type="text"
              maxLength={40}
              value={values.name}
              onChange={(event) => onChange("name", event.target.value)}
            />
            {fieldError("name")}
          </label>

          <label htmlFor="plan-type" className="flex flex-col gap-1 font-semibold">
            Tipo
            <select
              {...fieldProps("type")}
              disabled={saving || mode === "edit"}
              value={values.type}
              onChange={(event) => onChange("type", event.target.value)}
            >
              <option value="">Selecciona un tipo</option>
              {PLAN_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PLAN_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            {mode === "edit" && (
              <span className="text-xs font-normal text-zinc-500">
                El tipo no se puede cambiar.
              </span>
            )}
            {fieldError("type")}
          </label>

          {!isDropIn && (
            <label htmlFor="plan-durationDays" className="flex flex-col gap-1 font-semibold">
              Duración en días
              <input
                {...fieldProps("durationDays")}
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                step={1}
                value={values.durationDays}
                onChange={(event) => onChange("durationDays", event.target.value)}
              />
              {fieldError("durationDays")}
            </label>
          )}

          <label htmlFor="plan-price" className="flex flex-col gap-1 font-semibold">
            Precio (USD)
            <input
              {...fieldProps("price")}
              type="number"
              inputMode="decimal"
              min={0.01}
              step={0.01}
              placeholder="25.00"
              value={values.price}
              onChange={(event) => onChange("price", event.target.value)}
            />
            {fieldError("price")}
          </label>

          <label htmlFor="plan-benefits" className="flex flex-col gap-1 font-semibold">
            Beneficios <span className="text-xs font-normal text-zinc-500">(opcional)</span>
            <textarea
              {...fieldProps("benefits")}
              rows={3}
              maxLength={300}
              value={values.benefits}
              onChange={(event) => onChange("benefits", event.target.value)}
            />
            <span className="self-end text-xs font-normal text-zinc-500">
              {values.benefits.length}/300
            </span>
            {fieldError("benefits")}
          </label>

          <p aria-live="polite" className="min-h-5 text-sm text-red-600">
            {serverError}
          </p>
        </div>

        <footer className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm disabled:opacity-60 dark:border-zinc-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </footer>
      </form>
    </div>
  );
}
