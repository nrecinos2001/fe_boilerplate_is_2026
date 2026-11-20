"use client";

import Link from "next/link";
import { useAuthStatus, useAuthUser } from "@/src/stores/useAuthStore";
import type { AuthStatus } from "@/src/stores/useAuthStore";
import type { AuthUser } from "@/src/types/auth";

interface MemberAccessBoundaryProps {
  status: AuthStatus;
  user: AuthUser | null;
  children: React.ReactNode;
}

/**
 * Componente puro y testeable para restringir vistas exclusivas al rol MEMBER.
 */
export function MemberAccessBoundary({
  status,
  user,
  children,
}: MemberAccessBoundaryProps) {
  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div
            aria-hidden
            className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"
          />
          <p className="text-sm font-medium text-zinc-500">Verificando sesión y permisos...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30">
          <h1 className="text-xl font-bold text-amber-900 dark:text-amber-200">
            Sesión no iniciada o expirada
          </h1>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
            Inicia sesión con tu cuenta de miembro para acceder a esta sección.
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== "MEMBER") {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm dark:border-red-900/50 dark:bg-red-950/30">
          <h1 className="text-xl font-bold text-red-800 dark:text-red-300">
            Acceso restringido
          </h1>
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            Esta vista es exclusiva para usuarios con rol{" "}
            <strong className="font-semibold">MEMBER</strong>. Tu rol actual es{" "}
            <span className="font-semibold uppercase">{user.role}</span>.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

/**
 * Envuelve vistas exclusivas de MEMBER leyendo la sesión desde el store global.
 */
export function MemberRoleGuard({ children }: { children: React.ReactNode }) {
  const status = useAuthStatus();
  const user = useAuthUser();

  return (
    <MemberAccessBoundary status={status} user={user}>
      {children}
    </MemberAccessBoundary>
  );
}
