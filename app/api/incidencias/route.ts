// app/api/incidencias/route.ts
import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";


export async function GET() {
  try {
    const reports = await apiFetch("/incidencias");
    return NextResponse.json(reports);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const report = await apiFetch("/incidencias", {
      method: "POST",
      body: formData,
    });
    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}


function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { message: error.message },
      { status: error.status },
    );
  }
  console.error("[api/incidencias] Error inesperado:", error);
  return NextResponse.json(
    { message: "Error interno del servidor." },
    { status: 500 },
  );
}