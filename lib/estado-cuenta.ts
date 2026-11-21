// Tipos y utilidades del estado de cuenta y el pago de cuotas (H1). Sin dependencias de
// servidor: se puede importar desde componentes cliente.

export type EstadoCuota = "PENDIENTE" | "PARCIAL" | "PAGADA" | "ANULADA";

export type Cuota = {
  id: number;
  /** "AAAA-MM" */
  periodo: string;
  concepto: string;
  monto: number;
  /** "AAAA-MM-DD" */
  fechaVencimiento: string;
  estado: EstadoCuota;
  /** Monto menos la suma de sus pagos. Lo calcula la API; no se recalcula aquí. */
  saldo: number;
};

/** Lo que un pago aplicó a una cuota. Un pago que cubre varias cuotas genera varias líneas. */
export type PagoLinea = {
  id: number;
  pagoId: number;
  cuotaId: number;
  monto: number;
  /** ISO 8601 en hora local del condominio: "2026-10-08T10:35:00-06:00". */
  fechaPago: string;
};

/** GET /unidades/{unidadId}/estado-de-cuenta */
export type EstadoCuenta = {
  unidadId: string;
  saldoTotal: number;
  /** Por fecha de vencimiento descendente. */
  cuotas: Cuota[];
  /** Del más reciente al más antiguo. */
  pagos: PagoLinea[];
};

/** POST /pagos. La unidad sale de la sesión, nunca del formulario. */
export type PagoInput = {
  unidadId: string;
  cuotaIds: number[];
  monto: number;
  referencia?: string;
  /** Últimos 4 dígitos de la tarjeta de prueba. Nunca se envía el número completo. */
  tarjetaUltimos4?: string;
};

export type CuotaAplicada = {
  cuotaId: number;
  montoAplicado: number;
  estadoResultante: EstadoCuota;
};

/** Respuesta 201 de POST /pagos. */
export type PagoRegistrado = {
  pagoId: number;
  fechaPago: string;
  /** Por fecha de vencimiento ascendente. */
  aplicado: CuotaAplicada[];
  /** Saldo total de la unidad después del pago. */
  saldoRestante: number;
};

export const RUTA_ESTADO_CUENTA = "/estado-de-cuenta";
export const RUTA_PAGOS = "/pagos";

/**
 * Tarjetas guardadas de demostración. La pasarela simulada del backend aprueba siempre la que
 * termina en 2026 y rechaza siempre la que termina en 2000 (tras 5 s); la interfaz no lo
 * anuncia. También se puede pagar con una tarjeta de un solo uso (lib/tarjeta.ts).
 */
export const TARJETAS_GUARDADAS = [
  { ultimos4: "2026", nombre: "Tarjeta de prueba", vence: "12/28" },
  { ultimos4: "2000", nombre: "Tarjeta de prueba", vence: "12/28" },
] as const;

/** Admite pagos: pendiente o parcial con saldo. */
export function porPagar(cuota: Cuota) {
  return (cuota.estado === "PENDIENTE" || cuota.estado === "PARCIAL") && cuota.saldo > 0;
}

/**
 * Cuota vencida: PENDIENTE o PARCIAL cuya fecha de vencimiento es anterior a hoy. Una cuota
 * que vence hoy todavía no está vencida (definiciones comunes del proyecto).
 */
export function esVencida(cuota: Cuota, hoy: string) {
  return porPagar(cuota) && cuota.fechaVencimiento < hoy;
}

/** Cuotas por pagar, de la que vence primero a la última (orden en que se aplica un pago). */
export function cuotasPorPagar(cuotas: Cuota[]) {
  return cuotas
    .filter(porPagar)
    .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento) || a.id - b.id);
}

export type EstadoVista = "pendiente" | "vencida" | "parcial" | "parcial-vencida" | "pagada" | "anulada";

/** Texto y color de cada estado: el texto siempre acompaña al color. */
export const ESTADO_VISTA: Record<EstadoVista, { texto: string; clase: string }> = {
  pendiente: { texto: "Pendiente", clase: "bg-sage/30 text-foreground" },
  vencida: { texto: "Vencida", clase: "bg-sand/60 text-foreground" },
  parcial: { texto: "Pago parcial", clase: "bg-sage/30 text-foreground" },
  "parcial-vencida": { texto: "Parcial · vencida", clase: "bg-sand/60 text-foreground" },
  pagada: { texto: "Pagada", clase: "bg-moss/15 text-foreground" },
  anulada: { texto: "Anulada", clase: "bg-border/60 text-muted" },
};

