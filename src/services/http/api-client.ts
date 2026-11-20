import { useAuthStore } from "@/src/stores/useAuthStore";
import { refreshSession } from "@/src/services/auth/refresh-session";

// Prefijo que next.config.ts reescribe hacia API_URL. Pasar por el mismo
// origen evita configurar CORS en el backend y no expone API_URL al cliente.
export const API_BASE = "/api/backend";

export class SessionExpiredError extends Error {
  constructor() {
    super("La sesión expiró. Inicia sesión de nuevo.");
    this.name = "SessionExpiredError";
  }
}

// Fuera de React no hay router; una navegación completa además descarta
// cualquier estado en memoria de la sesión vencida.
let onSessionExpired: () => void = () => {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  if (typeof window !== "undefined") window.location.assign("/login");
};

/** Permite cambiar qué pasa cuando la sesión ya no se puede renovar (tests). */
export function setOnSessionExpired(handler: () => void) {
  onSessionExpired = handler;
}

/**
 * fetch autenticado contra el backend.
 *
 * - Adjunta `Authorization: Bearer <accessToken>` desde el store.
 * - Ante un 401 renueva la sesión una sola vez (compartida entre todas las
 *   solicitudes concurrentes) y reintenta la solicitud original.
 * - Si el refresh token tampoco es válido, limpia la sesión, redirige a /login
 *   y lanza SessionExpiredError.
 *
 * Nota: el reintento reutiliza `init.body`; usa strings/FormData/JSON, no streams.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token = useAuthStore.getState().accessToken;
  if (!token) {
    // Primera carga: la sesión aún se está rehidratando.
    token = (await refreshSession())?.accessToken ?? null;
    if (!token) return expire();
  }

  const res = await send(path, init, token);
  if (res.status !== 401) return res;

  // Si otra solicitud ya renovó el token mientras esta viajaba, basta con
  // reintentar con el nuevo: no hace falta otro refresh.
  const current = useAuthStore.getState().accessToken;
  const newToken =
    current && current !== token ? current : (await refreshSession())?.accessToken;
  if (!newToken) return expire();

  return send(path, init, newToken);
}

/** Atajo para respuestas JSON. Lanza si la respuesta no es 2xx. */
export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, {
    ...init,
    headers: { Accept: "application/json", ...headersToObject(init.headers) },
  });
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} respondió ${res.status}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

function send(path: string, init: RequestInit, token: string): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_BASE}/${path.replace(/^\//, "")}`, {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
  });
}

function expire(): never {
  useAuthStore.getState().clearSession();
  onSessionExpired();
  throw new SessionExpiredError();
}

function headersToObject(headers: HeadersInit | undefined): Record<string, string> {
  return Object.fromEntries(new Headers(headers).entries());
}
