// lib/notificaciones-api.ts
import "server-only";
import { apiFetch } from "@/lib/api";
import type { Filtro, ModuloFiltro, PaginaNotificaciones } from "@/lib/notificaciones";

export function listarNotificaciones(opts: {
  page: number;
  size: number;
  filtro: Filtro;
  modulo?: ModuloFiltro; // ✅ AGREGADO
}) {
  const params = new URLSearchParams({
    page: String(opts.page),
    size: String(opts.size),
  });

  if (opts.filtro === "sin_leer") params.set("leidas", "sin_leer");
  if (opts.filtro === "leidas") params.set("leidas", "leidas");

  if (opts.modulo && opts.modulo !== "todos") {
    params.set("modulo", opts.modulo);
  }

  return apiFetch<PaginaNotificaciones>(`notificaciones?${params}`);
}

export async function contarNoLeidas() {
  const { count } = await apiFetch<{ count: number }>("notificaciones/no-leidas/conteo");
  return count;
}

export function cambiarLeida(id: number, leida: boolean) {
  return apiFetch<{ id: number; leida: boolean; fechaLectura: string | null }>(
      `notificaciones/${id}/leida`,
      { method: "PATCH", body: JSON.stringify({ leida }) }
  );
}

export function marcarTodasLeidas() {
  return apiFetch<{ actualizadas: number }>(
      "notificaciones/leidas/todas",
      { method: "PATCH" }
  );
}