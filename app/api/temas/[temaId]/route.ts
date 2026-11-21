import type { NextRequest } from "next/server";
import { apiFetch } from "@/lib/api";
import { forward, jsonBody } from "@/lib/api-route";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ temaId: string }> },
) {
  const { temaId } = await params;
  const body = await request.json().catch(() => ({}));
  return forward(() =>
    apiFetch(`/temas/${encodeURIComponent(temaId)}`, {
      method: "PUT",
      ...jsonBody(body),
    }),
  );
}
