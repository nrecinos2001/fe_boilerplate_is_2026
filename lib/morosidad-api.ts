import { apiFetch } from "@/lib/api";
import {
  ORDEN_POR_DEFECTO,
  resumir,
  type Orden,
  type PaginaMora,
  type ResumenMora,
} from "@/lib/morosidad";

// Unidades en mora (H2). Solo ADMINISTRADOR. Solo usar en el servidor.

type Consulta = {
  torre?: string;
  antiguedadMinDias?: number;
  orden?: Orden;
  pagina?: number;
  tamano?: number;
};

/** GET /unidades/mora: una página, con el orden y los filtros aplicados por el backend. */
export function listarUnidadesMorosas(consulta: Consulta) {
  const sp = new URLSearchParams();
  if (consulta.torre) sp.set("torre", consulta.torre);
  if (consulta.antiguedadMinDias !== undefined) sp.set("antiguedadMinDias", String(consulta.antiguedadMinDias));
  sp.set("orden", consulta.orden ?? ORDEN_POR_DEFECTO);
  sp.set("pagina", String(consulta.pagina ?? 1));
  sp.set("tamano", String(consulta.tamano ?? 20));
  return apiFetch<PaginaMora>(`unidades/mora?${sp}`);
}

/** El máximo que admite el backend por página. */
const TAMANO_MAXIMO = 100;

/**
 * Totales de todas las unidades que cumplen los filtros. El backend no devuelve agregados,
 * así que se recorren todas sus páginas (500 unidades en mora = 5 consultas).
 */
export async function resumenMora(filtros: Pick<Consulta, "torre" | "antiguedadMinDias">): Promise<ResumenMora> {
  const base = { ...filtros, orden: ORDEN_POR_DEFECTO, tamano: TAMANO_MAXIMO } as const;
  const primera = await listarUnidadesMorosas({ ...base, pagina: 1 });
  const paginas = Math.ceil(primera.total / TAMANO_MAXIMO);
  const resto = await Promise.all(
    Array.from({ length: Math.max(0, paginas - 1) }, (_, i) => listarUnidadesMorosas({ ...base, pagina: i + 2 })),
  );
  return resumir([primera, ...resto].flatMap((p) => p.items));
}
