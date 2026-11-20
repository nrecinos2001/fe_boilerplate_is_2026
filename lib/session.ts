import { cookies } from "next/headers";

// La cookie de sesión guarda el REFRESH token (opaco, larga duración) en una
// cookie httpOnly: el JS del navegador no puede leerla. El access token vive
// solo en memoria (store de Zustand) y nunca se persiste en localStorage.
export const SESSION_COOKIE = "session";

const DEFAULT_REFRESH_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Debe coincidir con REFRESH_TOKEN_EXPIRES_IN_DAYS del backend.
function sessionDurationMs(): number {
  const days = Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS);
  return (Number.isFinite(days) && days > 0 ? days : DEFAULT_REFRESH_DAYS) * MS_PER_DAY;
}

export async function createSession(refreshToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + sessionDurationMs()),
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
