import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const allowedGet = new Set([
  "orders/ready-for-delivery",
]);

const allowedPatch = [
  /^kitchen\/orders\/[0-9a-f-]{36}\/delivery$/i,
];

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  const method = request.method;

  const isAllowed =
    (method === "GET" && allowedGet.has(endpoint)) ||
    (method === "PATCH" &&
      allowedPatch.some((pattern) => pattern.test(endpoint)));

  if (!isAllowed) {
    return NextResponse.json(
      { message: "Ruta no permitida" },
      { status: 404 },
    );
  }

  const token = await getSession();

  if (!token) {
    return NextResponse.json(
      { message: "No autenticado" },
      { status: 401 },
    );
  }

  const api = process.env.API_URL?.replace(/\/$/, "");

  if (!api) {
    return NextResponse.json(
      { message: "API_URL no configurada" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(`${api}/${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { message: "No se pudo conectar con NestJS" },
      { status: 502 },
    );
  }
}

export { handle as GET, handle as PATCH };
