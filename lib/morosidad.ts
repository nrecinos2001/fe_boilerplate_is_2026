// Unidades en mora (H2): tipos del contrato, orden, filtros y helpers. Cliente y servidor;
// las llamadas a la API están en lib/morosidad-api.ts.

/** Ítem de GET /unidades/mora. Se muestra tal como lo devuelve el servicio. */
export type UnidadMorosa = {
  unidadId: string;
  codigoUnidad: string;
  torre: string;
  /** Correo del residente activo más antiguo; null si la unidad no tiene residentes. */
  responsable: string | null;
  /** Vencimiento más antiguo de sus cuotas vencidas ("AAAA-MM-DD"). */
  enMoraDesde: string;
  diasAtraso: number;
  /** Suma de los saldos de sus cuotas vencidas (no incluye las que aún no vencen). */
  montoAdeudado: number;
  cuotasVencidas: number;
};

export type PaginaMora = {
  total: number;
  pagina: number;
  tamano: number;
  /** "Hoy" del cálculo, en la zona horaria del condominio. */
  fechaCorte: string;
  items: UnidadMorosa[];
};

export type CampoOrden =
  | "unidad"
  | "responsable"
  | "enMoraDesde"
  | "diasAtraso"
  | "montoAdeudado"
  | "cuotasVencidas";

/** Campo ascendente, o con "-" delante para descendente (como lo espera el backend). */
export type Orden = CampoOrden | `-${CampoOrden}`;

export type FiltrosMora = {
  torre?: string;
  antiguedadMinDias?: number;
  orden: Orden;
  pagina: number;
};

export const RUTA_MOROSIDAD = "/morosidad";
export const TAMANO_PAGINA_MORA = 10;
export const ORDEN_POR_DEFECTO: Orden = "-diasAtraso";

const CAMPOS: CampoOrden[] = [
  "unidad",
  "responsable",
  "enMoraDesde",
  "diasAtraso",
  "montoAdeudado",
  "cuotasVencidas",
];

/**
 * Sentido con el que empieza cada columna al ordenarla: lo más urgente primero
 * (más días, más monto, más cuotas, la fecha más antigua); texto de la A a la Z.
 */
const PRIMER_SENTIDO: Record<CampoOrden, "asc" | "desc"> = {
  unidad: "asc",
  responsable: "asc",
  enMoraDesde: "asc",
  diasAtraso: "desc",
  montoAdeudado: "desc",
  cuotasVencidas: "desc",
};

/** Opciones de antigüedad mínima. El backend solo admite un mínimo, no rangos. */
export const ANTIGUEDADES: { dias: number; label: string }[] = [
  { dias: 30, label: "30 días o más" },
  { dias: 60, label: "60 días o más" },
  { dias: 90, label: "90 días o más" },
];

export function etiquetaAntiguedad(dias: number) {
  return ANTIGUEDADES.find((a) => a.dias === dias)?.label ?? `${dias} días o más`;
}

export function campoDe(orden: Orden): CampoOrden {
  return orden.replace(/^-/, "") as CampoOrden;
}

export function esDescendente(orden: Orden) {
  return orden.startsWith("-");
}

/** Orden al pulsar el encabezado de `campo`: alterna si ya está activo; si no, su primer sentido. */
export function siguienteOrden(actual: Orden, campo: CampoOrden): Orden {
  if (campoDe(actual) === campo) return esDescendente(actual) ? campo : `-${campo}`;
  return PRIMER_SENTIDO[campo] === "desc" ? `-${campo}` : campo;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Lee los filtros de la URL. Descarta los valores que el backend rechazaría con 400, para que
 * una URL editada a mano muestre la lista sin ese filtro en vez de un error.
 */
export function leerFiltros(searchParams: Record<string, string | string[] | undefined>): FiltrosMora {
  const torre = first(searchParams.torre)?.trim().slice(0, 100) || undefined;

  const antiguedadTexto = first(searchParams.antiguedad);
  const antiguedad = antiguedadTexto && /^\d{1,5}$/.test(antiguedadTexto) ? Number(antiguedadTexto) : undefined;

  const ordenTexto = first(searchParams.orden) ?? "";
  const orden = CAMPOS.includes(ordenTexto.replace(/^-/, "") as CampoOrden)
    ? (ordenTexto as Orden)
    : ORDEN_POR_DEFECTO;

  const paginaTexto = first(searchParams.pagina);
  const pagina = paginaTexto && /^\d{1,6}$/.test(paginaTexto) ? Math.max(1, Number(paginaTexto)) : 1;

  return {
    torre,
    antiguedadMinDias: antiguedad !== undefined && antiguedad <= 36500 ? antiguedad : undefined,
    orden,
    pagina,
  };
}

/** URL de la vista con estos filtros; los valores por defecto no se escriben. */
export function hrefMora(filtros: Partial<FiltrosMora>) {
  const sp = new URLSearchParams();
  if (filtros.torre) sp.set("torre", filtros.torre);
  if (filtros.antiguedadMinDias !== undefined) sp.set("antiguedad", String(filtros.antiguedadMinDias));
  if (filtros.orden && filtros.orden !== ORDEN_POR_DEFECTO) sp.set("orden", filtros.orden);
  if (filtros.pagina && filtros.pagina > 1) sp.set("pagina", String(filtros.pagina));
  const qs = sp.toString();
  return `${RUTA_MOROSIDAD}${qs ? `?${qs}` : ""}`;
}

/** Estado de cuenta de la unidad (el administrador puede consultar cualquiera). */
export function hrefEstadoCuenta(unidadId: string) {
  return `/estado-de-cuenta?unidad=${encodeURIComponent(unidadId)}`;
}

// Resumen ---------------------------------------------------------------------

export type ResumenMora = {
  unidades: number;
  cuotasVencidas: number;
  /** Suma de `montoAdeudado` de todas las unidades que cumplen los filtros. */
  totalAdeudado: number;
  /** La unidad con más días de atraso (la primera con orden -diasAtraso). */
  mayorAtraso: UnidadMorosa | null;
};

/** Resume la lista completa (todas las páginas) tal como la devolvió el servicio. */
export function resumir(items: UnidadMorosa[]): ResumenMora {
  let centavos = 0;
  let cuotas = 0;
  let mayor: UnidadMorosa | null = null;
  for (const u of items) {
    centavos += Math.round(u.montoAdeudado * 100);
    cuotas += u.cuotasVencidas;
    if (!mayor || u.diasAtraso > mayor.diasAtraso) mayor = u;
  }
  return { unidades: items.length, cuotasVencidas: cuotas, totalAdeudado: centavos / 100, mayorAtraso: mayor };
}

export function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}
