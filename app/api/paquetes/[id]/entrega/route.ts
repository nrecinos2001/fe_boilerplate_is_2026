import type { NextRequest } from "next/server";
import { apiFetch } from "@/lib/api";
import { forward, jsonBody } from "@/lib/api-route";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return forward(() =>
    apiFetch(`/paquetes/${encodeURIComponent(id)}/entrega`, {
      method: "PATCH",
      ...jsonBody(body),
    }),
  );
}
