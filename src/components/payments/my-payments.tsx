"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AccessDenied } from "@/src/components/access-denied";
import { newIdempotencyKey } from "@/src/lib/idempotency-key";
import {
  fetchMyCharges,
  fetchMyReceipts,
  payMyChargeWithCard,
} from "@/src/services/payments/member-payments-service";
import type { CardPaymentResult, Charge, ReceiptPage } from "@/src/types/payments";
import { CardPaymentFormView } from "./card-payment-form-view";
import { EMPTY_CARD, validateCard, type CardErrors, type CardField } from "./card-logic";
import { MyChargesList } from "./my-charges-list";
import { buildCardPaymentInput, membershipStatusMessage } from "./my-payments-logic";
import { MyReceiptsList } from "./my-receipts-list";
import { ReceiptCard } from "./receipt-card";
import { useReceiptDownload } from "./use-receipt-download";

/**
 * "Mis pagos" del miembro (H16): cobros pendientes y comprobantes (FE-16.1),
 * y pago en línea con tarjeta con su comprobante (FE-16.2).
 */
export function MyPayments() {
  const [forbidden, setForbidden] = useState(false);

  const [charges, setCharges] = useState<Charge[] | null>(null);
  const [chargesError, setChargesError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<ReceiptPage | null>(null);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);
  /** Aviso arriba de las listas, p. ej. "Este cobro ya está pagado.". */
  const [notice, setNotice] = useState<string | null>(null);

  const [paying, setPaying] = useState<Charge | null>(null);
  const [card, setCard] = useState(EMPTY_CARD);
  const [cardErrors, setCardErrors] = useState<CardErrors>({});
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [result, setResult] = useState<CardPaymentResult | null>(null);

  const receiptDownload = useReceiptDownload();
  // Evita el doble envío aunque se haga doble clic antes de que React repinte.
  const sendingRef = useRef(false);
  // Solo cuenta la carga más reciente: una lenta que llega tarde no pisa a la nueva.
  const chargesSeq = useRef(0);
  const receiptsSeq = useRef(0);

  // Los setState van dentro del .then: se aplican cuando llega la respuesta.
  const loadCharges = useCallback(() => {
    const seq = ++chargesSeq.current;
    return fetchMyCharges("PENDING").then((res) => {
      if (seq !== chargesSeq.current) return;
      if (res.ok) {
        setCharges(res.data);
        setChargesError(null);
      } else if (res.status === 403) {
        setForbidden(true);
      } else {
        setCharges([]);
        setChargesError(res.error);
      }
    });
  }, []);

  const loadReceipts = useCallback((page: number) => {
    const seq = ++receiptsSeq.current;
    return fetchMyReceipts(page).then((res) => {
      if (seq !== receiptsSeq.current) return;
      if (res.ok) {
        setReceipts(res.data);
        setReceiptsError(null);
      } else if (res.status === 403) {
        setForbidden(true);
      } else {
        setReceiptsError(res.error);
      }
    });
  }, []);

  useEffect(() => {
    void loadCharges();
    void loadReceipts(1);
  }, [loadCharges, loadReceipts]);

  function clearCard() {
    setCard(EMPTY_CARD);
    setCardErrors({});
  }

  function startPayment(charge: Charge) {
    setPaying(charge);
    clearCard();
    setPayError(null);
    setNotice(null);
    receiptDownload.reset();
  }

  function cancelPayment() {
    setPaying(null);
    clearCard();
    setPayError(null);
  }

  function handleCardChange(field: CardField, value: string) {
    setCard((prev) => ({ ...prev, [field]: value }));
    setCardErrors((prev) => ({ ...prev, [field]: undefined }));
    setPayError(null);
  }

  async function handleSubmit() {
    if (!paying || sendingRef.current) return;

    setPayError(null);
    const found = validateCard(card);
    setCardErrors(found);
    if (Object.keys(found).length > 0) return;

    sendingRef.current = true;
    setProcessing(true);
    try {
      const res = await payMyChargeWithCard(
        paying.chargeId,
        buildCardPaymentInput(card, newIdempotencyKey()),
      );

      if (res.ok) {
        setResult(res.data);
        setPaying(null);
        receiptDownload.reset();
        void loadCharges();
        void loadReceipts(1);
        return;
      }
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (res.status === 409 || res.status === 404) {
        // El cobro ya no se puede pagar: se vuelve a la lista con el aviso.
        setPaying(null);
        setNotice(res.error);
        void loadCharges();
        if (res.status === 409) void loadReceipts(1);
        return;
      }
      // Rechazo de la pasarela o dato inválido: el formulario sigue abierto.
      setPayError(res.error);
    } finally {
      // Los datos de la tarjeta no se conservan después de un intento.
      clearCard();
      sendingRef.current = false;
      setProcessing(false);
    }
  }

  if (forbidden) return <AccessDenied />;

  if (result) {
    const statusMessage = membershipStatusMessage(result);
    return (
      <div className="flex flex-col gap-4">
        {statusMessage && (
          <p role="status" className="text-sm font-semibold">
            {statusMessage}
          </p>
        )}
        <ReceiptCard
          receipt={result}
          heading="Pago aprobado"
          downloading={receiptDownload.downloading}
          downloadError={receiptDownload.error}
          onDownload={() => void receiptDownload.download(result)}
        >
          <button
            type="button"
            onClick={() => {
              setResult(null);
              receiptDownload.reset();
            }}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Volver a mis pagos
          </button>
        </ReceiptCard>
      </div>
    );
  }

  if (paying) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Pagar con tarjeta</h2>
        <CardPaymentFormView
          charge={paying}
          card={card}
          cardErrors={cardErrors}
          processing={processing}
          error={payError}
          onCardChange={handleCardChange}
          onSubmit={() => void handleSubmit()}
          onCancel={cancelPayment}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {notice && (
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {notice}
        </p>
      )}
      <MyChargesList charges={charges} error={chargesError} onPay={startPayment} />
      <MyReceiptsList
        page={receipts}
        error={receiptsError}
        downloadingId={receiptDownload.downloadingId}
        downloadError={receiptDownload.error}
        onDownload={(receipt) => void receiptDownload.download(receipt)}
        onPageChange={(page) => void loadReceipts(page)}
      />
    </div>
  );
}
