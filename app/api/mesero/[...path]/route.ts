import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const allowed = new Map<string, string[]>([
  ["tables/my-branch", ["GET"]],
  ["my-branch", ["GET"]],
  ["orders/table/menu", ["GET"]],
  ["accounts", ["POST"]],
  ["customers/lookup", ["GET"]],
  ["payments", ["POST"]],
  ["receipts", ["GET"]],
  ["orders/table", ["POST"]],
]);

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  const method = request.method;
  const dynamicAllowed =
    (/^accounts\/[0-9a-f-]{36}$/i.test(endpoint) && method === "GET") ||
    (/^accounts\/[0-9a-f-]{36}\/orders$/i.test(endpoint) && method === "GET") ||
    (/^accounts\/[0-9a-f-]{36}\/close$/i.test(endpoint) && method === "POST") ||
    (/^receipts\/[0-9a-f-]{36}$/i.test(endpoint) && method === "GET") ||
    (/^orders\/[0-9a-f-]{36}(\/cancel)?$/i.test(endpoint) && method === "PATCH") ||
    (/^branches\/[0-9a-f-]{36}\/tables\/availability$/i.test(endpoint) && method === "GET");

  if (!allowed.get(endpoint)?.includes(method) && !dynamicAllowed) {
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

  try {
    const search = new URL(request.url).search;
    const response = await fetch(`${api}/${endpoint}${search}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(method === "POST" || method === "PATCH"
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(method === "POST" || method === "PATCH"
        ? { body: await request.text() }
        : {}),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "No se pudo conectar al servidor" },
      { status: 502 },
    );
  }
}

export { handle as GET, handle as POST, handle as PATCH };
