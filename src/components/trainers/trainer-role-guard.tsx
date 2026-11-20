"use client";

import Link from "next/link";
import { useAuthStatus, useAuthUser } from "@/src/stores/useAuthStore";

export function TrainerRoleGuard({ children }: { children: React.ReactNode }) {
  const status = useAuthStatus();
  const user = useAuthUser();
  if (status === "loading") return <p role="status" className="p-8">Verificando sesión y permisos...</p>;
  if (status !== "authenticated" || !user) {
    return <div className="p-8 text-center"><p>Inicia sesión para ver tu agenda.</p><Link href="/login" className="text-indigo-700 underline">Iniciar sesión</Link></div>;
  }
  if (user.role !== "TRAINER") {
    return <div className="p-8 text-center"><p>Esta vista es exclusiva para entrenadores.</p><Link href="/dashboard" className="text-indigo-700 underline">Volver al inicio</Link></div>;
  }
  return children;
}
