import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const allowedGet = new Set([
  "orders/in-preparation",
]);

const allowedPatch = [
  /^orders\/[0-9a-f-]{36}\/status$/i,
  /^orders\/[0-9a-f-]{36}\/items\/[0-9a-f-]{36}\/status$/i,
];

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const endpoint = `kitchen/${path.join("/")}`;
  const method = request.method;
  const requestedPath = path.join("/");

  const isAllowed =
    (method === "GET" && allowedGet.has(requestedPath)) ||
    (method === "PATCH" &&
      allowedPatch.some((pattern) => pattern.test(requestedPath)));

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
        ...(method === "PATCH"
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(method === "PATCH"
        ? { body: await request.text() }
        : {}),
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
