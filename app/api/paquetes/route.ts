import type { NextRequest } from "next/server";
import { apiFetch } from "@/lib/api";
import { forward, jsonBody } from "@/lib/api-route";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  return forward(() => apiFetch(`/paquetes${query ? `?${query}` : ""}`));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return forward(
    () => apiFetch("/paquetes", { method: "POST", ...jsonBody(body) }),
    201,
  );
}
