import { useAuthStore } from "@/src/stores/useAuthStore";
import type { ClientSession } from "@/src/types/auth";

export const REFRESH_ENDPOINT = "/api/auth/refresh";
const LOCK_NAME = "gymhub-auth-refresh";

// Promesa del refresh en curso. Todas las llamadas concurrentes reciben la
// misma, así que N solicitudes con 401 a la vez producen UN solo
// POST /auth/refresh.
//
// Esto no es solo una optimización: el backend rota el refresh token y, si
// recibe uno ya canjeado, lo trata como robado y revoca TODAS las sesiones del
// usuario. Dos refresh paralelos con la misma cookie cerrarían la sesión.
let inflight: Promise<ClientSession | null> | null = null;

/**
 * Renueva la sesión. Resuelve con la sesión nueva, o con null si el refresh
 * token ya no es válido (en ese caso el store queda "unauthenticated").
 * Rechaza solo ante errores de red o del servidor, sin tocar el store.
 */
export function refreshSession(): Promise<ClientSession | null> {
  if (!inflight) {
    inflight = withCrossTabLock(doRefresh).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

async function doRefresh(): Promise<ClientSession | null> {
  // Si mientras esperábamos llegó otro token (p. ej. un login), no lo pisamos.
  const tokenAtStart = useAuthStore.getState().accessToken;

  const res = await fetch(REFRESH_ENDPOINT, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (res.status === 401) {
    if (useAuthStore.getState().accessToken === tokenAtStart) {
      useAuthStore.getState().clearSession();
    }
    return null;
  }
  if (!res.ok) {
    throw new Error(`No se pudo renovar la sesión (HTTP ${res.status}).`);
  }

  const session = (await res.json()) as ClientSession;
  useAuthStore.getState().setSession(session);
  return session;
}

// Entre pestañas del mismo navegador la promesa compartida no alcanza (cada
// pestaña tiene su propia memoria), así que se serializan con la Web Locks API.
// Cuando una pestaña obtiene el lock, la cookie ya fue rotada por la anterior y
// el navegador envía la nueva: no hay reúso del token.
function withCrossTabLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks) return fn();
  return locks.request(LOCK_NAME, fn) as Promise<T>;
}
