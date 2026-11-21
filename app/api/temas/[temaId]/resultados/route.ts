import type { NextRequest } from "next/server";
import { apiFetch } from "@/lib/api";
import { forward } from "@/lib/api-route";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ temaId: string }> },
) {
  const { temaId } = await params;
  return forward(() => apiFetch(`/temas/${encodeURIComponent(temaId)}/resultados`));
}
