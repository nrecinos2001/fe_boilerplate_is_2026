import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

export async function GET() {
  try {
    const user = await apiFetch("/auth/me");
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Error interno." }, { status: 500 });
  }
}