import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const token = await getSession();

  if (!token) {
    return NextResponse.json(
      { message: "Inicia sesión como cliente" },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  if (!UUID.test(id)) {
    return NextResponse.json(
      { message: "El identificador del pedido no es válido" },
      { status: 400 },
    );
  }

  const api = process.env.API_URL?.replace(/\/+$/, "");

  if (!api) {
    return NextResponse.json(
      { message: "API_URL no está configurada" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `${api}/orders/takeaway/${encodeURIComponent(id)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    const body = await response.text();

    if (!body) {
      return new NextResponse(null, {
        status: response.status,
      });
    }

    try {
      return NextResponse.json(JSON.parse(body), {
        status: response.status,
      });
    } catch {
      return NextResponse.json(
        {
          message: response.ok
            ? "Respuesta inválida del servidor"
            : body,
        },
        {
          status: response.ok ? 502 : response.status,
        },
      );
    }
  } catch {
    return NextResponse.json(
      { message: "No se pudo conectar al backend" },
      { status: 502 },
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  const token = await getSession();

  if (!token) {
    return NextResponse.json(
      { message: "Inicia sesión como cliente" },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  if (!UUID.test(id)) {
    return NextResponse.json(
      { message: "El identificador del pedido no es válido" },
      { status: 400 },
    );
  }

  const api = process.env.API_URL?.replace(/\/+$/, "");

  if (!api) {
    return NextResponse.json(
      { message: "API_URL no está configurada" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `${api}/orders/takeaway/${encodeURIComponent(id)}/pay`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: await request.text(),
        cache: "no-store",
      },
    );

    const body = await response.text();

    if (!body) {
      return new NextResponse(null, {
        status: response.status,
      });
    }

    try {
      return NextResponse.json(JSON.parse(body), {
        status: response.status,
      });
    } catch {
      return NextResponse.json(
        {
          message: response.ok
            ? "Respuesta inválida del servidor"
            : body,
        },
        {
          status: response.ok ? 502 : response.status,
        },
      );
    }
  } catch {
    return NextResponse.json(
      { message: "No se pudo conectar al backend" },
      { status: 502 },
    );
  }
}
