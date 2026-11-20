import { formatUsdPrice } from "@/src/lib/gym-datetime";
import { CHARGE_TYPE_LABELS, type Charge } from "@/src/types/payments";
import {
  dueDateText,
  isOverdue,
  NO_PENDING_CHARGES_MINE_MESSAGE,
  payButtonLabel,
  totalPending,
} from "./my-payments-logic";

export type MyChargesListProps = {
  /** null mientras carga. */
  charges: Charge[] | null;
  error: string | null;
  onPay: (charge: Charge) => void;
  /** Para decidir qué cobros están vencidos (tests). */
  now?: Date;
};

/** Cobros pendientes del miembro, cada uno con su botón "Pagar" (FE-16.1). */
export function MyChargesList({ charges, error, onPay, now }: MyChargesListProps) {
  return (
    <section aria-labelledby="mis-cobros-titulo" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="mis-cobros-titulo" className="text-lg font-semibold">
          Cobros pendientes
        </h2>
        {charges && charges.length > 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Total: <span className="font-semibold">{formatUsdPrice(totalPending(charges))}</span>
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {!charges && !error && <p className="text-sm text-zinc-500">Cargando tus cobros…</p>}

      {charges && charges.length === 0 && !error && (
        <p className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          {NO_PENDING_CHARGES_MINE_MESSAGE}
        </p>
      )}

      {charges && charges.length > 0 && (
        <ul className="flex flex-col gap-3">
          {charges.map((charge) => {
            const overdue = isOverdue(charge.dueDate, now);
            return (
              <li
                key={charge.chargeId}
                className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
              >
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{charge.concept}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {CHARGE_TYPE_LABELS[charge.type]} · {formatUsdPrice(charge.amount)}
                  </p>
                  <p className={`text-sm ${overdue ? "font-semibold text-red-600" : "text-zinc-500"}`}>
                    {dueDateText(charge, now)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onPay(charge)}
                  className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
                >
                  {payButtonLabel(charge.amount)}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
