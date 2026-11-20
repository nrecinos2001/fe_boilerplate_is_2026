import type { CardInput } from "@/src/types/payments";

// Reglas de los datos de tarjeta. Coinciden con CardDto y la pasarela simulada
// del backend, que las vuelve a validar. Las comparten el cobro en recepción
// (H15) y el pago en línea del miembro (H16).
//
// El vencimiento solo se valida en formato: si la tarjeta está vencida lo
// decide la pasarela, que guarda el intento rechazado ("Tarjeta vencida").

export type CardValues = CardInput;
export type CardField = keyof CardValues;
export type CardErrors = Partial<Record<CardField, string>>;

export const EMPTY_CARD: CardValues = { cardNumber: "", holderName: "", expiry: "", cvv: "" };

export const CARD_NUMBER_MESSAGE = "El número de tarjeta debe tener 16 dígitos.";
export const HOLDER_NAME_MESSAGE = "El nombre del titular debe tener entre 3 y 60 caracteres.";
export const EXPIRY_MESSAGE = "El vencimiento debe tener el formato MM/AA.";
export const CVV_MESSAGE = "El CVV debe tener 3 dígitos.";

const EXPIRY_REGEX = /^(0[1-9]|1[0-2])\/\d{2}$/;

export function validateCard(card: CardValues): CardErrors {
  const errors: CardErrors = {};
  if (!/^\d{16}$/.test(digitsOnly(card.cardNumber))) errors.cardNumber = CARD_NUMBER_MESSAGE;
  const holder = card.holderName.trim();
  if (holder.length < 3 || holder.length > 60) errors.holderName = HOLDER_NAME_MESSAGE;
  if (!EXPIRY_REGEX.test(card.expiry.trim())) errors.expiry = EXPIRY_MESSAGE;
  if (!/^\d{3}$/.test(card.cvv)) errors.cvv = CVV_MESSAGE;
  return errors;
}

/** Datos ya validados, listos para el cuerpo del pago. */
export function toCardInput(card: CardValues): CardInput {
  return {
    cardNumber: digitsOnly(card.cardNumber),
    holderName: card.holderName.trim(),
    expiry: card.expiry.trim(),
    cvv: card.cvv,
  };
}

/** Lo que se escribe en el número: hasta 16 dígitos en grupos de 4. */
export function formatCardNumberInput(value: string): string {
  return digitsOnly(value)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** Lo que se escribe en el vencimiento: MM/AA con la barra puesta sola. */
export function formatExpiryInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

/** Lo que se escribe en el CVV: hasta 3 dígitos. */
export function formatCvvInput(value: string): string {
  return digitsOnly(value).slice(0, 3);
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}
