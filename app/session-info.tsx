"use client";

import { useAuthStatus, useAuthUser } from "@/src/stores/useAuthStore";

export function SessionInfo() {
  const status = useAuthStatus();
  const user = useAuthUser();

  if (status === "loading") {
    return <p className="text-sm text-zinc-500">Cargando sesión...</p>;
  }
  if (!user) return null;

  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">
      {user.fullName} · <span className="font-medium">{user.role}</span>
    </p>
  );
}
