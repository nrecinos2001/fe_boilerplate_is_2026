// Moneda en la que se muestran todos los importes. Se configura con NEXT_PUBLIC_MONEDA (código
// ISO 4217: USD, MXN, EUR…). Lleva el prefijo NEXT_PUBLIC_ porque también la usan componentes
// cliente; Next la incrusta al compilar, así que un cambio requiere reiniciar `next dev` o
// volver a ejecutar `next build`.

const MONEDA_POR_DEFECTO = "USD";

function leerMoneda(): string {
  // Debe escribirse literal (process.env.NEXT_PUBLIC_…) para que Next la incruste en el cliente.
  const valor = (process.env.NEXT_PUBLIC_MONEDA ?? "").trim().toUpperCase();
  if (!valor) return MONEDA_POR_DEFECTO;
  if (!/^[A-Z]{3}$/.test(valor)) {
    console.warn(
      `NEXT_PUBLIC_MONEDA="${valor}" no es un código ISO 4217 (p. ej. USD). Se usará ${MONEDA_POR_DEFECTO}.`,
    );
    return MONEDA_POR_DEFECTO;
  }
  return valor;
}

/** Código de la moneda, p. ej. "USD". Es el texto que acompaña a los importes. */
export const MONEDA = leerMoneda();

// narrowSymbol: "$5,300.00" tanto para USD como para MXN (sin él, es-MX escribe "USD 5,300.00").
const formato = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: MONEDA,
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Símbolo de la moneda ("$", "€"…), p. ej. para el prefijo de un campo de importe. */
export const SIMBOLO_MONEDA =
  formato.formatToParts(0).find((parte) => parte.type === "currency")?.value ?? MONEDA;

/** 5300 → "$5,300.00" (el código de la moneda se muestra aparte con MONEDA). */
export function formatMonto(valor: number) {
  return formato.format(valor);
}
