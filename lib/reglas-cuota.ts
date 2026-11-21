// Reglas de cuota (H3): tipos del contrato, etiquetas y validación compartida
// entre el formulario (cliente) y la server action.

import { MONEDA, formatMonto } from "@/lib/moneda";

export type EstadoRegla = "ACTIVA" | "PAUSADA" | "INACTIVA";
export type TipoMonto = "FIJO" | "POR_TIPO_UNIDAD";
export type Alcance = "TODAS" | "TIPO" | "TORRE" | "SELECCION";
export type PoliticaInactivas = "GENERAR" | "OMITIR" | "REVISAR";
export type TipoUnidad = "DEPARTAMENTO" | "CASA" | "LOCAL";

export type MontoPorTipo = { tipo: TipoUnidad; monto: number };

export type ReglaCuota = {
  id: number;
  estado: EstadoRegla;
  concepto: string;
  tipoMonto: TipoMonto;
  monto: number | null;
  montosPorTipo: MontoPorTipo[];
  diaGeneracion: number;
  diaVencimiento: number;
  alcance: Alcance;
  alcanceValor: string | null;
  unidadIds: string[];
  politicaInactivas: PoliticaInactivas;
  /** Unidades que abarca hoy el alcance (calculado por el backend). */
  unidadesAplicables: number;
  creadoEn: string;
  actualizadoEn: string;
};

/** Body de POST y PUT /reglas-cuota. `estado` solo se envía al crear. */
export type ReglaCuotaInput = {
  concepto: string;
  tipoMonto: TipoMonto;
  monto: number | null;
  montosPorTipo: MontoPorTipo[];
  diaGeneracion: number;
  diaVencimiento: number;
  alcance: Alcance;
  alcanceValor: string | null;
  unidadIds: string[];
  politicaInactivas: PoliticaInactivas;
  estado?: EstadoRegla;
};

/** Unidad tal como la devuelve GET /unidades. */
export type UnidadCondominio = {
  id: string;
  code: string;
  tower: string;
  description: string;
  type: TipoUnidad;
  active: boolean;
};

// Etiquetas -------------------------------------------------------------------

export const RUTA_REGLAS = "/cuotas/reglas";

// La moneda se configura con NEXT_PUBLIC_MONEDA (lib/moneda.ts).
export { MONEDA, formatMonto };

export const ESTADO_REGLA: Record<EstadoRegla, { label: string; className: string }> = {
  ACTIVA: { label: "Activa", className: "bg-sage/30 text-foreground" },
  PAUSADA: { label: "Pausada", className: "bg-sand/50 text-foreground" },
  INACTIVA: { label: "Inactiva", className: "bg-sand/30 text-muted" },
};

export const TIPOS_MONTO: { valor: TipoMonto; label: string }[] = [
  { valor: "FIJO", label: "Fijo por unidad" },
  { valor: "POR_TIPO_UNIDAD", label: "Según el tipo de unidad" },
];

export const TIPOS_UNIDAD: { valor: TipoUnidad; label: string; plural: string }[] = [
  { valor: "DEPARTAMENTO", label: "Departamento", plural: "departamentos" },
  { valor: "CASA", label: "Casa", plural: "casas" },
  { valor: "LOCAL", label: "Local", plural: "locales" },
];

export const ALCANCES: { valor: Alcance; label: string }[] = [
  { valor: "TODAS", label: "Todas las unidades" },
  { valor: "TORRE", label: "Una torre" },
  { valor: "TIPO", label: "Un tipo de unidad" },
  { valor: "SELECCION", label: "Unidades seleccionadas" },
];

export const POLITICAS: { valor: PoliticaInactivas; label: string; ayuda: string }[] = [
  {
    valor: "OMITIR",
    label: "Omitir",
    ayuda: "No se genera cuota para unidades inactivas o sin responsable.",
  },
  {
    valor: "GENERAR",
    label: "Generar igual",
    ayuda: "Se genera la cuota aunque la unidad esté inactiva o sin responsable.",
  },
  {
    valor: "REVISAR",
    label: "Marcar para revisión",
    ayuda: "No se genera: la unidad queda registrada como error para revisarla.",
  },
];

export const DIAS_MES = Array.from({ length: 28 }, (_, i) => i + 1);

/** "RG-001" */
export function folioRegla(id: number) {
  return `RG-${String(id).padStart(3, "0")}`;
}

const tipoLabel = (tipo: string) =>
  TIPOS_UNIDAD.find((t) => t.valor === tipo)?.plural ?? tipo.toLowerCase();

