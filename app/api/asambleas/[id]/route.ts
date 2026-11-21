import type { NextRequest } from "next/server";
import { apiFetch } from "@/lib/api";
import { forward, jsonBody } from "@/lib/api-route";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  return forward(() => apiFetch(`/asambleas/${encodeURIComponent(id)}`));
}

export async function PUT(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return forward(() =>
    apiFetch(`/asambleas/${encodeURIComponent(id)}`, {
      method: "PUT",
      ...jsonBody(body),
    }),
  );
}
