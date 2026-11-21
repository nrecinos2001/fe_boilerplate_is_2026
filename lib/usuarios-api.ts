import "server-only";
import { apiFetch } from "@/lib/api";
import type { NuevoUsuario, UnidadCondominio, UsuarioCreado } from "@/lib/usuarios";

/** GET /unidades (administrador y seguridad). */
export function listarUnidades() {
  return apiFetch<UnidadCondominio[]>("unidades");
}

/** POST /users (solo administrador). */
export function crearUsuario(input: NuevoUsuario) {
  return apiFetch<UsuarioCreado>("users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
