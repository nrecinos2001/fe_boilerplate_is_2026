import {
  formatCardNumberInput,
  formatCvvInput,
  formatExpiryInput,
  type CardErrors,
  type CardField,
  type CardValues,
} from "./card-logic";

const INPUT_CLASS =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 aria-invalid:border-red-500 disabled:opacity-60 dark:border-zinc-700 dark:focus:border-zinc-100";

export type CardFieldsProps = {
  values: CardValues;
  errors: CardErrors;
  disabled: boolean;
  onChange: (field: CardField, value: string) => void;
  /** Prefijo de los id, por si hay dos formularios en la misma página. */
  idPrefix?: string;
};

/**
 * Datos de tarjeta sin estado propio (FE-15.1, y FE-16.2 para el miembro).
 * Sin autocompletado: el navegador no debe recordar el número ni el CVV.
 */
export function CardFields({ values, errors, disabled, onChange, idPrefix = "card" }: CardFieldsProps) {
  const id = (field: CardField) => `${idPrefix}-${field}`;
  const fieldProps = (field: CardField) => ({
    id: id(field),
    name: field,
    autoComplete: "off",
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `${id(field)}-error` : undefined,
    className: INPUT_CLASS,
  });
  const fieldError = (field: CardField) =>
    errors[field] ? (
      <p id={`${id(field)}-error`} className="text-sm text-red-600">
        {errors[field]}
      </p>
    ) : null;

  return (
    <fieldset
      disabled={disabled}
      className="grid grid-cols-2 gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <legend className="px-1 text-sm font-medium">Datos de la tarjeta</legend>

      <div className="col-span-2 flex flex-col gap-1">
        <label htmlFor={id("cardNumber")} className="text-sm font-medium">
          Número de tarjeta
        </label>
        <input
          {...fieldProps("cardNumber")}
          type="text"
          inputMode="numeric"
          maxLength={19}
          placeholder="4242 4242 4242 4242"
          value={values.cardNumber}
          onChange={(event) => onChange("cardNumber", formatCardNumberInput(event.target.value))}
        />
        {fieldError("cardNumber")}
      </div>

      <div className="col-span-2 flex flex-col gap-1">
        <label htmlFor={id("holderName")} className="text-sm font-medium">
          Nombre del titular
        </label>
        <input
          {...fieldProps("holderName")}
          type="text"
          maxLength={60}
          value={values.holderName}
          onChange={(event) => onChange("holderName", event.target.value)}
        />
        {fieldError("holderName")}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={id("expiry")} className="text-sm font-medium">
          Vencimiento (MM/AA)
        </label>
        <input
          {...fieldProps("expiry")}
          type="text"
          inputMode="numeric"
          maxLength={5}
          placeholder="12/30"
          value={values.expiry}
          onChange={(event) => onChange("expiry", formatExpiryInput(event.target.value))}
        />
        {fieldError("expiry")}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={id("cvv")} className="text-sm font-medium">
          CVV
        </label>
        <input
          {...fieldProps("cvv")}
          type="password"
          inputMode="numeric"
          maxLength={3}
          value={values.cvv}
          onChange={(event) => onChange("cvv", formatCvvInput(event.target.value))}
        />
        {fieldError("cvv")}
      </div>
    </fieldset>
  );
}
