// Generación manual de cuotas (H34): tipos del contrato, etiquetas y utilidades de periodo.
// Se usa en cliente y servidor; las llamadas a la API están en lib/generacion-cuotas-api.ts.

import { hoyEnCondominio } from "@/lib/condominio";
import { nombrePeriodo } from "@/lib/estado-cuenta";

export type MotivoExcepcion = "UNIDAD_INACTIVA" | "SIN_RESPONSABLE" | "SIN_MONTO";
export type OrigenEjecucion = "AUTOMATICA" | "MANUAL";
export type EstadoEjecucion = "EN_CURSO" | "COMPLETADA" | "CON_ERRORES";

/** Unidad del alcance que no recibirá cuota. */
export type ExcepcionGeneracion = {
  unidadId: string;
  codigoUnidad: string;
  motivo: MotivoExcepcion;
  /** Cómo contará al ejecutar, según la política de la regla. */
  resultado: "OMITIDA" | "ERROR";
};

/** POST /reglas-cuota/{id}/generacion/vista-previa. No escribe en la base. */
export type VistaPrevia = {
  periodo: string;
  /** Cuotas que se crearían (lo que la ejecución devolverá en `creadas`). */
  cantidadUnidades: number;
  montoTotal: number;
  /** Unidades que ya tienen la cuota del periodo: se omiten. */
  yaGeneradas: number;
  /** "AAAA-MM-DD" */
  fechaVencimiento: string;
  excepciones: ExcepcionGeneracion[];
};

export type ErrorEjecucion = { unidadId: string; codigoUnidad: string; causa: string };

/** POST /reglas-cuota/{id}/generacion */
export type ResultadoEjecucion = {
  ejecucionId: number;
  periodo: string;
  estado: Exclude<EstadoEjecucion, "EN_CURSO">;
  creadas: number;
  /** Ya generadas antes u omitidas por la política de la regla. */
  omitidas: number;
  errores: ErrorEjecucion[];
  /** Suma de las cuotas creadas en esta ejecución. */
  montoTotal: number;
};

/** Ítem de GET /reglas-cuota/{id}/ejecuciones */
export type EjecucionHistorial = {
  id: number;
  /** Inicio, ISO con el desfase del condominio. */
  fecha: string;
  origen: OrigenEjecucion;
  /** Correo de quien la confirmó; null en las automáticas. */
  usuario: string | null;
  periodo: string;
  estado: EstadoEjecucion;
  creadas: number;
  omitidas: number;
  conError: number;
};

export type PaginaEjecuciones = {
  total: number;
  pagina: number;
  tamano: number;
  items: EjecucionHistorial[];
};

// Etiquetas -------------------------------------------------------------------

export const RUTA_GENERACION = "/cuotas/generacion";

export const MOTIVO_EXCEPCION: Record<MotivoExcepcion, string> = {
  UNIDAD_INACTIVA: "Unidad inactiva",
  SIN_RESPONSABLE: "Sin residente responsable",
  SIN_MONTO: "La regla no tiene monto para su tipo de unidad",
};

export const RESULTADO_EXCEPCION: Record<ExcepcionGeneracion["resultado"], { label: string; className: string }> = {
  OMITIDA: { label: "Se omitirá", className: "bg-sand/40 text-foreground" },
  ERROR: { label: "Quedará con error", className: "bg-danger/10 text-danger" },
};

export const ORIGEN_EJECUCION: Record<OrigenEjecucion, { label: string; className: string }> = {
  AUTOMATICA: { label: "Automática", className: "bg-sand/40 text-foreground" },
  MANUAL: { label: "Manual", className: "bg-sage/30 text-foreground" },
};

export const ESTADO_EJECUCION: Record<EstadoEjecucion, { label: string; className: string }> = {
  EN_CURSO: { label: "En curso", className: "bg-sand/50 text-foreground" },
  COMPLETADA: { label: "Completada", className: "bg-sage/30 text-foreground" },
  CON_ERRORES: { label: "Con errores", className: "bg-danger/10 text-danger" },
};

// Periodos --------------------------------------------------------------------

const PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Periodo "AAAA-MM" en curso, en la zona horaria del condominio (la misma que usa el backend). */
export function periodoActual(hoy = hoyEnCondominio()) {
  return hoy.slice(0, 7);
}

/** "2026-11" → "2026-10" (n = 1). */
export function restarMeses(periodo: string, n: number) {
  const [anio, mes] = periodo.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1 - n, 1)).toISOString().slice(0, 7);
}

/** Cuántos periodos ofrece el selector, contando el actual. */
export const PERIODOS_SELECCIONABLES = 12;

/** Periodo actual y los anteriores, del más reciente al más antiguo. Nunca futuros. */
export function periodosSeleccionables(actual = periodoActual()) {
  return Array.from({ length: PERIODOS_SELECCIONABLES }, (_, i) => restarMeses(actual, i));
}

export function esPeriodoValido(periodo: string | undefined): periodo is string {
  return Boolean(periodo && PERIODO.test(periodo));
}

/** "2026-10" → "octubre de 2026" (dentro de una oración). */
export function periodoEnTexto(periodo: string) {
  const [mes, anio] = nombrePeriodo(periodo).split(" ");
  return anio ? `${mes.toLowerCase()} de ${anio}` : periodo;
}

// Vista previa ----------------------------------------------------------------

export type DesgloseVista = {
  /** Unidades del alcance de la regla hoy. */
  enAlcance: number;
  porCrear: number;
  yaGeneradas: number;
  omitidas: number;
  conError: number;
};

export function desglosarVista(vista: VistaPrevia): DesgloseVista {
  const omitidas = vista.excepciones.filter((e) => e.resultado === "OMITIDA").length;
  const conError = vista.excepciones.length - omitidas;
  return {
    enAlcance: vista.cantidadUnidades + vista.yaGeneradas + vista.excepciones.length,
    porCrear: vista.cantidadUnidades,
    yaGeneradas: vista.yaGeneradas,
    omitidas,
    conError,
  };
}

/**
 * Diferencias entre la vista previa confirmada y lo que hizo la ejecución. Solo aparecen si
 * algo cambió entre ambas (otra ejecución, unidades o residentes modificados…).
 */
export function diferenciasConVista(vista: VistaPrevia, resultado: ResultadoEjecucion): string[] {
  const d = desglosarVista(vista);
  const diferencias: string[] = [];
  if (resultado.creadas !== d.porCrear)
    diferencias.push(`se crearon ${resultado.creadas} cuotas y la vista previa indicaba ${d.porCrear}`);
  if (Math.round(resultado.montoTotal * 100) !== Math.round(vista.montoTotal * 100))
    diferencias.push("el monto total no coincide");
  if (resultado.omitidas !== d.yaGeneradas + d.omitidas)
    diferencias.push(`${resultado.omitidas} omitidas frente a ${d.yaGeneradas + d.omitidas} previstas`);
  if (resultado.errores.length !== d.conError)
    diferencias.push(`${resultado.errores.length} con error frente a ${d.conError} previstas`);
  return diferencias;
}

export function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

const formatoFechaHora = new Intl.DateTimeFormat("es", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** ISO con desfase en hora local del condominio → "05 nov 2026, 10:12 h". */
export function fechaHoraEjecucion(iso: string) {
  const fecha = formatoFechaHora.format(new Date(`${iso.slice(0, 10)}T12:00:00Z`)).replace(".", "");
  return `${fecha}, ${iso.slice(11, 16)} h`;
}
