import {
  EMPTY_INBOX_MESSAGE,
  formatNotificationDate,
  sourceLabel,
  type AppNotification,
} from "@/src/types/notifications";

interface NotificationListProps {
  notifications: AppNotification[];
  /** Id del aviso que se está marcando, para deshabilitar su botón. */
  markingId?: number | null;
  onMarkRead?: (notification: AppNotification) => void;
}

/** Lista de avisos de la bandeja (H25), en el orden que manda el backend. */
export function NotificationList({ notifications, markingId = null, onMarkRead }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
        {EMPTY_INBOX_MESSAGE}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {notifications.map((n) => (
        <li
          key={n.id}
          data-read={n.isRead ? "true" : "false"}
          className={`rounded-xl border p-4 ${
            n.isRead
              ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              : "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {!n.isRead && <span className="sr-only">Sin leer: </span>}
                {n.title}
              </p>
              <p className="mt-1 break-words text-sm text-zinc-700 dark:text-zinc-300">{n.message}</p>
              <p className="mt-2 text-xs text-zinc-500">
                {formatNotificationDate(n.createdAt)} · {sourceLabel(n.source)}
              </p>
            </div>
            {!n.isRead && onMarkRead && (
              <button
                type="button"
                disabled={markingId === n.id}
                onClick={() => onMarkRead(n)}
                className="shrink-0 rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
              >
                Marcar como leído
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
