import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, context: RouteContext) {
  const token = await getSession();
  if (!token) {
    return NextResponse.json({ message: "Tu sesión ha expirado. Inicia sesión nuevamente." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ message: "El identificador de la reserva no es válido." }, { status: 400 });
  }

  const api = process.env.API_URL?.replace(/\/+$/, "");
  if (!api) return NextResponse.json({ message: "API_URL no está configurada." }, { status: 500 });

  try {
    const response = await fetch(`${api}/reservations/${id}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    const text = await response.text();
    if (!text) return new NextResponse(null, { status: response.status });
    try {
      return NextResponse.json(JSON.parse(text), { status: response.status });
    } catch {
      return NextResponse.json({ message: response.ok ? "Respuesta inválida del servidor." : text }, { status: response.ok ? 502 : response.status });
    }
  } catch {
    return NextResponse.json({ message: "No se pudo conectar con el backend de reservas." }, { status: 502 });
  }
}
