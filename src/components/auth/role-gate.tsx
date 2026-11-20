"use client";

import { AccessDenied } from "@/src/components/access-denied";
import { useAuthStatus, useRole } from "@/src/stores/useAuthStore";
import type { AuthStatus } from "@/src/stores/useAuthStore";
import type { Role } from "@/src/types/auth";

export type GateDecision = "loading" | "allowed" | "denied";

/** Decide qué mostrar según la sesión y los roles que acepta la pantalla. */
export function gateDecision(
  status: AuthStatus,
  role: Role | null,
  allowed: readonly Role[],
): GateDecision {
  // Sin sesión el AuthProvider ya está mandando a /login: no se muestra
  // "sin permiso" a quien solo necesita volver a iniciar sesión.
  if (status !== "authenticated") return "loading";
  return role && allowed.includes(role) ? "allowed" : "denied";
}

type RoleGateProps = {
  roles: readonly Role[];
  children: React.ReactNode;
};

/**
 * Muestra la pantalla solo a los roles permitidos; los demás ven
 * "No tienes permiso para ver esta página.". Es solo la capa visual: el
 * servidor vuelve a validar el rol y responde 403.
 */
export function RoleGate({ roles, children }: RoleGateProps) {
  const decision = gateDecision(useAuthStatus(), useRole(), roles);

  if (decision === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-zinc-500">Cargando sesión...</p>
      </div>
    );
  }
  if (decision === "denied") return <AccessDenied />;
  return children;
}
