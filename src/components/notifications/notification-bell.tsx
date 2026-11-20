"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { startVisiblePolling } from "@/src/lib/visible-polling";
import { useAuthStatus, useRole } from "@/src/stores/useAuthStore";
import { useNotificationsStore, useUnreadCount } from "@/src/stores/useNotificationsStore";
import { UNREAD_POLL_INTERVAL_MS } from "@/src/types/notifications";
import { BellBadge } from "./bell-badge";

/** Rutas públicas donde no se muestra la campana. */
const HIDDEN_PATHS = ["/", "/login", "/home"];

/**
 * H25 · Campana de avisos en la barra superior. Solo la ve el miembro con
 * sesión; el contador se consulta cada 30 segundos mientras la pestaña está
 * visible.
 */
export function NotificationBell() {
  const status = useAuthStatus();
  const role = useRole();
  const pathname = usePathname();
  const unread = useUnreadCount();
  const refreshUnread = useNotificationsStore((s) => s.refreshUnread);

  const enabled = status === "authenticated" && role === "MEMBER";

  useEffect(() => {
    if (!enabled) return;
    return startVisiblePolling(() => void refreshUnread(), UNREAD_POLL_INTERVAL_MS, document);
  }, [enabled, refreshUnread]);

  if (!enabled || HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <header className="flex justify-end border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
      <Link
        href="/miembro/avisos"
        className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <BellBadge unread={unread} />
      </Link>
    </header>
  );
}
