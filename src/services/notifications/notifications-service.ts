import { apiFetch } from "@/src/services/http/api-client";
import type {
  NotificationPage,
  NotificationServiceResult,
  UnreadCount,
} from "@/src/types/notifications";

export const LOAD_INBOX_ERROR = "No pudimos cargar tus avisos.";
export const LOAD_UNREAD_ERROR = "No pudimos consultar tus avisos sin leer.";
export const MARK_READ_ERROR = "No pudimos marcar el aviso como leído.";
export const MARK_ALL_READ_ERROR = "No pudimos marcar tus avisos como leídos.";

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join(" ");
    if (typeof data.message === "string") return data.message;
  } catch {
    // Sin cuerpo JSON: se usa el mensaje genérico.
  }
  return fallback;
}

async function failure(res: Response, fallback: string): Promise<{ ok: false; error: string; status: number }> {
  // En un 5xx el mensaje del servidor no le sirve al usuario.
  const error = res.status >= 500 ? fallback : await parseErrorMessage(res, fallback);
  return { ok: false, error, status: res.status };
}

async function getJson<T>(path: string, fallback: string): Promise<NotificationServiceResult<T>> {
  try {
    const res = await apiFetch(path);
    if (!res.ok) return failure(res, fallback);
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, error: fallback, status: 0 };
  }
}

/** PATCH sin cuerpo de respuesta (el backend responde 204). */
async function patchNoContent(path: string, fallback: string): Promise<NotificationServiceResult<null>> {
  try {
    const res = await apiFetch(path, { method: "PATCH" });
    if (!res.ok) return failure(res, fallback);
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: fallback, status: 0 };
  }
}

/** Una página de la bandeja, del aviso más reciente al más antiguo. */
export function fetchInbox(page: number): Promise<NotificationServiceResult<NotificationPage>> {
  return getJson<NotificationPage>(`notifications/me?page=${page}`, LOAD_INBOX_ERROR);
}

/** Cantidad de avisos sin leer para la campana. */
export async function fetchUnreadCount(): Promise<NotificationServiceResult<number>> {
  const res = await getJson<UnreadCount>("notifications/me/unread-count", LOAD_UNREAD_ERROR);
  return res.ok ? { ok: true, data: res.data.unread } : res;
}

/** Marca un aviso como leído. Un aviso de otra persona responde 404. */
export function markNotificationRead(id: number): Promise<NotificationServiceResult<null>> {
  return patchNoContent(`notifications/${id}/read`, MARK_READ_ERROR);
}

/** Marca como leídos todos los avisos del miembro. */
export function markAllNotificationsRead(): Promise<NotificationServiceResult<null>> {
  return patchNoContent("notifications/me/read-all", MARK_ALL_READ_ERROR);
}
