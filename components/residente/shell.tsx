import { Suspense, type ReactNode } from "react";
import { logout } from "@/app/actions/auth";
import { BellLink, NotificationBell } from "./notification-bell";
import { MenuMovil, Sidebar } from "./sidebar";

// Estructura común del área del residente: menú lateral + encabezado con la
// campana de notificaciones.
export function ResidenteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-crema text-habita-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MenuMovil />
        <header className="flex h-16 items-center justify-between border-b border-borde px-5 md:px-10">
          <p className="text-sm text-habita-700/70">
            Mi comunidad
          </p>
          <div className="flex items-center gap-3">
            <Suspense fallback={<BellLink count={0} />}>
              <NotificationBell />
            </Suspense>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg px-3 py-2 text-sm text-habita-700 hover:bg-arena"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </header>
        <div className="flex-1 px-5 py-8 md:px-10">{children}</div>
        <footer className="border-t border-borde px-5 py-4 text-xs text-habita-700/70 md:px-10">
          © 2026 Habita
        </footer>
      </div>
    </div>
  );
}
