import { apiFetch } from "@/lib/api";
import type { PaginaEjecuciones, ResultadoEjecucion, VistaPrevia } from "@/lib/generacion-cuotas";

// Generación manual de cuotas (H34). Solo ADMINISTRADOR. Solo usar en el servidor.

/** Simula la generación del periodo sin escribir en la base. */
export function obtenerVistaPrevia(reglaId: number, periodo: string) {
  return apiFetch<VistaPrevia>(`reglas-cuota/${reglaId}/generacion/vista-previa`, {
    method: "POST",
    body: JSON.stringify({ periodo }),
  });
}

/** Genera las cuotas faltantes del periodo. 409 EJECUCION_EN_CURSO si ya hay una en curso. */
export function ejecutarGeneracion(reglaId: number, periodo: string) {
  return apiFetch<ResultadoEjecucion>(`reglas-cuota/${reglaId}/generacion`, {
    method: "POST",
    body: JSON.stringify({ periodo }),
  });
}

/** Ejecuciones automáticas y manuales de la regla, de la más reciente a la más antigua. */
export function listarEjecuciones(reglaId: number, pagina: number, tamano: number) {
  const params = new URLSearchParams({ pagina: String(pagina), tamano: String(tamano) });
  return apiFetch<PaginaEjecuciones>(`reglas-cuota/${reglaId}/ejecuciones?${params}`);
}
