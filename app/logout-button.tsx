"use client";

import { logout } from "@/app/actions/auth";
import { useAuthStore } from "@/src/stores/useAuthStore";

export function LogoutButton() {
  async function handleLogout() {
    useAuthStore.getState().clearSession();
    await logout();
  }

  return (
    <form action={handleLogout}>
      <button
        type="submit"
        className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
