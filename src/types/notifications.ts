// H25 · Bandeja de avisos del miembro.

/** Módulo que originó el aviso (enum `NotificationSource` del backend). */
export const NOTIFICATION_SOURCES = [
  "MEMBERSHIPS",
  "CHECK_INS",
  "CLASSES",
  "TRAINERS",
  "PAYMENTS",
  "ROUTINES",
  "MACHINES",
  "REVIEWS",
  "REPORTS",
] as const;

export type NotificationSource = (typeof NOTIFICATION_SOURCES)[number];

export const SOURCE_LABELS: Record<NotificationSource, string> = {
  MEMBERSHIPS: "Membresías",
  CHECK_INS: "Asistencia",
  CLASSES: "Clases grupales",
  TRAINERS: "Entrenadores",
  PAYMENTS: "Pagos",
  ROUTINES: "Rutinas",
  MACHINES: "Máquinas",
  REVIEWS: "Reseñas",
  REPORTS: "Reportes",
};

/** Avisos por página; coincide con `INBOX_PAGE_SIZE` del backend. */
export const INBOX_PAGE_SIZE = 20;

/** Cada cuánto se consulta el contador de la campana. */
export const UNREAD_POLL_INTERVAL_MS = 30_000;

/** Tope que se muestra en la campana. */
export const BADGE_MAX = 99;

export const EMPTY_INBOX_MESSAGE = "No tienes avisos.";

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  source: NotificationSource;
  createdAt: string;
  isRead: boolean;
}

export interface NotificationPage {
  data: AppNotification[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UnreadCount {
  unread: number;
}

export type NotificationServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

/** Texto de la campana: vacío sin avisos y "99+" por encima del tope. */
export function formatBadge(unread: number): string {
  if (unread <= 0) return "";
  return unread > BADGE_MAX ? `${BADGE_MAX}+` : String(unread);
}

/** Etiqueta del módulo de origen; si llega uno desconocido se muestra tal cual. */
export function sourceLabel(source: string): string {
  return source in SOURCE_LABELS ? SOURCE_LABELS[source as NotificationSource] : source;
}

/** Fecha y hora local del aviso en formato dd/mm/aaaa hh:mm. */
export function formatNotificationDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Total de páginas de la bandeja; siempre al menos 1. */
export function totalPages(total: number, pageSize: number = INBOX_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
