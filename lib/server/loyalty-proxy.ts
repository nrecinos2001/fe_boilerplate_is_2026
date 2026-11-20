import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function proxyLoyaltyRequest(
  endpoint: "benefits" | "redemptions",
  method: "GET" | "POST",
  body?: string,
) {
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
    const response = await fetch(`${api}/loyalty/${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body } : {}),
      cache: "no-store",
    });
    const responseBody = await response.text();

    if (!responseBody) return new NextResponse(null, { status: response.status });

    try {
      return NextResponse.json(JSON.parse(responseBody), {
        status: response.status,
      });
    } catch {
      return NextResponse.json(
        {
          message: response.ok
            ? "Respuesta inválida del servidor"
            : responseBody,
        },
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
