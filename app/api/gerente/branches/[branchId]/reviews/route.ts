import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  context: { params: Promise<{ branchId: string }> },
) {
  const token = await getSession();
  if (!token) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  const { branchId } = await context.params;
  if (!UUID.test(branchId)) {
    return NextResponse.json({ message: "Identificador de sucursal inválido" }, { status: 400 });
  }

  const url = new URL(request.url);
  const page = url.searchParams.get("page") ?? "1";
  const limit = url.searchParams.get("limit") ?? "10";
  if (!/^\d+$/.test(page) || Number(page) < 1 || !/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 50) {
    return NextResponse.json({ message: "La página o el límite no son válidos" }, { status: 400 });
  }

  const api = process.env.API_URL?.replace(/\/+$/, "");
  if (!api) {
    return NextResponse.json({ message: "API_URL no está configurada" }, { status: 500 });
  }

  try {
    const response = await fetch(
      `${api}/branches/${encodeURIComponent(branchId)}/reviews?page=${page}&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
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
    return NextResponse.json({ message: "No se pudo conectar al backend" }, { status: 502 });
  }
}
