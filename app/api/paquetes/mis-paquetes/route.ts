import type { NextRequest } from "next/server";
import { apiFetch } from "@/lib/api";
import { forward } from "@/lib/api-route";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  return forward(() =>
    apiFetch(`/paquetes/mis-paquetes${query ? `?${query}` : ""}`),
  );
}
