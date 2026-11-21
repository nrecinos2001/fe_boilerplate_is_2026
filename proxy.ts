import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { INICIO, esRolPermitido, puedeAcceder, type RolPermitido } from "@/lib/rutas";

type Sesion =
  | { estado: "valida"; role: RolPermitido }
  | { estado: "invalida" } // token vencido o rechazado por el backend
  | { estado: "rol-no-permitido" } // un rol que la aplicación no conoce
  | { estado: "sin-conexion" }; // no se pudo consultar: no se cierra la sesión por eso

// El JWT no trae el rol, así que se pide a /auth/me. El resultado se guarda un minuto por
// token para no consultar al backend en cada navegación y prefetch.
const CACHE_MS = 60_000;
const CACHE_MAX = 500;
const cache = new Map<string, { sesion: Sesion; hasta: number }>();

async function consultarSesion(token: string): Promise<Sesion> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) return { estado: "sin-conexion" };

  let res: Response;
  try {
    res = await fetch(new URL("auth/me", `${apiUrl.replace(/\/+$/, "")}/`), {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return { estado: "sin-conexion" };
  }

  if (res.status === 401 || res.status === 403) return { estado: "invalida" };
  if (!res.ok) return { estado: "sin-conexion" };

  const usuario: { role?: unknown } | null = await res.json().catch(() => null);
  return esRolPermitido(usuario?.role)
    ? { estado: "valida", role: usuario.role }
    : { estado: "rol-no-permitido" };
}

async function leerSesion(token: string): Promise<Sesion> {
  const guardada = cache.get(token);
  if (guardada && guardada.hasta > Date.now()) return guardada.sesion;

  const sesion = await consultarSesion(token);
  if (sesion.estado !== "sin-conexion") {
    cache.delete(token);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(token, { sesion, hasta: Date.now() + CACHE_MS });
  }
  return sesion;
}

function redirigir(request: NextRequest, destino: string) {
  return NextResponse.redirect(new URL(destino, request.nextUrl));
}

// Cookie inválida: se borra y se vuelve al login, con el motivo para mostrar un aviso.
function cerrarSesion(request: NextRequest, motivo: "vencida" | "rol") {
  const res =
    request.nextUrl.pathname === "/login"
      ? NextResponse.next()
      : redirigir(request, `/login?motivo=${motivo}`);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const enLogin = pathname === "/login";
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // Las Server Actions llegan como POST a la página. Una redirección aquí rompe la acción en el
  // cliente ("An unexpected response was received from the server"), p. ej. al cerrar sesión con
  // el token vencido. Pasan sin tocarse y cada acción valida la sesión: ante un 401 llama a
  // expireSession() (borra la cookie y va a /login), y logout la borra siempre. Tampoco se borra
  // la cookie aquí, porque pisaría la sesión nueva que crea la acción de login.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  if (!token) {
    return enLogin ? NextResponse.next() : redirigir(request, "/login");
  }

  const sesion = await leerSesion(token);

  switch (sesion.estado) {
    case "invalida":
      return cerrarSesion(request, "vencida");
    case "rol-no-permitido":
      return cerrarSesion(request, "rol");
    case "sin-conexion":
      // Sin backend no hay datos que proteger: las páginas muestran su error de conexión.
      return NextResponse.next();
    case "valida":
      if (enLogin || !puedeAcceder(pathname, sesion.role)) {
        return redirigir(request, INICIO);
      }
      return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