export function estadoVista(cuota: Cuota, hoy: string): EstadoVista {
  const vencida = esVencida(cuota, hoy);
  switch (cuota.estado) {
    case "PENDIENTE":
      return vencida ? "vencida" : "pendiente";
    case "PARCIAL":
      return vencida ? "parcial-vencida" : "parcial";
    case "PAGADA":
      return "pagada";
    default:
      return "anulada";
  }
}

/** Datos de las tarjetas de resumen. Solo suma saldos que ya calculó la API. */
export function resumenCuenta(estado: EstadoCuenta, hoy: string) {
  const pendientes = cuotasPorPagar(estado.cuotas);
  const vencidas = pendientes.filter((c) => esVencida(c, hoy));
  const proxima = pendientes.find((c) => c.fechaVencimiento >= hoy) ?? null;
  return {
    saldoTotal: estado.saldoTotal,
    cuotasPorCubrir: pendientes.length,
    vencido: {
      importe: centavos(vencidas.reduce((suma, c) => suma + c.saldo, 0)),
      cuotas: vencidas.length,
      /** Vencimiento más antiguo: desde cuándo la unidad está en mora. */
      desde: vencidas[0]?.fechaVencimiento ?? null,
    },
    proxima,
  };
}

/** Redondea a centavos para evitar arrastrar errores de punto flotante al sumar montos. */
export function centavos(valor: number) {
  return Math.round(valor * 100) / 100;
}

// La moneda se configura con NEXT_PUBLIC_MONEDA (lib/moneda.ts).
export { MONEDA, SIMBOLO_MONEDA, formatMonto } from "@/lib/moneda";

/**
 * Interpreta lo que escribe el residente ("1,250.5", "1250.50") como un monto con hasta
 * dos decimales. Devuelve null si no es un número válido.
 */
export function leerMonto(texto: string): number | null {
  const limpio = texto.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  return centavos(Number(limpio));
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** "2026-10" → "Octubre 2026" */
export function nombrePeriodo(periodo: string) {
  const [anio, mes] = periodo.split("-").map(Number);
  return MESES[mes - 1] ? `${MESES[mes - 1]} ${anio}` : periodo;
}

/** "Mantenimiento · Octubre 2026" */
export function tituloCuota(cuota: Pick<Cuota, "concepto" | "periodo">) {
  return `${cuota.concepto} · ${nombrePeriodo(cuota.periodo)}`;
}

const formatoFecha = new Intl.DateTimeFormat("es", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** "2026-11-10" (o un ISO con hora local) → "10 nov 2026" */
export function fechaCorta(fecha: string) {
  return formatoFecha.format(new Date(`${fecha.slice(0, 10)}T12:00:00Z`)).replace(".", "");
}

/** ISO con desfase en hora local del condominio → "10:35 h". La hora local viene en el texto. */
export function horaDeIso(iso: string) {
  return `${iso.slice(11, 16)} h`;
}

/** Año ("2026") de una fecha "AAAA-MM-DD" o ISO local. */
export function anioDe(fecha: string) {
  return fecha.slice(0, 4);
}

/** Folio del comprobante: "HB-261105-0078" (fecha local del pago + id del pago). */
export function folioPago(pago: Pick<PagoRegistrado, "pagoId" | "fechaPago">) {
  const fecha = pago.fechaPago.slice(2, 10).replaceAll("-", "");
  return `HB-${fecha}-${String(pago.pagoId).padStart(4, "0")}`;
}

/**
 * Referencia del pago (única en la API). Se genera una por intento de confirmación: si el
 * mismo envío llega dos veces, la API responde 409 en lugar de cobrar dos veces.
 */
export function nuevaReferencia(ahora = new Date()) {
  const aleatorio = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DEMO-${ahora.toISOString().slice(2, 10).replaceAll("-", "")}-${aleatorio}`;
}
