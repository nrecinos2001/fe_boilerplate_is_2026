import { NextResponse } from "next/server";
const API_URL = (process.env.API_URL || "").replace(/\/+$/, "");
export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  if (!API_URL) return NextResponse.json({ message: "API_URL no configurada" }, { status: 500 });
  const { filename } = await context.params;
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(filename)) return new NextResponse(null, { status: 404 });
  try {
    const response = await fetch(`${API_URL}/menu/images/${filename}`, { cache: "no-store" });
    if (!response.ok) return new NextResponse(null, { status: response.status });
    return new NextResponse(await response.arrayBuffer(), {
      headers: { "Content-Type": response.headers.get("content-type") || "application/octet-stream", "Cache-Control": "public, max-age=3600" },
    });
  } catch { return new NextResponse(null, { status: 502 }); }
}