/** "Todas las unidades", "Torre A", "Solo casas", "3 unidades". */
export function describirAlcance(regla: Pick<ReglaCuota, "alcance" | "alcanceValor" | "unidadIds">) {
  switch (regla.alcance) {
    case "TODAS":
      return "Todas las unidades";
    case "TORRE":
      return regla.alcanceValor ?? "Torre";
    case "TIPO":
      return `Solo ${tipoLabel(regla.alcanceValor ?? "")}`;
    case "SELECCION": {
      const n = regla.unidadIds.length;
      return `${n} ${n === 1 ? "unidad seleccionada" : "unidades seleccionadas"}`;
    }
  }
}

/** Importe que se muestra en la tabla: fijo o rango por tipo. */
export function describirImporte(regla: Pick<ReglaCuota, "tipoMonto" | "monto" | "montosPorTipo">) {
  if (regla.tipoMonto === "FIJO") return regla.monto === null ? "Sin monto" : formatMonto(regla.monto);
  if (regla.montosPorTipo.length === 0) return "Sin montos";
  const montos = regla.montosPorTipo.map((m) => m.monto);
  const min = Math.min(...montos);
  const max = Math.max(...montos);
  return min === max ? formatMonto(min) : `${formatMonto(min)} – ${formatMonto(max)}`;
}

// Formulario ------------------------------------------------------------------

export type ReglaFormValues = {
  concepto: string;
  tipoMonto: TipoMonto;
  monto: string;
  montosPorTipo: Record<TipoUnidad, string>;
  diaGeneracion: string;
  diaVencimiento: string;
  alcance: Alcance;
  torre: string;
  tipoUnidad: TipoUnidad | "";
  unidadIds: string[];
  politicaInactivas: PoliticaInactivas;
  /** Solo al crear: estado con el que nace la regla. */
  estado: EstadoRegla;
};

export type ReglaFieldErrors = Partial<Record<string, string>>;

const montoTexto = (n: number | null | undefined) => (n == null ? "" : n.toFixed(2));

export function valoresIniciales(regla?: ReglaCuota): ReglaFormValues {
  const porTipo = (tipo: TipoUnidad) =>
    montoTexto(regla?.montosPorTipo.find((m) => m.tipo === tipo)?.monto);
  return {
    concepto: regla?.concepto ?? "",
    tipoMonto: regla?.tipoMonto ?? "FIJO",
    monto: montoTexto(regla?.monto),
    montosPorTipo: { DEPARTAMENTO: porTipo("DEPARTAMENTO"), CASA: porTipo("CASA"), LOCAL: porTipo("LOCAL") },
    diaGeneracion: String(regla?.diaGeneracion ?? 1),
    diaVencimiento: String(regla?.diaVencimiento ?? 10),
    alcance: regla?.alcance ?? "TODAS",
    torre: regla?.alcance === "TORRE" ? (regla.alcanceValor ?? "") : "",
    tipoUnidad: regla?.alcance === "TIPO" ? ((regla.alcanceValor as TipoUnidad) ?? "") : "",
    unidadIds: regla?.unidadIds ?? [],
    politicaInactivas: regla?.politicaInactivas ?? "OMITIR",
    estado: regla?.estado ?? "ACTIVA",
  };
}

const MAX_MONTO = 9_999_999_999.99;

/** "$2,400.00" / "2400" / "2,400.5" → 2400.5; null si no es un importe válido. */
export function parseMonto(texto: string): number | null {
  const limpio = texto.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  const n = Number(limpio);
  return n > 0 && n <= MAX_MONTO ? n : null;
}

const parseDia = (texto: string) => (/^\d+$/.test(texto) ? Number(texto) : NaN);

/**
 * Valida el formulario y arma el body. Se usa igual en el cliente (antes de enviar)
 * y en la server action (por si el cliente se salta la validación).
 */
