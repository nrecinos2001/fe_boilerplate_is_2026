// Tipos y utilidades de áreas comunes (H6). Sin dependencias de servidor:
// se puede importar desde componentes cliente.

export type Horario = {
  /** 0 = domingo … 6 = sábado. */
  diaSemana: number;
  /** "HH:mm" */
  horaApertura: string;
  /** "HH:mm" */
  horaCierre: string;
};

export type AreaInput = {
  nombre: string;
  capacidad: number;
  ubicacion: string;
  /** Duración del bloque de reserva, en horas. */
  duracionBloque: number;
  condicionesUso: string;
  horarios: Horario[];
};

export type Area = AreaInput & {
  id: number;
  estado: "ACTIVA" | "ELIMINADA";
};

/** Días en orden de lunes a domingo, con el valor que usa la API. */
export const DIAS = [
  { valor: 1, nombre: "Lunes", corto: "Lun" },
  { valor: 2, nombre: "Martes", corto: "Mar" },
  { valor: 3, nombre: "Miércoles", corto: "Mié" },
  { valor: 4, nombre: "Jueves", corto: "Jue" },
  { valor: 5, nombre: "Viernes", corto: "Vie" },
  { valor: 6, nombre: "Sábado", corto: "Sáb" },
  { valor: 0, nombre: "Domingo", corto: "Dom" },
] as const;

const ORDEN_DIA = new Map<number, number>(DIAS.map((d, i) => [d.valor, i]));

export const ESTADO_AREA: Record<Area["estado"], string> = {
  ACTIVA: "Habilitada",
  ELIMINADA: "Eliminada",
};

export function formatHoras(horas: number) {
  return `${horas} ${horas === 1 ? "hora" : "horas"}`;
}

// Resume una lista de días consecutivos: [1,2,3,4,5] → "Lun–Vie".
function formatDias(dias: number[]) {
  if (dias.length === 7) return "Todos los días";

  const indices = dias
    .map((d) => ORDEN_DIA.get(d) ?? -1)
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);

  const tramos: string[] = [];
  for (let i = 0; i < indices.length; i++) {
    const inicio = indices[i];
    while (indices[i + 1] === indices[i] + 1) i++;
    const fin = indices[i];
    const a = DIAS[inicio].corto;
    const b = DIAS[fin].corto;
    if (inicio === fin) tramos.push(a);
    else if (fin === inicio + 1) tramos.push(`${a}, ${b}`);
    else tramos.push(`${a}–${b}`);
  }
  return tramos.join(", ");
}

/** Agrupa los horarios que comparten franja: "10:00–20:00 h" + "Lun–Vie". */
export function resumirHorarios(horarios: Horario[] = []) {
  const grupos = new Map<string, number[]>();
  for (const h of horarios) {
    const franja = `${h.horaApertura.slice(0, 5)}–${h.horaCierre.slice(0, 5)} h`;
    grupos.set(franja, [...(grupos.get(franja) ?? []), h.diaSemana]);
  }
  return [...grupos].map(([franja, dias]) => ({ franja, dias: formatDias(dias) }));
}
