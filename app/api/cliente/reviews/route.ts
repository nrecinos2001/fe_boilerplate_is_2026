import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

type PayloadResena = {
  orderId?: unknown;
  rating?: unknown;
  comment?: unknown;
};

export async function POST(request: Request) {
  const token = await getSession();
  if (!token) {
    return NextResponse.json({ message: "Inicia sesión como cliente" }, { status: 401 });
  }

  const api = process.env.API_URL?.replace(/\/+$/, "");
  if (!api) {
    return NextResponse.json({ message: "API_URL no está configurada" }, { status: 500 });
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json({ message: "La solicitud no contiene JSON válido" }, { status: 400 });
  }

  if (rawPayload === null || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return NextResponse.json({ message: "Revisa los datos de la reseña." }, { status: 400 });
  }
  const payload = rawPayload as PayloadResena;

  if (
    typeof payload.orderId !== "string" ||
    !payload.orderId ||
    typeof payload.rating !== "number" ||
    !Number.isInteger(payload.rating) ||
    payload.rating < 1 ||
    payload.rating > 5 ||
    (payload.comment !== undefined &&
      (typeof payload.comment !== "string" || payload.comment.length > 500))
  ) {
    return NextResponse.json({ message: "Revisa el pedido, la calificación y el comentario." }, { status: 400 });
  }

  const body = {
    orderId: payload.orderId,
    rating: payload.rating,
    ...(payload.comment !== undefined ? { comment: payload.comment } : {}),
  };

  try {
    const response = await fetch(`${api}/reviews`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const responseBody = await response.text();

    if (!responseBody) return new NextResponse(null, { status: response.status });

    try {
      return NextResponse.json(JSON.parse(responseBody), { status: response.status });
    } catch {
      return NextResponse.json(
        { message: response.ok ? "Respuesta inválida del servidor" : responseBody },
        { status: response.ok ? 502 : response.status },
      );
    }
  } catch {
    return NextResponse.json({ message: "No se pudo conectar al backend" }, { status: 502 });
  }
}
