import { formatUsdPrice } from "@/src/lib/gym-datetime";
import type { Charge } from "@/src/types/payments";
import { CardFields } from "./card-fields";
import type { CardErrors, CardField, CardValues } from "./card-logic";
import { dueDateText, payButtonLabel, PROCESSING_MESSAGE } from "./my-payments-logic";

export type CardPaymentFormViewProps = {
  charge: Charge;
  card: CardValues;
  cardErrors: CardErrors;
  processing: boolean;
  error: string | null;
  onCardChange: (field: CardField, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  now?: Date;
};

/**
 * Pago en línea de un cobro con tarjeta (FE-16.2). El monto se muestra pero
 * no se envía: el servidor lo toma del cobro guardado.
 */
export function CardPaymentFormView({
  charge,
  card,
  cardErrors,
  processing,
  error,
  onCardChange,
  onSubmit,
  onCancel,
  now,
}: CardPaymentFormViewProps) {
  return (
    <form
      noValidate
      aria-busy={processing}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-5"
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <dt className="text-zinc-500">Concepto</dt>
        <dd className="font-medium">{charge.concept}</dd>
        <dt className="text-zinc-500">Monto</dt>
        <dd className="font-medium">{formatUsdPrice(charge.amount)}</dd>
        <dt className="text-zinc-500">Fecha</dt>
        <dd>{dueDateText(charge, now)}</dd>
      </dl>

      <CardFields
        values={card}
        errors={cardErrors}
        disabled={processing}
        onChange={onCardChange}
        idPrefix="my-card"
      />

      {processing && (
        <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
          {PROCESSING_MESSAGE}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={processing}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {processing ? "Procesando pago…" : payButtonLabel(charge.amount)}
        </button>
      </div>
    </form>
  );
}
