import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api";

export async function forward<T>(
  call: () => Promise<T>,
  status = 200,
): Promise<NextResponse> {
  try {
    return NextResponse.json(await call(), { status });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }
    console.error("[api] Error inesperado:", error);
    return NextResponse.json(
      { message: "Error interno del servidor." },
      { status: 500 },
    );
  }
}

export function jsonBody(body: unknown): RequestInit {
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