export function validarRegla(
  values: ReglaFormValues,
  { creando }: { creando: boolean },
): { errors: ReglaFieldErrors; input: ReglaCuotaInput } {
  const errors: ReglaFieldErrors = {};

  const concepto = values.concepto.trim().replace(/\s+/g, " ");
  if (!concepto) errors.concepto = "Ingresa el concepto de la cuota.";
  else if (concepto.length > 100) errors.concepto = "El concepto no puede pasar de 100 caracteres.";

  let monto: number | null = null;
  const montosPorTipo: MontoPorTipo[] = [];
  if (values.tipoMonto === "FIJO") {
    if (!values.monto.trim()) errors.monto = "Ingresa el importe por unidad.";
    else if ((monto = parseMonto(values.monto)) === null)
      errors.monto = "Ingresa un importe mayor a 0, con hasta 2 decimales.";
  } else {
    for (const { valor, label } of TIPOS_UNIDAD) {
      const texto = values.montosPorTipo[valor].trim();
      if (!texto) continue;
      const n = parseMonto(texto);
      if (n === null) errors[`monto-${valor}`] = `Importe de ${label.toLowerCase()} no válido.`;
      else montosPorTipo.push({ tipo: valor, monto: n });
    }
    if (montosPorTipo.length === 0 && !TIPOS_UNIDAD.some(({ valor }) => errors[`monto-${valor}`]))
      errors.montosPorTipo = "Ingresa el importe de al menos un tipo de unidad.";
  }

  const diaGeneracion = parseDia(values.diaGeneracion);
  const diaVencimiento = parseDia(values.diaVencimiento);
  if (!(diaGeneracion >= 1 && diaGeneracion <= 28))
    errors.diaGeneracion = "Elige un día entre 1 y 28.";
  if (!(diaVencimiento >= 1 && diaVencimiento <= 28))
    errors.diaVencimiento = "Elige un día entre 1 y 28.";
  else if (diaVencimiento < diaGeneracion)
    errors.diaVencimiento = "El vencimiento no puede ser antes del día de generación.";

  let alcanceValor: string | null = null;
  let unidadIds: string[] = [];
  switch (values.alcance) {
    case "TORRE":
      alcanceValor = values.torre.trim() || null;
      if (!alcanceValor) errors.alcanceValor = "Elige la torre.";
      break;
    case "TIPO":
      alcanceValor = values.tipoUnidad || null;
      if (!alcanceValor) errors.alcanceValor = "Elige el tipo de unidad.";
      break;
    case "SELECCION":
      unidadIds = [...new Set(values.unidadIds)];
      if (unidadIds.length === 0) errors.unidadIds = "Selecciona al menos una unidad.";
      break;
  }

  const input: ReglaCuotaInput = {
    concepto,
    tipoMonto: values.tipoMonto,
    monto: values.tipoMonto === "FIJO" ? monto : null,
    montosPorTipo,
    diaGeneracion,
    diaVencimiento,
    alcance: values.alcance,
    alcanceValor,
    unidadIds,
    politicaInactivas: values.politicaInactivas,
    ...(creando ? { estado: values.estado } : {}),
  };
  return { errors, input };
}

// Estimación ------------------------------------------------------------------

export function unidadesEnAlcance(
  unidades: UnidadCondominio[],
  values: Pick<ReglaFormValues, "alcance" | "torre" | "tipoUnidad" | "unidadIds">,
) {
  switch (values.alcance) {
    case "TODAS":
      return unidades;
    case "TORRE": {
      const torre = values.torre.trim().toLowerCase();
      return torre ? unidades.filter((u) => u.tower.toLowerCase() === torre) : [];
    }
    case "TIPO":
      return values.tipoUnidad ? unidades.filter((u) => u.type === values.tipoUnidad) : [];
    case "SELECCION": {
      const ids = new Set(values.unidadIds);
      return unidades.filter((u) => ids.has(u.id));
    }
  }
}

export type Estimacion = {
  unidades: number;
  inactivas: number;
  /** Unidades que recibirían cuota según la política. */
  conCuota: number;
  /** Unidades cuyo tipo no tiene importe (POR_TIPO_UNIDAD). */
  sinImporte: number;
  total: number;
};

/** Estimación de un periodo completo con los valores actuales del formulario. */
export function estimarPeriodo(unidades: UnidadCondominio[], values: ReglaFormValues): Estimacion {
  const alcance = unidadesEnAlcance(unidades, values);
  const inactivas = alcance.filter((u) => !u.active).length;
  const generan = values.politicaInactivas === "GENERAR" ? alcance : alcance.filter((u) => u.active);

  let total = 0;
  let sinImporte = 0;
  let conCuota = 0;
  for (const u of generan) {
    const monto = parseMonto(
      values.tipoMonto === "FIJO" ? values.monto : values.montosPorTipo[u.type] ?? "",
    );
    if (monto === null) sinImporte++;
    else {
      conCuota++;
      total += monto;
    }
  }
  return { unidades: alcance.length, inactivas, conCuota, sinImporte, total };
}

/** Torres distintas, ordenadas. */
export function torresDe(unidades: UnidadCondominio[]) {
  return [...new Set(unidades.map((u) => u.tower))].sort((a, b) => a.localeCompare(b, "es"));
}
