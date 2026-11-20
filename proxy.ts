import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const publicRoutes = ["/login"];
// Páginas abiertas a cualquier visitante, con o sin sesión.
const openRoutes = ["/", "/home"];

// Chequeo optimista: solo verifica que exista la cookie de sesión.
// Si el backend expone un token verificable (p. ej. JWT), validarlo aquí.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (openRoutes.includes(pathname)) return NextResponse.next();

  const isPublicRoute = publicRoutes.includes(pathname);
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!isPublicRoute && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  if (isPublicRoute && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
