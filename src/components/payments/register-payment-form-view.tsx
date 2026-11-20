import { formatUsdPrice } from "@/src/lib/gym-datetime";
import {
  PAYMENT_METHOD_LABELS,
  type Charge,
  type MemberOption,
  type PaymentMethod,
} from "@/src/types/payments";
import { CardFields } from "./card-fields";
import type { CardErrors, CardField, CardValues } from "./card-logic";
import {
  chargeOptionLabel,
  NO_MEMBERS_FOUND_MESSAGE,
  NO_PENDING_CHARGES_MESSAGE,
} from "./register-payment-logic";

const INPUT_CLASS =
  "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:focus:border-zinc-100";

export type RegisterPaymentFormViewProps = {
  query: string;
  searching: boolean;
  options: MemberOption[];
  noMembersFound: boolean;
  member: MemberOption | null;
  /** null mientras se cargan los cobros del miembro elegido. */
  charges: Charge[] | null;
  chargeId: number | null;
  method: PaymentMethod;
  card: CardValues;
  cardErrors: CardErrors;
  processing: boolean;
  error: string | null;
  onQueryChange: (query: string) => void;
  onChooseMember: (member: MemberOption) => void;
  onChangeMember: () => void;
  onChargeChange: (chargeId: number | null) => void;
  onMethodChange: (method: PaymentMethod) => void;
  onCardChange: (field: CardField, value: string) => void;
  onSubmit: () => void;
};

/** Pantalla de cobro en recepción sin estado propio (FE-15.1). */
export function RegisterPaymentFormView({
  query,
  searching,
  options,
  noMembersFound,
  member,
  charges,
  chargeId,
  method,
  card,
  cardErrors,
  processing,
  error,
  onQueryChange,
  onChooseMember,
  onChangeMember,
  onChargeChange,
  onMethodChange,
  onCardChange,
  onSubmit,
}: RegisterPaymentFormViewProps) {
  const selected = charges?.find((charge) => charge.chargeId === chargeId) ?? null;
  const hasCharges = Boolean(member && charges && charges.length > 0);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-5"
    >
      <div className="relative flex flex-col gap-1">
        <label htmlFor="member-search" className="text-sm font-medium">
          Miembro
        </label>
        <div className="flex gap-2">
          <input
            id="member-search"
            name="member-search"
            type="search"
            autoComplete="off"
            maxLength={100}
            placeholder="Correo del miembro"
            className={INPUT_CLASS}
            value={query}
            disabled={processing}
            aria-autocomplete="list"
            aria-controls="member-options"
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {member && (
            <button
              type="button"
              onClick={onChangeMember}
              disabled={processing}
              className="rounded-md border border-zinc-300 px-3 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
            >
              Cambiar
            </button>
          )}
        </div>
        {searching && <p className="text-xs text-zinc-500">Buscando…</p>}
        {noMembersFound && <p className="text-xs text-zinc-500">{NO_MEMBERS_FOUND_MESSAGE}</p>}
        {options.length > 0 && (
          <ul
            id="member-options"
            role="listbox"
            className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-md border border-zinc-300 bg-background shadow-lg dark:border-zinc-700"
          >
            {options.map((option) => (
              <li key={option.memberId} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => onChooseMember(option)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {option.email}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {member && charges === null && <p className="text-sm text-zinc-500">Cargando cobros…</p>}

      {member && charges?.length === 0 && (
        <p className="rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
          {NO_PENDING_CHARGES_MESSAGE}
        </p>
      )}

      {hasCharges && charges && (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="charge" className="text-sm font-medium">
              Cobro pendiente
            </label>
            <select
              id="charge"
              name="charge"
              className={INPUT_CLASS}
              value={chargeId ?? ""}
              disabled={processing}
              onChange={(event) =>
                onChargeChange(event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">Selecciona un cobro pendiente</option>
              {charges.map((charge) => (
                <option key={charge.chargeId} value={charge.chargeId}>
                  {chargeOptionLabel(charge)}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <div className="flex flex-col gap-1">
              <label htmlFor="amount" className="text-sm font-medium">
                Monto
              </label>
              {/* Solo lectura: el servidor toma el monto del cobro, no de aquí. */}
              <input
                id="amount"
                readOnly
                tabIndex={-1}
                className={`${INPUT_CLASS} bg-zinc-100 dark:bg-zinc-800`}
                value={formatUsdPrice(selected.amount)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="method" className="text-sm font-medium">
              Método de pago
            </label>
            <select
              id="method"
              name="method"
              className={INPUT_CLASS}
              value={method}
              disabled={processing}
              onChange={(event) => onMethodChange(event.target.value as PaymentMethod)}
            >
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((value) => (
                <option key={value} value={value}>
                  {PAYMENT_METHOD_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          {method === "CARD" && (
            <CardFields
              values={card}
              errors={cardErrors}
              disabled={processing}
              onChange={onCardChange}
            />
          )}
        </>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {hasCharges && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!selected || processing}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          >
            {processing ? "Procesando pago…" : "Cobrar"}
          </button>
        </div>
      )}
    </form>
  );
}
