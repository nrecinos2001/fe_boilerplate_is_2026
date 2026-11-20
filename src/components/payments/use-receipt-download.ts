"use client";

import { useCallback, useRef, useState } from "react";
import { saveFile } from "@/src/lib/download-file";
import { downloadReceiptPdf } from "@/src/services/payments/payments-service";
import type { ReceiptView } from "@/src/types/payments";

/**
 * Estado de "Descargar PDF" (FE-15.2, FE-16.1 y FE-16.2). `downloadingId`
 * dice cuál se está bajando cuando hay una lista de comprobantes.
 */
export function useReceiptDownload() {
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const download = useCallback(async (receipt: Pick<ReceiptView, "receiptId" | "receiptNumber">) => {
    // Una descarga a la vez: el doble clic no baja el archivo dos veces.
    if (busy.current) return;
    busy.current = true;
    setDownloadingId(receipt.receiptId);
    setError(null);
    try {
      const result = await downloadReceiptPdf(receipt.receiptId, receipt.receiptNumber);
      if (result.ok) saveFile(result.data.blob, result.data.filename);
      else setError(result.error);
    } finally {
      busy.current = false;
      setDownloadingId(null);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);

  return { downloading: downloadingId !== null, downloadingId, error, download, reset };
}
