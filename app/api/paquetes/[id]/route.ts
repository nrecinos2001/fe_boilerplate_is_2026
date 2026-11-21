import type { NextRequest } from "next/server";
import { apiFetch } from "@/lib/api";
import { forward } from "@/lib/api-route";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return forward(() => apiFetch(`/paquetes/${encodeURIComponent(id)}`));
}
