"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotificationList } from "@/src/components/notifications/notification-list";
import {
  fetchInbox,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/src/services/notifications/notifications-service";
import { useAuthStatus, useRole } from "@/src/stores/useAuthStore";
import { useNotificationsStore, useUnreadCount } from "@/src/stores/useNotificationsStore";
import { totalPages, type AppNotification, type NotificationPage } from "@/src/types/notifications";

/**
 * H25 · Bandeja de avisos del miembro: 20 por página, del más reciente al más
 * antiguo, con la opción de marcar uno o todos como leídos.
 */
export default function MemberNotificationsPage() {
  const status = useAuthStatus();
  const role = useRole();
  const unread = useUnreadCount();
  const refreshUnread = useNotificationsStore((s) => s.refreshUnread);
  const decrementUnread = useNotificationsStore((s) => s.decrementUnread);
  const setUnread = useNotificationsStore((s) => s.setUnread);

  const [page, setPage] = useState(1);
  const [inbox, setInbox] = useState<NotificationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const isMember = status === "authenticated" && role === "MEMBER";

  useEffect(() => {
    if (!isMember) return;
    let cancelled = false;
    fetchInbox(page).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setInbox(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isMember, page, reloadKey]);

  function refresh() {
    setLoading(true);
    setActionError(null);
    setReloadKey((k) => k + 1);
    void refreshUnread();
  }

  function goToPage(next: number) {
    setLoading(true);
    setPage(next);
  }

  async function handleMarkRead(notification: AppNotification) {
    setMarkingId(notification.id);
    setActionError(null);
    const res = await markNotificationRead(notification.id);
    setMarkingId(null);
    if (!res.ok) {
      setActionError(res.error);
      return;
    }
    setInbox((current) =>
      current && {
        ...current,
        data: current.data.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      },
    );
    decrementUnread(1);
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    setActionError(null);
    const res = await markAllNotificationsRead();
    setMarkingAll(false);
    if (!res.ok) {
      setActionError(res.error);
      return;
    }
    setInbox((current) =>
      current && { ...current, data: current.data.map((n) => ({ ...n, isRead: true })) },
    );
    setUnread(0);
  }

  if (status === "loading") {
    return <p className="p-6 text-sm text-zinc-500">Cargando sesión...</p>;
  }

  if (!isMember) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">No tienes permiso para ver esta página.</p>
        <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">
          Volver al panel
        </Link>
      </div>
    );
  }

  const pages = totalPages(inbox?.total ?? 0, inbox?.pageSize);
  const buttonClass =
    "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 sm:p-6">
      <nav className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/dashboard" className="hover:text-zinc-800 dark:hover:text-zinc-200">
          Panel
        </Link>
        <span>/</span>
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Mis avisos</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mis avisos</h1>
          <p className="text-sm text-zinc-500">
            {unread === 1 ? "Tienes 1 aviso sin leer." : `Tienes ${unread} avisos sin leer.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={refresh} disabled={loading} className={buttonClass}>
            ⟳ Actualizar
          </button>
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingAll || unread === 0}
            className={buttonClass}
          >
            Marcar todos como leídos
          </button>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {actionError}
        </p>
      )}

      {error ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          <p>{error}</p>
          <button type="button" onClick={refresh} className={buttonClass}>
            Reintentar
          </button>
        </div>
      ) : loading && !inbox ? (
        <p className="text-sm text-zinc-500">Cargando avisos...</p>
      ) : (
        <NotificationList
          notifications={inbox?.data ?? []}
          markingId={markingId}
          onMarkRead={handleMarkRead}
        />
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1 || loading} className={buttonClass}>
            Anterior
          </button>
          <span>
            Página {page} de {pages}
          </span>
          <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= pages || loading} className={buttonClass}>
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
