// Tarjeta de un solo uso para el pago de cuotas (H1). Sin dependencias de servidor.
//
// Los datos completos (número, vencimiento, CVV) nunca salen del navegador: al servidor solo
// se envían los últimos 4 dígitos, que es lo único que necesita la pasarela simulada. Esta
// acepta siempre la tarjeta que termina en 2026 y rechaza siempre la que termina en 2000.

export type DatosTarjeta = {
  numero: string;
  nombre: string;
  /** "MM/AA" */
  vence: string;
  cvv: string;
};

export type ErroresTarjeta = Partial<Record<keyof DatosTarjeta, string>>;

export const TARJETA_VACIA: DatosTarjeta = { numero: "", nombre: "", vence: "", cvv: "" };

export const soloDigitos = (texto: string) => texto.replace(/\D/g, "");

/** "4242424242422026" → "4242 4242 4242 2026" (hasta 19 dígitos). */
export function formatearNumero(texto: string) {
  return soloDigitos(texto).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** "1228" → "12/28" mientras se escribe. */
export function formatearVence(texto: string) {
  const d = soloDigitos(texto).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export const ultimos4 = (numero: string) => soloDigitos(numero).slice(-4);

/**
 * Valida la tarjeta. No se exige el dígito verificador (Luhn): es una simulación y las
 * tarjetas de prueba (terminadas en 2026 o 2000) no tienen por qué cumplirlo.
 * `hoy` es "AAAA-MM-DD" en la zona del condominio, para decidir si la tarjeta está vencida.
 */
export function validarTarjeta(tarjeta: DatosTarjeta, hoy: string): ErroresTarjeta {
  const errores: ErroresTarjeta = {};

  const digitos = soloDigitos(tarjeta.numero);
  if (digitos.length < 13 || digitos.length > 19) {
    errores.numero = "Escribe el número completo de la tarjeta (13 a 19 dígitos).";
  }

  if (tarjeta.nombre.trim().length < 3) {
    errores.nombre = "Escribe el nombre como aparece en la tarjeta.";
  }

  const vence = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(tarjeta.vence);
  if (!vence) {
    errores.vence = "Usa el formato MM/AA.";
  } else {
    // La tarjeta vale hasta el último día de su mes de vencimiento.
    const [anioHoy, mesHoy] = hoy.split("-").map(Number);
    const anio = 2000 + Number(vence[2]);
    const mes = Number(vence[1]);
    if (anio < anioHoy || (anio === anioHoy && mes < mesHoy)) errores.vence = "La tarjeta está vencida.";
  }

  if (!/^\d{3,4}$/.test(tarjeta.cvv)) {
    errores.cvv = "El código de seguridad tiene 3 o 4 dígitos.";
  }

  return errores;
}
