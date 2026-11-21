// lib/preferencias-api.ts
import "server-only";
import { apiFetch } from "@/lib/api";
import type { PreferenciasResponse } from "@/lib/preferencias";

// GET /notificaciones/preferencias
export function obtenerPreferencias() {
  return apiFetch<PreferenciasResponse>("notificaciones/preferencias");
}

// PUT /notificaciones/preferencias
export function guardarPreferencias(preferencias: PreferenciasResponse) {
  return apiFetch<PreferenciasResponse>(
      "notificaciones/preferencias",
      {
        method: "PUT",
        body: JSON.stringify(preferencias),
      }
  );
}