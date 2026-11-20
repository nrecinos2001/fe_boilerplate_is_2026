import { formatGymShortDate, formatGymTime, formatUsdPrice } from "@/src/lib/gym-datetime";
import { PAYMENT_METHOD_LABELS, type ReceiptView } from "@/src/types/payments";

export type ReceiptCardProps = {
  receipt: ReceiptView;
  /** Título del aviso; por defecto, el del cobro en recepción. */
  heading?: string;
  downloading: boolean;
  downloadError: string | null;
  onDownload: () => void;
  /** Acciones extra junto a "Descargar PDF" (p. ej. "Nuevo cobro"). */
  children?: React.ReactNode;
};

/** "Tarjeta terminada en 4242" o "Efectivo". */
export function paymentMethodText(receipt: Pick<ReceiptView, "paymentMethod" | "cardLast4">): string {
  if (receipt.paymentMethod === "CARD" && receipt.cardLast4) {
    return `Tarjeta terminada en ${receipt.cardLast4}`;
  }
  return PAYMENT_METHOD_LABELS[receipt.paymentMethod];
}

/** Fecha y hora del gimnasio: "19/11/2026 15:42". */
export function issuedAtText(issuedAt: string): string {
  return `${formatGymShortDate(issuedAt)} ${formatGymTime(issuedAt)}`;
}

/**
 * Comprobante después de un pago aprobado (FE-15.2). Lo reutiliza el pago en
 * línea del miembro (FE-16.2).
 */
export function ReceiptCard({
  receipt,
  heading = "Pago registrado",
  downloading,
  downloadError,
  onDownload,
  children,
}: ReceiptCardProps) {
  return (
    <section
      aria-live="polite"
      className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30"
    >
      <p className="font-semibold text-emerald-800 dark:text-emerald-300">
        {heading}. Comprobante {receipt.receiptNumber}.
      </p>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="text-zinc-500">Número</dt>
        <dd className="font-mono font-semibold">{receipt.receiptNumber}</dd>
        <dt className="text-zinc-500">Fecha</dt>
        <dd>{issuedAtText(receipt.issuedAt)}</dd>
        <dt className="text-zinc-500">Concepto</dt>
        <dd>{receipt.concept}</dd>
        <dt className="text-zinc-500">Monto</dt>
        <dd>{formatUsdPrice(receipt.amount)}</dd>
        <dt className="text-zinc-500">Método</dt>
        <dd>{paymentMethodText(receipt)}</dd>
      </dl>

      {downloadError && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {downloadError}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {children}
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {downloading ? "Descargando…" : "Descargar PDF"}
        </button>
      </div>
    </section>
  );
}
