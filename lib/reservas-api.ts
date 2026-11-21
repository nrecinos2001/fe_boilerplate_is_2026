import { apiFetch } from "@/lib/api";
import type { Reserva, ReservaInput } from "@/lib/reservas";

// Reservas (H5). Solo usar en el servidor.

/** POST /reservas: especificado en el diseño técnico de H5. */
export function crearReserva(input: ReservaInput) {
  return apiFetch<Reserva>("reservas", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** GET /reservas: reservas de la unidad del usuario autenticado (mismo formato que el POST). */
export function listarMisReservas() {
  return apiFetch<Reserva[]>("reservas");
}

/** PATCH /reservas/{id}/cancelar: pasa la reserva a CANCELADA. Sin cuerpo. */
export function cancelarReserva(reservaId: number) {
  return apiFetch<Reserva | undefined>(`reservas/${reservaId}/cancelar`, { method: "PATCH" });
}
