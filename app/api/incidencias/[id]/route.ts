// app/api/incidencias/[id]/route.ts
import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const report = await apiFetch(`/incidencias/${id}`);
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }
    console.error(`[api/incidencias/${"id"}] Error inesperado:`, error);
    return NextResponse.json(
      { message: "Error interno del servidor." },
      { status: 500 },
    );
  }
}