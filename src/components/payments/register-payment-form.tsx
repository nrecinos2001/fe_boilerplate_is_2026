"use client";

import { useEffect, useRef, useState } from "react";
import { AccessDenied } from "@/src/components/access-denied";
import { newIdempotencyKey } from "@/src/lib/idempotency-key";
import {
  fetchPendingCharges,
  registerPayment,
  searchMembers,
} from "@/src/services/payments/payments-service";
import type {
  Charge,
  MemberOption,
  PaymentMethod,
  PaymentReceipt,
} from "@/src/types/payments";
import { EMPTY_CARD, validateCard, type CardErrors, type CardField } from "./card-logic";
import { ReceiptCard } from "./receipt-card";
import {
  buildPaymentInput,
  initialChargeId,
  SEARCH_DEBOUNCE_MS,
  shouldSearch,
  showNoMembersFound,
  visibleMemberOptions,
  type MemberSearchResults,
} from "./register-payment-logic";
import { RegisterPaymentFormView } from "./register-payment-form-view";
import { useReceiptDownload } from "./use-receipt-download";

/** Cobro en recepción (FE-15.1) y comprobante (FE-15.2). */
export function RegisterPaymentForm() {
  const [forbidden, setForbidden] = useState(false);

  // Miembro
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberSearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [member, setMember] = useState<MemberOption | null>(null);

  // Cobro y pago
  const [charges, setCharges] = useState<Charge[] | null>(null);
  const [chargeId, setChargeId] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [card, setCard] = useState(EMPTY_CARD);
  const [cardErrors, setCardErrors] = useState<CardErrors>({});
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const receiptDownload = useReceiptDownload();

  // Evita el doble envío aunque se haga doble clic antes de que React repinte.
  const sendingRef = useRef(false);
  // Solo cuenta la respuesta de la búsqueda o la carga más reciente: una lenta
  // que llega tarde no pisa a la nueva.
  const searchSeq = useRef(0);
  const chargesSeq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const seq = ++searchSeq.current;
    if (member || !shouldSearch(q)) return;

    const timer = setTimeout(async () => {
      setSearching(true);
      const result = await searchMembers(q);
      if (seq !== searchSeq.current) return;
      setSearching(false);
      if (result.ok) {
        setResults({ query: q, options: result.data });
      } else if (result.status === 403) {
        setForbidden(true);
      } else {
        setError(result.error);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, member]);

  async function loadCharges(memberId: string) {
    const seq = ++chargesSeq.current;
    setCharges(null);
    setChargeId(null);
    const result = await fetchPendingCharges(memberId);
    if (seq !== chargesSeq.current) return;
    if (result.ok) {
      setCharges(result.data);
      setChargeId(initialChargeId(result.data));
    } else if (result.status === 403) {
      setForbidden(true);
    } else {
      setCharges([]);
      setError(result.error);
    }
  }

  function chooseMember(option: MemberOption) {
    setMember(option);
    setQuery(option.email);
    setSearching(false);
    setError(null);
    void loadCharges(option.memberId);
  }

  function changeMember() {
    chargesSeq.current++;
    setMember(null);
    setQuery("");
    setResults(null);
    setCharges(null);
    setChargeId(null);
    clearCard();
    setError(null);
  }

  function handleQueryChange(value: string) {
    if (member) changeMember();
    setQuery(value);
    setError(null);
  }

  function clearCard() {
    setCard(EMPTY_CARD);
    setCardErrors({});
  }

  function handleMethodChange(value: PaymentMethod) {
    setMethod(value);
    clearCard();
    setError(null);
  }

  function handleCardChange(field: CardField, value: string) {
    setCard((prev) => ({ ...prev, [field]: value }));
    setCardErrors((prev) => ({ ...prev, [field]: undefined }));
    setError(null);
  }

  function dropCharge(id: number) {
    setCharges((prev) => prev?.filter((charge) => charge.chargeId !== id) ?? null);
    setChargeId(null);
  }

  async function handleSubmit() {
    const selected = charges?.find((charge) => charge.chargeId === chargeId);
    if (!selected || sendingRef.current) return;

    setError(null);
    if (method === "CARD") {
      const found = validateCard(card);
      setCardErrors(found);
      if (Object.keys(found).length > 0) return;
    }

    sendingRef.current = true;
    setProcessing(true);
    try {
      const result = await registerPayment(
        buildPaymentInput(selected.chargeId, method, card, newIdempotencyKey()),
      );

      if (result.ok) {
        setReceipt(result.data);
        receiptDownload.reset();
        dropCharge(selected.chargeId);
        return;
      }
      if (result.status === 403) {
        setForbidden(true);
        return;
      }
      setError(result.error);
      if (result.status === 409) dropCharge(selected.chargeId);
      if (result.status === 404 && member) void loadCharges(member.memberId);
    } finally {
      // Los datos de la tarjeta no se conservan después de un intento.
      clearCard();
      sendingRef.current = false;
      setProcessing(false);
    }
  }

  function startNewPayment() {
    setReceipt(null);
    receiptDownload.reset();
    if (member) void loadCharges(member.memberId);
  }

  if (forbidden) return <AccessDenied />;

  if (receipt) {
    return (
      <ReceiptCard
        receipt={receipt}
        downloading={receiptDownload.downloading}
        downloadError={receiptDownload.error}
        onDownload={() => void receiptDownload.download(receipt)}
      >
        <button
          type="button"
          onClick={startNewPayment}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Nuevo cobro
        </button>
      </ReceiptCard>
    );
  }

  return (
    <RegisterPaymentFormView
      query={query}
      // Una búsqueda que quedó vieja (se borró el texto) no deja "Buscando…" pegado.
      searching={searching && !member && shouldSearch(query)}
      options={visibleMemberOptions(query, results, member)}
      noMembersFound={showNoMembersFound(query, results, member, searching)}
      member={member}
      charges={member ? charges : null}
      chargeId={chargeId}
      method={method}
      card={card}
      cardErrors={cardErrors}
      processing={processing}
      error={error}
      onQueryChange={handleQueryChange}
      onChooseMember={chooseMember}
      onChangeMember={changeMember}
      onChargeChange={(id) => {
        setChargeId(id);
        setError(null);
      }}
      onMethodChange={handleMethodChange}
      onCardChange={handleCardChange}
      onSubmit={() => void handleSubmit()}
    />
  );
}
