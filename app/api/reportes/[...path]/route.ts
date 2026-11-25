import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Rutas permitidas para los reportes del gerente.
const allowed = new Map<string, string[]>([
  ["branches", ["GET"]],
  ["branches/assigned-to-me", ["GET"]],
  ["reports/sales", ["GET"]],
  ["reports/top-dishes", ["GET"]],
  ["reports/branch-comparison", ["GET"]],
  ["reports/peak-hours", ["GET"]],
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  const esConsultaOcupacion =
    path.length === 3 &&
    path[0] === "branches" &&
    UUID.test(path[1]) &&
    path[2] === "occupancy" &&
    request.method === "GET";

  if (!allowed.get(endpoint)?.includes(request.method) && !esConsultaOcupacion) {
    return NextResponse.json({ message: "Ruta no permitida" }, { status: 404 });
  }

  const token = await getSession();
  if (!token) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  const api = process.env.API_URL?.replace(/\/$/, "");
  if (!api) {
    return NextResponse.json({ message: "API_URL no configurada" }, { status: 500 });
  }

  const search = new URL(request.url).search;
  try {
    const response = await fetch(`${api}/${endpoint}${search}`, {
      method: request.method,
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? {}, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "No se pudo conectar al servidor" },
      { status: 502 },
    );
  }
}

export { handle as GET };
