import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function createSession(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // En producción la cookie solo viaja por HTTPS. COOKIE_SECURE=false la permite por HTTP
    // (despliegue sin TLS); si no, el navegador la descarta y no se puede iniciar sesión.
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_DURATION_MS),
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

// Borra la sesión y manda al login (p. ej. cuando la API responde 401).
export async function expireSession(): Promise<never> {
  await deleteSession();
  redirect("/login?motivo=vencida");
}
