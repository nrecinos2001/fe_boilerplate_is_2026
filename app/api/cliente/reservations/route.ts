import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

async function proxy(path: string, method: "GET" | "PATCH" | "POST", body?: string) {
  const token = await getSession();
  if (!token) {
    return NextResponse.json(
      { message: "Tu sesión ha expirado. Inicia sesión nuevamente." },
      { status: 401 },
    );
  }

  const api = process.env.API_URL?.replace(/\/+$/, "");
  if (!api) {
    return NextResponse.json({ message: "API_URL no está configurada." }, { status: 500 });
  }

  try {
    const response = await fetch(`${api}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body } : {}),
      cache: "no-store",
    });
    const responseText = await response.text();
    if (!responseText) return new NextResponse(null, { status: response.status });

    try {
      return NextResponse.json(JSON.parse(responseText), { status: response.status });
    } catch {
      return NextResponse.json(
        { message: response.ok ? "El servidor devolvió una respuesta no válida." : responseText },
        { status: response.ok ? 502 : response.status },
      );
    }
  } catch {
    return NextResponse.json(
      { message: "No se pudo conectar con el backend de reservas." },
      { status: 502 },
    );
  }
}

/** H12: consultar únicamente las reservas del cliente autenticado. */
export async function GET() {
  return proxy("/reservations/me", "GET");
}

/** H10: crear reserva. Se conserva la ruta existente. */
export async function POST(request: Request) {
  let body: string;
  try {
    body = await request.text();
    JSON.parse(body);
  } catch {
    return NextResponse.json(
      { message: "El cuerpo de la solicitud no contiene un JSON válido." },
      { status: 400 },
    );
  }
  return proxy("/reservations", "POST", body);
}
