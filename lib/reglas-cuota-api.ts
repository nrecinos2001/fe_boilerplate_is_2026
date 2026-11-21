import { apiFetch } from "@/lib/api";
import type {
  EstadoRegla,
  ReglaCuota,
  ReglaCuotaInput,
  UnidadCondominio,
} from "@/lib/reglas-cuota";

export function listReglasCuota() {
  return apiFetch<ReglaCuota[]>("reglas-cuota");
}

export function createReglaCuota(input: ReglaCuotaInput) {
  return apiFetch<ReglaCuota>("reglas-cuota", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** PUT reemplaza la configuración; el estado se cambia con `cambiarEstadoReglaCuota`. */
export function updateReglaCuota(id: number, input: ReglaCuotaInput) {
  return apiFetch<ReglaCuota>(`reglas-cuota/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function cambiarEstadoReglaCuota(id: number, estado: EstadoRegla) {
  return apiFetch<{ id: number; estado: EstadoRegla }>(`reglas-cuota/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });
}

/** Unidades del condominio (ADMINISTRADOR o SEGURIDAD). */
export function listUnidades() {
  return apiFetch<UnidadCondominio[]>("unidades");
}
