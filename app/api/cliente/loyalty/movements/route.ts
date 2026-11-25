import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const token = await getSession();

  if (!token) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  const api = process.env.API_URL?.replace(/\/+$/, "");
  if (!api) {
    return NextResponse.json(
      { message: "API_URL no está configurada" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(`${api}/loyalty/points/movements`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const body = await response.text();

    if (!body) return new NextResponse(null, { status: response.status });

    try {
      return NextResponse.json(JSON.parse(body), { status: response.status });
    } catch {
      return NextResponse.json(
        { message: response.ok ? "Respuesta inválida del servidor" : body },
        { status: response.ok ? 502 : response.status },
      );
    }
  } catch {
    return NextResponse.json(
      { message: "No se pudo conectar al servidor" },
      { status: 502 },
    );
  }
}
