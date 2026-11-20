import { formatUsdPrice } from "@/src/lib/gym-datetime";
import type { ReceiptPage, ReceiptView } from "@/src/types/payments";
import { NO_RECEIPTS_MESSAGE, receiptViewFromSummary, totalPages } from "./my-payments-logic";
import { issuedAtText, paymentMethodText } from "./receipt-card";

export type MyReceiptsListProps = {
  /** null mientras carga. */
  page: ReceiptPage | null;
  error: string | null;
  downloadingId: number | null;
  downloadError: string | null;
  onDownload: (receipt: ReceiptView) => void;
  onPageChange: (page: number) => void;
};

/** Comprobantes del miembro, del más reciente al más antiguo, con su PDF (FE-16.1). */
export function MyReceiptsList({
  page,
  error,
  downloadingId,
  downloadError,
  onDownload,
  onPageChange,
}: MyReceiptsListProps) {
  const pages = page ? totalPages(page) : 1;

  return (
    <section aria-labelledby="mis-comprobantes-titulo" className="flex flex-col gap-3">
      <h2 id="mis-comprobantes-titulo" className="text-lg font-semibold">
        Mis comprobantes
      </h2>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {!page && !error && <p className="text-sm text-zinc-500">Cargando tus comprobantes…</p>}

      {page && page.data.length === 0 && !error && (
        <p className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          {NO_RECEIPTS_MESSAGE}
        </p>
      )}

      {downloadError && (
        <p role="alert" className="text-sm text-red-600">
          {downloadError}
        </p>
      )}

      {page && page.data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {page.data.map((summary) => {
            const receipt = receiptViewFromSummary(summary);
            const downloading = downloadingId === receipt.receiptId;
            return (
              <li
                key={receipt.receiptId}
                className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
              >
                <div className="flex flex-col gap-1 text-sm">
                  <p>
                    <span className="font-mono font-semibold">{receipt.receiptNumber}</span>
                    <span className="text-zinc-500"> · {issuedAtText(receipt.issuedAt)}</span>
                  </p>
                  <p className="font-medium">
                    {receipt.concept} · {formatUsdPrice(receipt.amount)}
                  </p>
                  <p className="text-zinc-500">{paymentMethodText(receipt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDownload(receipt)}
                  disabled={downloadingId !== null}
                  aria-label={`Descargar PDF del comprobante ${receipt.receiptNumber}`}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
                >
                  {downloading ? "Descargando…" : "Descargar PDF"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {page && pages > 1 && (
        <nav aria-label="Páginas de comprobantes" className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => onPageChange(page.page - 1)}
            disabled={page.page <= 1}
            className="rounded-md border border-zinc-300 px-3 py-1.5 disabled:opacity-40 dark:border-zinc-700"
          >
            Anterior
          </button>
          <span className="text-zinc-500">
            Página {page.page} de {pages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page.page + 1)}
            disabled={page.page >= pages}
            className="rounded-md border border-zinc-300 px-3 py-1.5 disabled:opacity-40 dark:border-zinc-700"
          >
            Siguiente
          </button>
        </nav>
      )}
    </section>
  );
}
