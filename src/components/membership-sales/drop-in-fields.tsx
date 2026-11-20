import type { GymClass } from "@/src/types/classes";
import type { PaymentMethod } from "@/src/types/membership-sales";
import {
  formatTime,
  NO_DROP_IN_CLASSES_MESSAGE,
  PAYMENT_METHOD_LABELS,
  spotsLeft,
  type CardField,
  type SaleErrors,
  type SaleValues,
} from "./sale-logic";

const INPUT_CLASS =
  "rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-invalid:border-red-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100";

const CARD_FIELDS: { name: CardField; label: string; placeholder: string; maxLength: number; mode: "numeric" | "text" }[] = [
  { name: "cardNumber", label: "Número de tarjeta", placeholder: "4242 4242 4242 4242", maxLength: 19, mode: "numeric" },
  { name: "holderName", label: "Titular", placeholder: "Como aparece en la tarjeta", maxLength: 60, mode: "text" },
  { name: "expiry", label: "Vencimiento", placeholder: "MM/AA", maxLength: 5, mode: "numeric" },
  { name: "cvv", label: "CVV", placeholder: "123", maxLength: 3, mode: "numeric" },
];

export type DropInFieldsProps = {
  values: Pick<SaleValues, "classId" | "paymentMethod" | "card">;
  errors: SaleErrors;
  classes: GymClass[];
  classesLoading: boolean;
  classesError: string | null;
  disabled: boolean;
  onClassChange: (classId: string) => void;
  onPaymentMethodChange: (method: PaymentMethod | "") => void;
  onCardChange: (field: CardField, value: string) => void;
};

/** Clase de hoy y pago de la clase suelta (FE-4.1), sin estado propio. */
export function DropInFields({
  values,
  errors,
  classes,
  classesLoading,
  classesError,
  disabled,
  onClassChange,
  onPaymentMethodChange,
  onCardChange,
}: DropInFieldsProps) {
  const fieldError = (name: keyof SaleErrors) =>
    errors[name] ? <p className="text-sm text-red-600">{errors[name]}</p> : null;

  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor="sale-class" className="text-sm font-medium">
          Clase de hoy
        </label>
        {classesLoading ? (
          <p className="text-sm text-zinc-500">Cargando clases...</p>
        ) : classesError ? (
          <p className="text-sm text-red-600">{classesError}</p>
        ) : classes.length === 0 ? (
          <p className="text-sm text-zinc-500">{NO_DROP_IN_CLASSES_MESSAGE}</p>
        ) : (
          <select
            id="sale-class"
            value={values.classId}
            disabled={disabled}
            aria-invalid={Boolean(errors.classId)}
            onChange={(event) => onClassChange(event.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Selecciona una clase</option>
            {classes.map((c) => {
              const free = spotsLeft(c);
              return (
                <option key={c.id} value={c.id}>
                  {formatTime(c.startsAt)} · {c.name} · {free} {free === 1 ? "lugar libre" : "lugares libres"}
                </option>
              );
            })}
          </select>
        )}
        {fieldError("classId")}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sale-payment" className="text-sm font-medium">
          Método de pago
        </label>
        <select
          id="sale-payment"
          value={values.paymentMethod}
          disabled={disabled}
          aria-invalid={Boolean(errors.paymentMethod)}
          onChange={(event) => onPaymentMethodChange(event.target.value as PaymentMethod | "")}
          className={INPUT_CLASS}
        >
          <option value="">Selecciona cómo paga</option>
          {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
            <option key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </option>
          ))}
        </select>
        {fieldError("paymentMethod")}
      </div>

      {values.paymentMethod === "CARD" && (
        <fieldset className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <legend className="px-1 text-xs text-zinc-500">
            Datos de la tarjeta (no se guardan)
          </legend>
          {CARD_FIELDS.map((field) => (
            <div
              key={field.name}
              className={`flex flex-col gap-1 ${field.name === "cardNumber" || field.name === "holderName" ? "col-span-2" : ""}`}
            >
              <label htmlFor={`card-${field.name}`} className="text-sm font-medium">
                {field.label}
              </label>
              <input
                id={`card-${field.name}`}
                type="text"
                inputMode={field.mode}
                autoComplete="off"
                maxLength={field.maxLength}
                placeholder={field.placeholder}
                value={values.card[field.name]}
                disabled={disabled}
                aria-invalid={Boolean(errors[field.name])}
                onChange={(event) => onCardChange(field.name, event.target.value)}
                className={INPUT_CLASS}
              />
              {fieldError(field.name)}
            </div>
          ))}
        </fieldset>
      )}
    </>
  );
}
