import { formatUsdPrice } from "@/src/lib/gym-datetime";
import type {
  Charge,
  CreatePaymentInput,
  MemberOption,
  PaymentMethod,
} from "@/src/types/payments";
import { toCardInput, type CardValues } from "./card-logic";

// Reglas de la pantalla de cobro en recepción (FE-15.1).

/** Con menos caracteres no se busca ni se muestran resultados. */
export const MIN_SEARCH_LENGTH = 2;
/** Espera después de dejar de escribir antes de buscar. */
export const SEARCH_DEBOUNCE_MS = 400;

export const NO_MEMBERS_FOUND_MESSAGE = "No se encontraron miembros.";
export const NO_PENDING_CHARGES_MESSAGE = "Este miembro no tiene cobros pendientes.";

export function shouldSearch(query: string): boolean {
  return query.trim().length >= MIN_SEARCH_LENGTH;
}

/** Resultado de la última búsqueda, con el texto que la produjo. */
export type MemberSearchResults = { query: string; options: MemberOption[] };

/** Las opciones solo se ven con 2 caracteres o más y sin miembro elegido. */
export function visibleMemberOptions(
  query: string,
  results: MemberSearchResults | null,
  member: MemberOption | null,
): MemberOption[] {
  if (member || !results || !shouldSearch(query)) return [];
  return results.options;
}

/** "No se encontraron miembros." solo cuando la búsqueda de ese texto terminó vacía. */
export function showNoMembersFound(
  query: string,
  results: MemberSearchResults | null,
  member: MemberOption | null,
  searching: boolean,
): boolean {
  return (
    !member &&
    !searching &&
    shouldSearch(query) &&
    results?.query === query.trim() &&
    results.options.length === 0
  );
}

/** "2026-11-30" -> "30/11/2026", sin pasar por Date para no correr el día. */
export function formatDueDate(dueDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : dueDate;
}

/** Texto de cada cobro en el selector. */
export function chargeOptionLabel(charge: Charge): string {
  return `${charge.concept} · ${formatUsdPrice(charge.amount)} · vence ${formatDueDate(charge.dueDate)}`;
}

/** Con un solo cobro pendiente queda elegido de una vez. */
export function initialChargeId(charges: Charge[]): number | null {
  return charges.length === 1 ? charges[0].chargeId : null;
}

/** Cuerpo de POST /payments. Los datos de tarjeta solo van si se paga con tarjeta. */
export function buildPaymentInput(
  chargeId: number,
  method: PaymentMethod,
  card: CardValues,
  idempotencyKey: string,
): CreatePaymentInput {
  return {
    chargeId,
    paymentMethod: method,
    ...(method === "CARD" ? { card: toCardInput(card) } : {}),
    idempotencyKey,
  };
}
